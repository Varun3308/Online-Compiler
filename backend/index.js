const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const generateFile = require("./generateFile");
const generateInputFile = require("./generateInputFile");
const executeCpp = require("./executeCpp");
const generateAiResponse = require("./generateAiResponse");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.post("/run", async (req, res) => {
    const { language = 'cpp', code, input } = req.body;
    if (!code || code.trim() === '') {
        return res.status(400).json({ error: "Empty code" });
    }

    try {
        const filepath = generateFile(language, code);
        const inputFilePath = generateInputFile(input);
        const output = await executeCpp(filepath, inputFilePath);

        res.json({ output });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, error: error.message });
    }

})

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

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});