const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// 增加请求体大小限制，以支持Base64图片数据
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

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        let model;
        let promptParts = [];

        // --- 核心逻辑：判断是否有图片 ---
        if (image) {
            console.log("Image received, switching to gemini-pro-vision model.");
            // 1. 如果有图片，使用多模态模型
            model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
            
            // 2. 准备图片数据部分
            const imagePart = {
                inlineData: {
                    mimeType: image.mimeType,
                    data: image.data
                }
            };

            // 3. 构造包含文字和图片的提示
            promptParts = [message, imagePart];

        } else {
            // 4. 如果没有图片，继续使用文本模型
            model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
            promptParts = [message];
        }

        // --- 流式返回 ---
        const result = await model.generateContentStream({
            contents: [{ role: "user", parts: promptParts }],
            generationConfig: {
                maxOutputTokens: 2048,
            },
        });
        
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // 直接从 result 获取流
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
