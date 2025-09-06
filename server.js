const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// --- 关键区域 ---
// 下面这三行代码的顺序很重要
app.use(express.json({ limit: '10mb' }));
app.use(cors());
// 确保这一行存在！它告诉 Express 去哪里找 CSS, JS 和 HTML 文件
app.use(express.static('public')); 
// ---------------

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/chat', async (req, res) => {
    try {
        const { history, message, image } = req.body;

        if (!message && !image) {
            return res.status(400).json({ error: 'Message or image is required' });
        }

        let model;
        let promptParts = [];

        const textPart = { text: message || "" };

        if (image) {
            console.log("Image received, using gemini-pro-vision model.");
            model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
            
            const imagePart = {
                inlineData: {
                    mimeType: image.mimeType,
                    data: image.data
                }
            };
            promptParts = [textPart, imagePart];

        } else {
            console.log("No image, using gemini-2.5-pro model.");
            model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
            promptParts = [textPart];
        }
        
        const result = await model.generateContentStream({
            contents: [{ role: "user", parts: promptParts }],
            generationConfig: { maxOutputTokens: 2048 },
        });
        
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
        }
        
        res.end();

    } catch (error) {
        console.error("Error in /chat endpoint:", error);
        res.status(500).end('Internal Server Error');
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
