const express = require("express");
const cors = require("cors");
const app = express();
const generateFile = require("./generateFile");
const executeCpp = require("./executeCpp");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.send("Hello World");
});

app.post("/run", async (req, res) => {
    const { language = 'cpp', code } = req.body;
    if (!code) {
        return res.status(400).json({ error: "Empty code" });
    }

    try {
        const filepath = generateFile(language, code);
        const output = await executeCpp(filepath);

        res.json({ filepath, output });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, error: error.message });
    }

})

app.listen(8000, () => {
    console.log("Server is running on port 8000");
});