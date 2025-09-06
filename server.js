const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use(express.static('public'));

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/chat', async (req, res) => {
    try {
        const { history, message, image } = req.body;

        if (!message && !image) { // 修正：必须有文字或图片
            return res.status(400).json({ error: 'Message or image is required' });
        }

        let model;
        let promptParts = [];

        // 将文字部分包装成对象
        // 即使 message 是空字符串，也包含 text part，这对某些多模态场景有帮助
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
            // 正确的格式：[text, image]
            promptParts = [textPart, imagePart];

        } else {
            console.log("No image, using gemini-1.0-pro model.");
            model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
            // 正确的格式：[text]
            promptParts = [textPart];
        }
        
        console.log("Sending parts to Gemini:", JSON.stringify(promptParts, null, 2));

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
});```

