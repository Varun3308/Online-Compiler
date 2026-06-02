const express = require("express");
const cors = require("cors");
const app = express();
const generateFile = require("./generateFile");
const generateInputFile = require("./generateInputFile");
const executeCpp = require("./executeCpp");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.post("/run", async (req, res) => {
    const { language = 'cpp', code , input } = req.body;
    if (!code) {
        return res.status(400).json({ error: "Empty code" });
    }

    try {
        const filepath = generateFile(language, code);
        const inputFilePath = generateInputFile(input);
        const output = await executeCpp(filepath, inputFilePath);

        res.json({output });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, error: error.message });
    }

})

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});