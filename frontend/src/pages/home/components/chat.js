import { useDispatch ,useSelector } from "react-redux";
import { createNewMessage, getAllMessages, summarizeText } from "../../../apiCalls/message";
import { hideLoader, showLoader } from "../../../redux/loaderSlice";
import toast from "react-hot-toast";
import { useEffect, useState, useRef } from "react";
import moment from "moment";
import { clearUnreadMessageCount } from "../../../apiCalls/chat";
import store from "../../../redux/store";
import { setAllChats } from "../../../redux/usersSlice";
import EmojiPicker from "emoji-picker-react";
import imageCompression from 'browser-image-compression';
import { sendImageMessage } from "../../../apiCalls/chat";
import {franc} from 'franc';
import langs from 'langs';

function ChatArea({ socket }) {
    const dispatch = useDispatch();
    const { selectedChat, user, allChats } = useSelector(state => state.userReducer);
    const selectedUser = selectedChat?.members?.find(u => u._id !== user._id);
    const [message, setMessage] = useState('');
    const [allMessages, setAllMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [data, setData] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef(null);
    const [summary, setSummary] = useState("");
    const [isSummarizing, setIsSummarizing] = useState(false);


    useEffect(() => {
        if (!('webkitSpeechRecognition' in window)) {
            toast.error("Voice-to-text not supported in this browser.");
        } else {
            const recognition = new window.webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-IN';

            recognition.onstart = () => setIsRecording(true);
            recognition.onend = () => {
                if (isRecording) {
                    recognition.start();
                } else {
                    setIsRecording(false);
                }
            };
            recognition.onerror = (e) => {
                console.error(e);
                if (e.error === "no-speech") {
                    toast.error("No speech detected. Try speaking again.");
                }
                setIsRecording(false);
            };

            recognition.onresult = (event) => {
                let interim = '';
                let final = '';
                for (let i = 0; i < event.results.length; ++i) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) final += transcript;
                    else interim += transcript;
                }
                const fullText = final || interim;
                setMessage(final || interim);

                try {
                    const langCode = franc(fullText);
                    const langData = langs.where("3", langCode);
                    if (langData) {
                        const iso6391 = langData['1'];
                        recognition.lang = iso6391 + '-IN';
                        console.log("Language switched to:", recognition.lang);
                    }
                } catch (err) {
                    console.log("Could not detect language:", err.message);
                }
            };

            recognitionRef.current = recognition;
        }
    }, []);

    const handleMicClick = () => {
        if (!recognitionRef.current) return;

        if (isRecording) {
            setIsRecording(false);
            recognitionRef.current.stop();
        } else {
            setIsRecording(true);
            recognitionRef.current.start();
        }
    };

    const sendMessage = async (image) => {
        try {
            const newMessage = {
                chatId: selectedChat._id,
                sender: user._id,
                text: message,
                image: image
            };

            socket.emit('send-message', {
                ...newMessage,
                members: selectedChat.members.map(m => m._id),
                read: false,
                createdAt: moment().format('YYYY-MM-DD hh:mm A')
            });

            const response = await createNewMessage(newMessage);

            if (response.success) {
                setMessage('');
                setShowEmojiPicker(false);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    const formatTime = (timestamp) => {
        const now = moment();
        const diff = now.diff(moment(timestamp), 'days');
        if (diff < 1) return `Today ${moment(timestamp).format('hh:mm A')}`;
        else if (diff === 1) return `Yesterday ${moment(timestamp).format('hh:mm A')}`;
        else return moment(timestamp).format('MMM DD, hh:mm A');
    };

    const getMessages = async () => {
        try {
            dispatch(showLoader());
            const response = await getAllMessages(selectedChat._id);
            dispatch(hideLoader());
            if (response.success) setAllMessages(response.data);
        } catch (error) {
            dispatch(hideLoader());
            toast.error(error.message);
        }
    };

    const clearUnreadMessages = async () => {
        try {
            socket.emit('clear-unread-messages', {
                chatId: selectedChat._id,
                members: selectedChat.members.map(m => m._id)
            });
            const response = await clearUnreadMessageCount(selectedChat._id);
            if (response.success) {
                allChats.map(chat => {
                    if (chat._id === selectedChat._id) {
                        return response.data;
                    }
                    return chat;
                });
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    function formatName(user) {
        let fname = user.firstname.at(0).toUpperCase() + user.firstname.slice(1).toLowerCase();
        let lname = user.lastname?.at(0).toUpperCase() + user.lastname.slice(1).toLowerCase();
        return fname + ' ' + lname;
    }

    const sendImage = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const options = {
            maxSizeMB: 0.2,
            maxWidthOrHeight: 600,
            useWebWorker: true,
            initialQuality: 0.7,
        };

        try {
            const compressedFile = await imageCompression(file, options);

            const formData = new FormData();
            formData.append("image", compressedFile);
            formData.append("chatId", selectedChat._id);
            formData.append("sender", user._id);

            const response = await sendImageMessage(formData);

            if (response.success) {
                socket.emit('send-message', {
                    ...response.data,
                    members: selectedChat.members.map(m => m._id),
                    createdAt: moment().format('YYYY-MM-DD hh:mm A')
                });
            } else {
                toast.error("Image message failed to send.");
            }
        } catch (error) {
            toast.error("Image compression failed!");
            console.error("Compression error:", error);
        }
    };

    useEffect(() => {
        getMessages();
        if (selectedChat?.lastMessage?.sender !== user._id) {
            clearUnreadMessages();
        }

        socket.off('receive-message').on('receive-message', (message) => {
            const selectedChat = store.getState().userReducer.selectedChat;
            if (selectedChat._id === message.chatId) {
                setAllMessages(prevmsg => [...prevmsg, message]);
            }
            if (selectedChat._id === message.chatId && message.sender !== user._id) {
                clearUnreadMessages();
            }
        });

        socket.on('message-count-cleared', data => {
            const selectedChat = store.getState().userReducer.selectedChat;
            const allChats = store.getState().userReducer.allChats;

            if (selectedChat._id === data.chatId) {
                const updatedChats = allChats.map(chat => {
                    if (chat._id === data.chatId) {
                        return { ...chat, unreadMessageCount: 0 };
                    }
                    return chat;
                });
                dispatch(setAllChats(updatedChats));

                setAllMessages(prevMsgs => {
                    return prevMsgs.map(msg => {
                        return { ...msg, read: true };
                    });
                });
            }
        });

        socket.on('started-typing', (data) => {
            setData(data);
            if (selectedChat._id === data.chatId && data.sender !== user._id) {
                setIsTyping(true);
                setTimeout(() => {
                    setIsTyping(false);
                }, 2000);
            }
        });
    }, [selectedChat]);

    useEffect(() => {
        const msgContainer = document.getElementById('main-chat-area');
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }, [allMessages, isTyping]);

    const speakText = (text) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 1;
            window.speechSynthesis.speak(utterance);
        } else {
            alert('Your browser does not support text-to-speech.');
        }
    };

    // Chat Summarization
    const handleSummarize = async () => {
        try {
            setIsSummarizing(true);
            const summaryText = await summarizeText(selectedChat._id);
            setSummary(summaryText);
            setIsSummarizing(false);
        } catch (error) {
            setIsSummarizing(false);
            toast.error("Something went wrong.");
            console.error(error.message);
        }
    };

    return <>
        {selectedChat && <div className="app-chat-area">
            <div className="app-chat-area-header">{formatName(selectedUser)}</div>
            {/* Chat Summarization */}
            <div style={{ padding: "10px" }}>
                <button onClick={handleSummarize}>
                    {isSummarizing ? "Summarizing..." : "Summarize Chat"}
                </button>
                {summary && (
                    <div>
                        <strong>Chat Summary:</strong>
                        <p>{summary}</p>
                    </div>
                )}
            </div>

            <div className="main-chat-area" id="main-chat-area">
                {allMessages.map(msg => {
                    const isSender = msg.sender === user._id;
                    return (
                        <div className={`message-container ${isSender ? 'sent' : 'received'}`} key={msg._id}>
                            <div>
                                <div className={isSender ? "send-message" : "received-message"}>
                                    {msg.translated && (
                                        <div><strong>{msg.translated}</strong></div>
                                    )}
                                    <div>
                                        <span>{msg.text}</span>
                                    </div>
                                    {msg.image && (
                                        <div>
                                            <img
                                                src={msg.image}
                                                alt="chat"
                                                style={{ maxWidth: "200px", borderRadius: "10px" }}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div
                                    className="message-timestamp-with-tts"
                                    style={isSender ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }}
                                >
                                    <span className="message-timestamp">
                                        {formatTime(msg.createdAt)}
                                        {isSender && msg.read && (
                                            <i className="fa fa-check-circle" style={{ color: '#007bff', marginLeft: '6px' }}></i>
                                        )}
                                    </span>
                                    {!isSender && msg.text && (
                                        <button
                                            className="tts-button"
                                            onClick={() => speakText(msg.text)}
                                            title="Listen to message"
                                        >
                                            <i className="fa fa-volume-up"></i>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                
                {/* Typing indicator */}
                <div className="typing-indicator">
                    {isTyping && selectedChat?.members.map(m => m._id).includes(data?.sender) && (
                        <i>Typing....</i>
                    )}
                </div>
            </div>

            {showEmojiPicker && <div className="emoji-picker-wrapper">
                <EmojiPicker onEmojiClick={(e) => setMessage(message + e.emoji)}></EmojiPicker>
            </div>}
            <div className="send-message-div">
                <input
                    type="text"
                    className="send-message-input"
                    placeholder="Type a message"
                    value={message}
                    onChange={(e) => {
                        setMessage(e.target.value)
                        socket.emit('user-typing', {
                            chatId: selectedChat._id,
                            members: selectedChat.members.map(m => m._id),
                            sender: user._id
                        });
                    }}>
                </input>
                <label htmlFor="file">
                    <i className="fa fa-picture-o send-image-btn"></i>
                    <input
                        type="file"
                        id="file"
                        style={{ display: 'none' }}
                        accept="image/jpg, image/png, image/jpeg, image/gif"
                        onChange={sendImage}>
                    </input>
                </label>

                <button className={`fa ${isRecording ? 'fa-microphone-slash' : 'fa-microphone'} send-mic-btn`} 
                        onClick={handleMicClick}>
                </button>

                <button
                    className="fa fa-smile-o send-emoji-btn"
                    onClick={() => { setShowEmojiPicker(!showEmojiPicker) }}>
                </button>
                <button
                    className="fa fa-paper-plane send-message-btn"
                    onClick={() => sendMessage('')}>
                </button>
            </div>
        </div>}
    </>
}

export default ChatArea;
