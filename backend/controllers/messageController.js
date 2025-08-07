const router = require('express').Router();
const authMiddleware = require("./../middlewares/authMiddleware");
const Chat = require("./../models/chat");
const Message = require("./../models/message");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const upload = require("../middlewares/uploadMiddleware");

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

module.exports = router;
