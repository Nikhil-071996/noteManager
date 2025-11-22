import api from "./apiClient";

export const registerUser = async (formData) => {
  const response = await api.post("/users/register", formData);
  return response.data;
};

export const loginUser = async (formData) => {
  const response = await api.post("/users/login", formData);
  console.log(response)
  return response.data;
};

