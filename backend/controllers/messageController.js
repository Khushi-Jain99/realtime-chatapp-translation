const router = require('express').Router();
const axios = require('axios');
const authMiddleware = require("./../middlewares/authMiddleware");
const Chat = require("./../models/chat");
const Message = require("./../models/message");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const upload = require("../middlewares/uploadMiddleware");
const { OpenAI } = require("openai");
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// -------------------- SEND TEXT MESSAGE -------------------- //
router.post('/new-message', authMiddleware, async (req, res) => {
    try {
        const newMessage = new Message(req.body);
        const savedMessage = await newMessage.save();

        await Chat.findOneAndUpdate(
            { _id: req.body.chatId },
            {
                lastMessage: savedMessage._id,
                $inc: { unreadMessageCount: 1 }
            }
        );

        res.status(201).send({
            message: 'Message sent successfully',
            success: true,
            data: savedMessage
        });
    } catch (error) {
        res.status(400).send({
            message: error.message,
            success: false
        });
    }
});

// -------------------- GET ALL MESSAGES -------------------- //
router.get('/get-all-messages/:chatId', authMiddleware, async (req, res) => {
    try {
        const allMessages = await Message.find({ chatId: req.params.chatId }).sort({ createdAt: 1 });

        res.send({
            message: 'Messages fetched successfully',
            success: true,
            data: allMessages
        });
    } catch (error) {
        res.status(400).send({
            message: error.message,
            success: false
        });
    }
});

// -------------------- SEND IMAGE MESSAGE -------------------- //
router.post('/send-image', authMiddleware, upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image file provided" });
        }

        // Upload to Cloudinary from memory buffer
        const streamUpload = () => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { resource_type: "image", folder: "chat-app" },
                    (error, result) => {
                        if (result) resolve(result);
                        else reject(error);
                    }
                );
                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
        };

        const result = await streamUpload();

        const newMessage = new Message({
            chatId: req.body.chatId,
            sender: req.body.sender,
            image: result.secure_url,
            read: false
        });

        const savedMessage = await newMessage.save();

        await Chat.findOneAndUpdate(
            { _id: req.body.chatId },
            {
                lastMessage: savedMessage._id,
                $inc: { unreadMessageCount: 1 }
            }
        );

        res.status(200).json({ success: true, data: savedMessage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Chat Summarization
router.post('/summarize', authMiddleware, async (req, res) => {
    try {
        const { chatId } = req.body;
        if (!chatId) {
            return res.status(400).json({ success: false, message: "chatId is required" });
        }

        const messages = await Message.find({ chatId }).sort({ createdAt: 1 });
        let combinedText = messages
            .map((msg) => msg.text?.trim())
            .filter((t) => t && typeof t === "string")
            .join(". "); 

        combinedText = combinedText.slice(0, 2000);
        if (!combinedText || combinedText.length < 20) {
            return res.status(400).json({ success: false, message: "Not enough content to summarize." });
        }

        const HF_API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn";
        const response = await axios.post(
            HF_API_URL,
            {
                inputs: combinedText,
                parameters: {
                    max_length: 30,
                    min_length: 15,
                    do_sample: false
                }
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.HF_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const summary = response.data?.[0]?.summary_text || "Couldn't summarize.";
        res.status(200).json({ success: true, data: { summary } });
    } catch (error) {
        console.error("Summarization Error:", error.response?.status, error.message);
        res.status(500).json({ success: false, message: "Summarization failed. Try again later." });
    }
});

module.exports = router;
