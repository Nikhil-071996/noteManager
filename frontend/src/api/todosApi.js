import api from "./apiClient";


export const getTodos = () => api.get("/todos");
export const createTodo = (data) => api.post("/todos", data);
export const updateTodo = (id, data) => api.put(`/todos/${id}`, data);
export const deleteTodo = (id) => api.delete(`/todos/${id}`);
export const shareTodo = (id, payload) => api.post(`/todos/${id}/share`, payload);
export const getSharedTodos = () => api.get("/todos/shared");
export const revokeShareApiTodos = (id, userId) => {
    api.delete(`/todos/${id}/${userId}/share`);
}
