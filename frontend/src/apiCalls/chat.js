import { axiosInstance } from './index';

export const getAllChats = async () => {
    try{
        const response = await axiosInstance.get('api/chat/get-all-chats', 
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    'Cache-Control': 'no-cache'
                },
            });
        return response.data;
    }catch(error){
        return error;
    }
}

export const createNewChat = async ( members ) => {
    try{
        const response = await axiosInstance.post('api/chat/create-new-chat', { members });
        return response.data;
    }catch(error){
        return error;
    }
}

export const clearUnreadMessageCount = async ( chatId ) => {
    try{
        const response = await axiosInstance.post('api/chat/clear-unread-message', { chatId: chatId });
        return response.data;
    }catch(error){
        return error;
    }
}

export const sendImageMessage = async (formData) => {
  try {
    const response = await axiosInstance.post('api/messages/send-image', formData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "multipart/form-data"
      }
    });
    return response.data;
  } catch (error) {
    return error;
  }
};
