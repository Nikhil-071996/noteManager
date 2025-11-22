import axios from "axios";
import { toast } from "react-toastify";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, 
  withCredentials: true, 
  headers: {
    "Content-Type": "application/json",
  },
});


api.interceptors.response.use(
  (response) => response,

  (err) => {
    const status = err?.response?.status;
    const requestUrl = err?.config?.url;

    if (status === 401 && requestUrl !== "/users/login") {
      localStorage.removeItem("user");
      toast.error("Session expired. Please login again.");
      window.location.href = "/login?sessionExpired=1";
    }

    return Promise.reject(err);
  }
);


export default api;