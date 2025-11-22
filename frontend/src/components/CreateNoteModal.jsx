import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { createNote } from "../api/notesApi";

export default function CreateNoteModal({ open, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const titleRef = useRef(null);

  // reset form when opened
  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      // focus title after mount/animation
      setTimeout(() => titleRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createNote({
        title: title.trim(),
        description: description.trim(),
      });
      toast.success("Note created");
      onCreated?.(); // refresh dashboard
      onClose();
    } catch (err) {
      toast.error("Failed to create note");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="edit-modal">
        <form onSubmit={handleCreate}>
          <input
            className="input"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            ref={titleRef}
          />
          <textarea
            className="input"
            placeholder="Note"
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <div className="btn-containers">
            <button type="button" className="btn link-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="btn" disabled={loading}>
              {loading ? "Saving..." : "Create Note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
