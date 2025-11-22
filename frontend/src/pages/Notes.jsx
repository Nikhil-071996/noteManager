import { useEffect, useState } from "react";
import { getNotes, createNote, deleteNote, } from "../api/notesApi";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

export default function Notes() {
  const [Notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { logout } = useAuth();

  const fetchNotes = async () => {
    try {
      const { data } = await getNotes();
      setNotes(data);
    } catch (err) {
      toast.error("Failed to fetch Notes");
      console.error(err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title) return toast.error("Enter a title for your todo");
    try {
      const { data } = await createNote({ title, description });
      setNotes((prev) => [...prev, data]);
      setTitle("");
      setDescription("");
      toast.success("Todo added!");
    } catch (err) {
      toast.error("Failed to add todo");
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((t) => t._id !== id));
      toast.success("Todo deleted!");
    } catch {
      toast.error("Failed to delete");
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  return (
    <div className="Notes-container">
      <h2>Your Notes 📝</h2>
        <button onClick={logout}>Logout</button>
      <form onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="Notes title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>

      <ul>
        {Notes.map((t) => (
          <li key={t._id}>
            <strong>{t.title}</strong> — {t.description}
            <button onClick={() => handleDelete(t._id)}>❌</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
