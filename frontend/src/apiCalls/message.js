import { axiosInstance } from './index';

export const createNewMessage = async ( message ) => {
    try{
        const response = await axiosInstance.post('api/messages/new-message', message);
        return response.data;
    }catch(error){
        return error;
    }
}

export const getAllMessages = async ( chatId ) => {
    try{
        const response = await axiosInstance.get(`api/messages/get-all-messages/${chatId}`);
        return response.data;
    }catch(error){
        return error;
    }
}