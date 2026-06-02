const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const { generateFile, generateInputFile } = require("./utils/generateFile");
const generateAiResponse = require("./controllers/generateAiResponse");
const DBConnection = require("./config/db");
const Job = require("./models/Job");
const { addJobToQueue } = require("./jobQueue");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.post("/run", async (req, res) => {
    const { language = 'cpp', code, input } = req.body;
    if (!code || code.trim() === '') {
        return res.status(400).json({ error: "Empty code" });
    }

    let job;
    try {
        // STEP 1: Create a Job in the database immediately
        job = await new Job({
            language,
            startedAt: new Date(),
        }).save();

        // STEP 2: Send the jobId back to the frontend immediately (Don't wait for execution!)
        const jobId = job._id;
        res.status(201).json({ success: true, jobId });

        // STEP 3: Generate files and add job to the Redis Queue
        const filepath = generateFile(language, code);
        let inputFilePath;
        if (input) {
            inputFilePath = generateInputFile(input);
        }
        
        job.filePath = filepath;
        job.inputFilePath = inputFilePath;
        await job.save();

        await addJobToQueue(jobId);
        // We are DONE here! The Worker will pick it up from the queue and run it.

    } catch (error) {
        console.log(error);
        if (job) {
            job.completedAt = new Date();
            job.status = "error";
            job.output = JSON.stringify(error.message || error);
            await job.save();
        }
    }
});

// STEP 5: The frontend will constantly call this route to ask "Is the job done yet?"
app.get("/status/:jobId", async (req, res) => {
    const jobId = req.params.jobId;
    if (!jobId) {
        return res.status(400).json({ success: false, error: "Missing jobId!" });
    }
    try {
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, error: "Job not found." });
        }
        return res.status(200).json({ success: true, job });
    } catch (error) {
        return res.status(500).json({ success: false, error: JSON.stringify(error) });
    }
});

app.post("/ai-review", async (req, res) => {
    const { code } = req.body;
    if (!code || code.trim() === '') {
        return res.status(400).json({ error: "Empty code" });
    }
    try {
        const aiResponse = await generateAiResponse(code);
        res.json({
            success: true,
            review: aiResponse
        })

    } catch (error) {
        console.error('Error executing code', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

const InitializeConnection = async () => {
    try {
        await DBConnection();
        const PORT = process.env.PORT || 8000;
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error("CRITICAL: Initialization failed. Server did not start.");
        console.error(error);
        process.exit(1);
    }
}

InitializeConnection();