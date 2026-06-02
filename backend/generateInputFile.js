const fs = require("fs");
const path = require("path");
const {v4 : uuid} = require("uuid");//mapping v4 as uuid , v4->like version


const dirCodes = path.join(__dirname , "inputs");

if(!fs.existsSync(dirCodes)){//checking the path's existence
    fs.mkdirSync(dirCodes, {recursive: true});//creating it if not exists
    //recursive: true tells Node.js to create all missing parent directories automatically.
}

const generateInputFile = (input) => {
    const jobId = uuid(); //calling uuid() function and returning a random string of characters
    const inputFileName = `${jobId}_input.txt`; //taking language name as extension
    const inputFilePath = path.join(dirCodes , inputFileName); //creating file path

    fs.writeFileSync(inputFilePath,input); //writing code in the created file
    return inputFilePath;
}

module.exports = generateInputFile;
    