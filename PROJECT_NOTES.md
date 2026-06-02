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
