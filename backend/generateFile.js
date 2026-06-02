const fs = require("fs");
const path = require("path");
const {v4 : uuid} = require("uuid");//mapping v4 as uuid , v4->like version


const dirCodes = path.join(__dirname , "codes");

if(!fs.existsSync(dirCodes)){//checking the path's existence
    fs.mkdirSync(dirCodes, {recursive: true});//creating it if not exists
    //recursive: true tells Node.js to create all missing parent directories automatically.
}

const generateFile = (language,code) => {
    const jobId = uuid(); //calling uuid() function and returning a random string of characters
    const fileName = `${jobId}.${language}`; //taking language name as extension
    const filePath = path.join(dirCodes , fileName); //creating file path

    fs.writeFileSync(filePath,code); //writing code in the created file
    return filePath;
}

module.exports = generateFile;
    