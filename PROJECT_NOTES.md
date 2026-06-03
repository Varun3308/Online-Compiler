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

## 4. Docker & Containerization Architecture (Upcoming)

**The Problem:**
Running this project locally requires a lot of manual setup. A developer has to manually install MongoDB, Redis, Node.js, Python, Java, and C/C++ compilers on their computer just to get the code to run. 

**The Solution:**
We use **Docker** to create isolated "mini-computers" (containers) that automatically have all the necessary tools installed. Instead of putting the entire backend into one giant container, we split it into smaller, specific containers to keep things clean, safe, and fast.

### How did we know we require them all?
In the professional engineering world, there is a "Golden Rule" for Docker: **One process per container.** 

Right now, your backend actually consists of **four** completely different moving parts:
1. The API Server (`index.js`)
2. The Background Worker (`jobWorker.js`)
3. The Redis Database
4. The MongoDB Database

If we jammed all four of these into **one single Dockerfile**, we would create a massive, bloated "Frankenstein" container. They would all fight for the same RAM. Even worse, if a user submits a terrible C++ virus that crashes the Worker, it would bring down your databases and your API server with it!

To follow the Golden Rule, we *must* separate them into 4 distinct containers. 

### Why only 3 files if there are 4 containers?
We don't need to write a `Dockerfile` for **Redis** or **MongoDB** because the companies that made them have already published official, perfect Dockerfiles on the internet (Docker Hub). We can just download them automatically! 

We *only* need to write custom Dockerfiles for the code that we wrote ourselves (The API and the Worker). 

### What each file does and how:

**1. `Dockerfile.api` (The API Recipe)**
- **What it does:** It creates a tiny container just for your web server.
- **How:** It tells Docker to install Node.js, copy `index.js`, and open port 8000. Notice it does *not* install Java, Python, or C++. Because it's so small, it starts up in milliseconds.

**2. `Dockerfile.worker` (The Heavy Lifter Recipe)**
- **What it does:** It creates a heavy, isolated container just for compiling code.
- **How:** It tells Docker to install Node.js, **AND** `gcc` (for C), `g++` (for C++), `python3` (for Python), and `openjdk` (for Java). It copies `jobWorker.js` and runs it. Because this container is totally isolated, if user-code crashes it, your API Server and Databases are 100% safe.

**3. `docker-compose.yml` (The Conductor)**
- **What it does:** It is the master script that starts all 4 containers simultaneously and connects them together.
- **How:** It is written in YAML. It basically says: *"Hey Docker! Download the official Redis and MongoDB containers from the internet. Then, build my `Dockerfile.api` and `Dockerfile.worker` containers. Finally, start all 4 of them at the exact same time and create a virtual network so the API can talk to the Databases!"*

**How they work together:**
When you click "Run", the Receptionist (index.js) puts a permanent copy of your code into the Filing Cabinet (MongoDB). Then, it puts a tiny, lightning-fast sticky note with your ID number onto the Conveyor Belt (Redis).

The Chef (jobWorker.js) grabs the sticky note off the fast Conveyor Belt, walks over to the Filing Cabinet to read the actual code, runs it, and then permanently writes the output back into the Filing Cabinet for the user to see!

### Why not use 1 giant container instead of 4 separate ones?

We split the architecture into 4 separate containers for three massive reasons: **Crash Protection**, **Scaling**, and **Updates**.

**1. Crash Protection (The "Blast Radius")**
Imagine a user submits a terrible C++ program with an infinite loop (`while(true) { }`). If everything was inside **one giant container**, that infinite loop would consume 100% of the container's CPU. Your API Server would freeze, your databases would crash, and the entire website would go offline for every single user. By putting the Worker in its own isolated container, the infinite loop *only* crashes the Worker container. Your API Server and Databases are in separate containers, so they keep running perfectly fine!

**2. Scaling (Adding more Workers)**
If your website gets famous, your API Server and Databases can easily handle 10,000 users. However, compiling code is very slow. Your single Worker container will get backed up. If everything was glued into one giant container, you would have to duplicate the entire app (creating extra API servers and databases you don't need) just to get more compiling power. Because they are separated, you can simply tell Docker: *"Leave the API and Databases alone, but spin up 10 extra copies of the Worker container."* Now you have 10 Workers pulling jobs simultaneously!

**3. Updates without Downtime**
If you want to update some UI code or add a new route to your API, you need to restart the server. If they were all in one giant container, restarting the API would mean forcefully shutting down your MongoDB and Redis databases, and killing any code that the Worker was currently compiling. Because they are in 4 separate containers, you can simply restart the **API Container**. The Worker keeps compiling code, and the Databases stay online without any interruption!
