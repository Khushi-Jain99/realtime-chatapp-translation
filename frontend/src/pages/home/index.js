import { useEffect, useState } from "react";
import ChatArea from "./components/chat";
import Header from "./components/header";
import Sidebar from "./components/sidebar";
import { useSelector } from "react-redux";
import {io} from "socket.io-client";
const socket = io('http://localhost:5000');

function Home(){
    const { selectedChat, user } = useSelector(state => state.userReducer);
    const [onlineUser, setOnlineUser] = useState([]);
    useEffect(() => {
        if (user) {
            socket.emit('join-room', user._id);
            socket.emit('user-login', user._id);
            socket.on('online-users', onlineusers => {
                setOnlineUser(onlineusers);
            });
            socket.on('online-users-updated', onlineusers => {
                setOnlineUser(onlineusers);
            });
        } 
    }, [user, onlineUser]);

    return (
        <div className="home-page">
            <Header socket={socket}></Header>
            <div className="main-content">
                <Sidebar socket={socket} onlineUser={onlineUser}></Sidebar>
                {selectedChat && <ChatArea socket={socket}></ChatArea>}
            </div>
        </div>
    );
}

export default Home;