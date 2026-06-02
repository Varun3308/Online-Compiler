# Project Notes & Architecture Decisions

This document keeps track of major architectural changes and features added to the project, so it's easy to remember how everything works when returning to the codebase.

## 1. Asynchronous Database-Driven Architecture (MongoDB)

**The Problem:** 
Previously, when a user clicked "Run", the backend server would freeze and wait for the C++ code to finish running before it replied to the frontend. If a program took 10 seconds to run or hit an infinite loop, the server would be stuck for 10 seconds. No one else could use the website during that time.

**The Solution:**
Instead of making the frontend wait, the server now saves the code as a "Job" in MongoDB, immediately returns a `jobId`, and runs the code in the background. The frontend then asks the server every second for the status until it gets the output.

### How it was implemented (Step-by-step)

1. **Installed `mongoose` and added MongoDB (`config/db.js`)**
   - **Why:** We needed a database to persist the Jobs. Without a database, the server would forget about the code the moment it started running it in the background, and the frontend couldn't query for it later.
2. **Created `models/Job.js`**
   - **Why:** This defines the template for the database records. We save the `language`, `code`, `status` (`pending`, `success`, `error`), and the final `output`.
3. **Changed the `POST /run` route (`backend/index.js`)**
   - **Why:** To prevent freezing. It now creates a Job, immediately sends the `jobId` to the frontend, and *then* executes the code in the background. Once done, it updates the Job in MongoDB with the output.
4. **Created the `GET /status/:jobId` route (`backend/index.js`)**
   - **Why:** Since `/run` no longer returns the output directly, the frontend needs a way to fetch it. This route takes a `jobId`, queries MongoDB, and returns the current status and output.
5. **Changed `handleRun` in `frontend/src/App.jsx`**
   - **Why:** Taught the frontend how to use this system via "Polling". It takes the `jobId`, and uses a loop (`setInterval`) to ask `/status/:jobId` every 1 second if the code is done, displaying a "Checking status..." message in the meantime.




## 2. Background Execution Queue (Redis & BullMQ)

**The Problem:** 
Even though MongoDB prevents the API server from freezing while waiting for a response, the main API Server (`index.js`) was still the one actually running the heavy C++ compiler. If 50 people submit code at the exact same time, trying to run 50 compilers simultaneously would completely crash the Node.js server's CPU.

**The Solution:**
Instead of the main API server doing the heavy lifting, we created a **Queue** (a waiting line) and a completely separate program called a **Worker**. 
Now, when a user submits code, the API Server just tosses their `jobId` into the Queue and immediately goes back to answering web requests. It never crashes. The Worker program quietly pulls jobs from the queue one by one and compiles the code safely in the background.

### How it was implemented (Step-by-step)

1. **Installed Redis and connected via `config/redis.js`**
   - **Why:** A Queue needs to be lightning-fast. Standard databases (like MongoDB) save to a hard drive, which is too slow. Redis lives entirely in your computer's RAM, making the waiting line instant.
2. **Created the Queue with BullMQ (`jobQueue.js`)**
   - **Why:** BullMQ is a library that manages the queue inside Redis. We updated `index.js` so that instead of running code, it just calls `addJobToQueue(jobId)`.
3. **Created the Worker Program (`jobWorker.js`)**
   - **Why:** This is a brand new, standalone Node.js file. It listens to the Redis queue, pulls a job out, fetches the code from MongoDB, runs the heavy C++ compiler, and saves the output back to MongoDB. By running this separately, it gets its own CPU resources and protects the main API server.
4. **Added `concurrently` to `package.json`**
   - **Why:** Since you now have two completely separate programs (the API Server AND the Worker), you normally have to open two terminal windows to run them. The `concurrently` package lets `npm run dev` start both of them at the exact same time automatically!


   

## 3. Multi-Language Support & Modular Architecture

**The Problem:**
Initially, the backend only supported C++ and the code for executing, generating files, and handling API routes were all floating in the main backend folder. This made it difficult to scale and add support for new languages like Python or Java.

**The Solution:**
We restructured the entire backend to follow an Enterprise-level Model-View-Controller (MVC) style layout and added full support for 5 different languages.

### How it was implemented

1. **Created `backend/controllers/`**
   - **Why:** To keep the code clean, we created a separate controller for every single language (`executeC.js`, `executeCpp.js`, `executePy.js`, `executeJava.js`, `executeJs.js`). We also updated them to use `child_process.spawn()` instead of `exec()`. `spawn` handles streaming data, meaning it will never crash if the user's code produces a massive amount of output.
2. **Created `backend/utils/generateFile.js`**
   - **Why:** We combined the logic for creating code files and input files into one utility. We also added advanced Regex logic for **Java**. Since Java requires the physical filename to match the `public class` name, our utility automatically modifies the user's Java code to append the unique `jobId` to the class name, ensuring successful compilation.
3. **Updated the Worker (`jobWorker.js`)**
   - **Why:** We added a `switch` statement to the Worker. Now, when it pulls a job from the queue, it checks `job.language` and dynamically calls the correct controller.
4. **Added Language Dropdown to Frontend (`App.jsx`)**
   - **Why:** We updated the UI to let the user select their language. We also mapped a dictionary of `defaultCodes` so that when a user switches languages, the code editor instantly populates with a working "Hello World" boilerplate for that specific language!
