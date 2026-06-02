// User submits code
//       ↓
// Create Job in MongoDB
//       ↓
// Add Job ID to BullMQ Queue
//       ↓
// Redis stores waiting job
//       ↓
// THIS WORKER picks the job
//       ↓
// Compile & Execute Code
//       ↓
// Update MongoDB status/output
//       ↓
// Delete temporary files

const connection = require("./config/redis");// Redis stores the queue so API servers and workers can access the same jobs.
const { Worker } = require("bullmq");
const mongoose = require("mongoose");
require("dotenv").config();
const executeCpp = require("./controllers/executeCpp");
const executeC = require("./controllers/executeC");
const executePy = require("./controllers/executePy");
const executeJava = require("./controllers/executeJava");
const executeJs = require("./controllers/executeJs");
const Job = require("./models/Job");
const fs = require("fs");
const path = require("path");

const outputPath = path.join(process.cwd(), "temp", "outputs");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Worker connected to MongoDB");
  } catch (err) {
    console.error("Worker could not connect to MongoDB...", err);
    process.exit(1);
  }
};

connectDB();

const jobQueueName = "job-queue";
const NUM_WORKERS = 5;

const safeUnlink = async (p) => {
  if (!p) return;
  try {
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
    }
  } catch (err) {
    console.error("Failed to delete file:", p, err);
  }
};

const worker = new Worker(jobQueueName, async (job) => {
    const { id: jobId } = job.data;
    const jobFind = await Job.findById(jobId);
    if (!jobFind) {
      console.log("Job not found!");
      return;
    }

    let outputFilePath;
    if (jobFind.language === "java") {
      const className = path.basename(jobFind.filePath).replace(".java", "");
      outputFilePath = path.join(outputPath, `${className}.class`);
    } else if (jobFind.language === "c" || jobFind.language === "cpp") {
      outputFilePath = path.join(outputPath, `${jobId}.out`);
    }

    console.log("Processing job with ID:", jobId);

    try {
      let output;

      switch (jobFind.language) {
        case "cpp":
          output = await executeCpp(jobFind.filePath, jobFind.inputFilePath);
          break;
        case "c":
          output = await executeC(jobFind.filePath, jobFind.inputFilePath);
          break;
        case "py":
          output = await executePy(jobFind.filePath, jobFind.inputFilePath);
          break;
        case "java":
          output = await executeJava(jobFind.filePath, jobFind.inputFilePath);
          break;
        case "js":
          output = await executeJs(jobFind.filePath, jobFind.inputFilePath);
          break;
        default:
          throw new Error(`Unsupported language: ${jobFind.language}`);
      }

      jobFind.completedAt = new Date();
      jobFind.status = "success";
      jobFind.output = output;
      await jobFind.save();
      console.log("Job completed successfully:", jobId);
    } catch (error) {
      jobFind.completedAt = new Date();
      jobFind.status = "error";
      jobFind.output = JSON.stringify(error.message || error);
      await jobFind.save();
      console.error("Job failed:", jobId, error);
      throw error;
    } finally {
      // Clean up files
      if (jobFind.filePath) safeUnlink(jobFind.filePath);
      if (jobFind.inputFilePath) safeUnlink(jobFind.inputFilePath);
      if (outputFilePath) safeUnlink(outputFilePath);
    }
  },
  {
    connection,
    concurrency: NUM_WORKERS,//connection to redis queue and at time worker can process 5 jobs at time no more to prevent server crash
  }
);

worker.on("failed", (job, error) => {
  console.error(`Job ID ${job.id} failed with reason:`, error.message);
});

console.log(`Worker started with concurrency ${NUM_WORKERS} and listening for jobs...`);
