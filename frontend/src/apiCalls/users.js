import { axiosInstance } from "./index";
import axios from "axios";

export const getLoggedUser = async () => {
  try {
    const response = await axiosInstance.get('api/user/get-logged-user', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        'Cache-Control': 'no-cache'
      },
    });
    return response.data;
  } catch (error) {
    return error;
  }
};

export const getAllUsers = async () => {
    try{
        const response = await axiosInstance.get('api/user/get-all-users', {
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

export const uploadProfilePic = async (image, userId) => {
  try {
    const response = await axiosInstance.post(
      'api/user/upload-profile-pic',
      { image, userId }
    );
    return response.data;
  } catch (error) {
    return error;
  }
};
