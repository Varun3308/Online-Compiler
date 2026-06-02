const { spawn } = require("child_process");
const fs = require("fs");

const executePy = (filePath, inputFilePath) => {
  return new Promise((resolve, reject) => {
    try {
      const run = spawn("python3", [filePath], {
        shell: false,
      });

      let stdout = "";
      let stderr = "";
      if (inputFilePath) {
        try {
          const inputStream = fs.createReadStream(inputFilePath);
          inputStream.pipe(run.stdin);
        } catch (err) {
          return reject({ error: "Input file error", stderr: err });
        }
      }

      run.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      run.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      run.on("error", (err) => {
        return reject({ error: "Python spawn error", stderr: err });
      });

      run.on("close", (code) => {
        if (code !== 0) {
          return reject({ error: "Runtime error", stderr });
        }
        resolve(stdout);
      });
    } catch (syncErr) {
      reject({ error: "Unexpected error", stderr: syncErr });
    }
  });
};

module.exports = executePy;
