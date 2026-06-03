const { Redis } = require("ioredis");

const connection = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: 6379,
  // Recommended by BullMQ to prevent worker failures during Redis reconnects.
  maxRetriesPerRequest: null,
});

connection.on('error', (err) => {
    console.error('Redis connection error:', err);
});

module.exports = connection;
