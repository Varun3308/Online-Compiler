const fs = require("fs");
const path = require("path");
const  {exec} = require("child_process");

const outputPath = path.join(__dirname,"outputs");

if(!fs.existsSync(outputPath)){
    fs.mkdirSync(outputPath,{recursive: true});
}

const executeCpp = async(filePath)=>{

    const jobId = path.basename(filePath).split(".")[0];//picks last unique_string.cpp form wwhole path
    const outputFileName = `${jobId}.out`;
    const outPath = path.join(outputPath,outputFileName);
    //promise as executecpp is awaiting so returns a promise 
    return new Promise((resolve,reject)=>{
        exec(`g++ ${filePath} -o ${outPath} && cd ${outputPath} && ./${outputFileName}`,(error,stdout,stderr)=>{//run g++ filename.cpp and store in outpath
                if(error){//Command failed/exited with error status when file not exists
                    reject({error,stderr});
                }
                if(stderr){//Error messages from the compiler or program
                    reject(stderr);
                }
                resolve(stdout);//Output from the program
            }
        )
    })
    
}

module.exports = executeCpp;