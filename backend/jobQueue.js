// User submits code
//         ↓
// Create Job in MongoDB
//         ↓
// Add Job ID to BullMQ Queue
//         ↓
// Redis stores job
//         ↓
// Worker picks job
//         ↓
// Compile & Execute Code
//         ↓
// Update Job status/output

// Redis connection used by BullMQ

// BullMQ = Manager
// Redis  = Storage
const connection = require("./config/redis");

const { Queue } = require("bullmq");

// Queue where code execution jobs are stored
const jobQueueName = "job-queue";

// Create BullMQ queue
const jobQueue = new Queue(jobQueueName, { connection });

// Add a code execution job to the queue
const addJobToQueue = async (
  jobId,
  options = { timeout: 60000 } // Job metadata: max execution time = 60s
) => {
  try {
    // Store job in Redis queue.
    // A Worker process will pick it up later and execute it.
    await jobQueue.add("execute-code", { id: jobId }, options);

    console.log(`Job ${jobId} added to queue`);
  } catch (error) {
    console.error(`Failed to add job ${jobId}:`, error);
  }
};

module.exports = {
  jobQueueName,
  jobQueue,
  addJobToQueue,
};
