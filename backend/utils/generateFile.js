const fs = require("fs");
const path = require("path");

const dirTemp = path.join(process.cwd(), "temp");

const dirCodes = path.join(dirTemp, "codes");
const dirInputs = path.join(dirTemp, "inputs");
const dirOutputs = path.join(dirTemp, "outputs");

if (!fs.existsSync(dirCodes)) {
  fs.mkdirSync(dirCodes, { recursive: true });
}
if (!fs.existsSync(dirInputs)) {
  fs.mkdirSync(dirInputs, { recursive: true });
}
if (!fs.existsSync(dirOutputs)) {
  fs.mkdirSync(dirOutputs, { recursive: true });
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const generateFile = (format, content, jobId) => {
  let filename;
  let fileContent = content;

  if (format === "java") {
    const classNameRegex = /public\s+class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/;
    const match = content.match(classNameRegex);

    let originalClassName = "Main";
    if (match && match[1]) {
      originalClassName = match[1];
    }

    const newClassName = `${originalClassName}_${jobId}`;
    filename = `${newClassName}.${format}`;

    const updatedContent = content.replace(
      new RegExp(
        `(public\\s+class\\s+)${escapeRegExp(originalClassName)}`,
        "g"
      ),
      `$1${newClassName}`
    );
    fileContent = updatedContent;
  } else {
    filename = `${jobId}.${format}`;
  }

  const filePath = path.join(dirCodes, filename);
  fs.writeFileSync(filePath, fileContent);
  return filePath;
};

const generateInputFile = (input, jobId) => {
  const filename = `${jobId}.txt`;
  const filePath = path.join(dirInputs, filename);
  fs.writeFileSync(filePath, input);
  return filePath;
};

module.exports = { generateFile, generateInputFile };
