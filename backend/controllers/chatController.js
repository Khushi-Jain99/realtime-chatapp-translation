const router = require('express').Router();
const Chat = require('./../models/chat');
const authMiddleware = require('../middlewares/authMiddleware');
const Message = require('../models/message');

// Create Chats
router.post('/create-new-chat', authMiddleware, async (req, res)=>{
    try {
        const chat = new Chat(req.body);
        const savedChat = await chat.save();
        await savedChat.populate('members');

        res.status(201).send({
            message: "Chat created successfully",
            success: true,
            data: savedChat
        });
    } catch (error) {
        res.status(400).send({
            message: error.message,
            success: false
        })
    }
})

// Get Chats
router.get('/get-all-chats', authMiddleware, async (req, res)=>{
    try {
        const allChats = await Chat.find({members: {$in: req.userId}}).populate('members').populate('lastMessage').sort({updatedAt: -1});
        res.status(200).send({
            message: "Chat fetched successfully",
            success: true,
            data: allChats
        });
    } catch (error) {
        res.status(400).send({
            message: error.message,
            success: false
        })
    }
});

// Clear Unread Messages
router.post('/clear-unread-message', authMiddleware, async (req, res)=>{
    try {
        const chatId  = req.body.chatId;
        const chat = await Chat.findById(chatId);
        if(!chat){
            return res.send({
                message: "Chat not found",
                success: false
            });
        }
        const updatedChat = await Chat.findByIdAndUpdate(
            chatId,
            {unreadMessageCount: 0},
            {new: true}
        ).populate('members').populate('lastMessage');


        await Message.updateMany(
            {chatId: chatId, read: false},
            {read: true}
        );
        res.send({
            message: "Unread messages cleared",
            success: true,
            data: updatedChat
        });

    } catch (error) {
        res.send({
            message: error.message,
            success: false
        });
    }
});

module.exports = router;