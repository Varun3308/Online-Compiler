const dotenv = require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });


const aiResponse = async (code) => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are a programming tutor. Explain the following code in simple language. Mention:
                1. What the code does
                2. How it works step by step
                3. Time complexity
                4. Space complexity
                5. Any possible improvements

                Code:
                ${code}`
        });
        return response.text;
    } catch (err) {
        console.error("AI Chat Error:", err);
        throw err;
    }


};

module.exports = aiResponse;
