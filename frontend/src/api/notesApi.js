import api from "./apiClient";


export const getNotes = () => api.get("/notes");
export const createNote = (data) => api.post("/notes", data);
export const updateNote = (id, data) => api.put(`/notes/${id}`, data);
export const deleteNote = (id) => api.delete(`/notes/${id}`);
export const shareNote = (id, payload) => api.post(`/notes/${id}/share`, payload);
export const getSharedNotes = () => api.get("/notes/shared");
export const updateSharedAccess = (id, sharedId, body, type = "note") =>
  api.put(`/${type}s/${id}/shared/${sharedId}`, body);



export const getSuggestedUsersList = () => api.get("/shared-contacts");
export const revokeShareApiNotes = (id, userId) => {
    api.delete(`/notes/${id}/${userId}/share`);
}


// -------- Link sharing endpoints (new) --------
// Create a share-link (owner only). body: { access, expiresInDays }
export const createShareLink = (id, body = {}, type = "note") =>
  api.post(`/${type}s/${id}/share-link`, body);

// Revoke share-link (owner only)
export const revokeShareLink = (id, type = "note") =>
  api.delete(`/${type}s/${id}/share-link`);

// Optional: fetch a note by token (public endpoint) if you need to preview link
export const getNoteByShareToken = (token) =>
  api.get(`/notes/shared/link/${token}`);