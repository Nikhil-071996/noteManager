import { useEffect, useRef, useState } from "react";
import { updateNote } from "../api/notesApi";
import { toast } from "react-toastify";
import { socket } from "../api/socket";

export default function EditNoteModal({ item, user, onClose, onUpdated,viewOnly  }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const titleRef = useRef();

  useEffect(() => {
    if (item) {
      setTitle(item.title || "");
      setDescription(item.description || "");
    }
  }, [item]);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      await updateNote(item._id, {
        title: title.trim(),
        description: description.trim(),
      });
      toast.success("Note updated");
      onUpdated();
      onClose();
    } catch {
      toast.error("Update failed");
    }
  };

//   useEffect(() => {
//         if (item?._id) {
//             socket.emit("join_note", item._id);
//         }

//         return () => {
//             socket.emit("leave_note", item?._id);
//         };
//     }, [item]);


  if (!item) return null;

  return (
    <div className="modal-overlay" onClick={(e)=> e.target===e.currentTarget && onClose()}>
        {viewOnly && (
            <p style={{ color: "#fff", fontSize: 14 }}>You have view-only access.</p>
        )}

      <div className="edit-modal">
        <form >
          <input
            ref={titleRef}
            className="input"
            placeholder="Title"
            value={title}
            onChange={(e)=>setTitle(e.target.value)}
            required
            disabled={viewOnly}
          />

          <textarea
            className="input"
            rows={6}
            value={description}
            onChange={(e)=>setDescription(e.target.value)}
            required
            disabled={viewOnly}
          />

          <div className="btn-containers">
            <button type="button" className="btn link-btn" onClick={onClose}>
              Cancel
            </button>

            {!viewOnly && (
                <button className="btn" onClick={handleSave}>
                    Save
                </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
