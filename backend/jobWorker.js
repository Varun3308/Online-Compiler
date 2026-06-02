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
const executeCpp = require("./executeCpp");
const Job = require("./models/Job");
const fs = require("fs");
const path = require("path");

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

    console.log("Processing job with ID:", jobId);

    try {
      let output;

      if (jobFind.language === "cpp") {
        output = await executeCpp(jobFind.filePath, jobFind.inputFilePath);
      } else {
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
      
      const outPath = path.join(__dirname, `outputs/${jobId}.out`);
      const exePath = path.join(__dirname, `outputs/${jobId}.exe`);
      safeUnlink(outPath);
      safeUnlink(exePath);
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
