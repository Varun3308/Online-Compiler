const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const dirTemp = path.join(process.cwd(), "temp");
const dirOutputs = path.join(dirTemp, "outputs");

const executeJava = (filePath, inputFilePath) => {
  return new Promise((resolve, reject) => {
    try {
      const fileName = path.basename(filePath);
      const className = fileName.replace(".java", "");

      const compile = spawn("javac", [filePath, "-d", dirOutputs], {
        shell: false,
      });

      let compileError = "";

      compile.stderr.on("data", (data) => {
        compileError += data.toString();
      });

      compile.on("error", (err) => {
        return reject({ error: "Java compilation spawn error", stderr: err });
      });

      compile.on("close", (code) => {
        if (code !== 0) {
          return reject({
            error: "Java compilation failed",
            stderr: compileError,
          });
        }

        const run = spawn("java", ["-cp", dirOutputs, className], {
          cwd: dirOutputs,
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
          return reject({ error: "Java runtime spawn error", stderr: err });
        });

        run.on("close", (code) => {
          if (code !== 0) {
            return reject({ error: "Java runtime error", stderr });
          }

          resolve(stdout);
        });
      });
    } catch (syncErr) {
      reject({ error: "Unexpected Java error", stderr: syncErr });
    }
  });
};

module.exports = executeJava;
