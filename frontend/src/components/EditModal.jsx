import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { updateNote } from "../api/notesApi";
import { updateTodo } from "../api/todosApi";
import { socket } from "../api/socket";

export default function EditModal({ open, onClose, item, onUpdated, user }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState([{ text: "" }]);
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState("");

  const titleRef = useRef(null);
  const itemRefs = useRef([]);

  // Load item data
  useEffect(() => {
    if (item) {
      setTitle(item.title || "");
      if (item.type === "note") {
        setDescription(item.description || "");
      } else {
        setItems(item.items?.length ? item.items : [{ text: "" }]);
      }
    }
  }, [item]);

  // Focus title when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 0);
    }
  }, [open]);

  // SOCKET HANDLING — REGISTER ONLY WHEN MODAL OPENS
  useEffect(() => {
    if (!open || !item) return;

    const roomId = item._id;

    socket.emit("join_room", { roomId });

    const handleEditUpdate = (data) => {
      if (data.roomId === roomId) {
        setTitle(data.title);
        if (item.type === "note") setDescription(data.description);
      }
    };

    const handleTyping = ({ userName }) => {
      setTyping(`${userName} is typing...`);
    };

    const handleStopTyping = () => setTyping("");

    socket.on("note_edit_update", handleEditUpdate);
    socket.on("user_typing", handleTyping);
    socket.on("user_stop_typing", handleStopTyping);

    return () => {
      socket.emit("leave_room", { roomId });
      socket.off("note_edit_update", handleEditUpdate);
      socket.off("user_typing", handleTyping);
      socket.off("user_stop_typing", handleStopTyping);
    };
  }, [open, item]);

  const emitTyping = () => {
    socket.emit("typing", { roomId: item._id, userName: user.name });
    setTimeout(() => {
      socket.emit("stop_typing", { roomId: item._id, userName: user.name });
    }, 800);
  };

  const emitEdit = (newTitle, newDescription) => {
    socket.emit("note_edit", {
      roomId: item._id,
      title: newTitle,
      description: newDescription,
    });
  };

  // Update todo item text
  const updateItem = (i, value) => {
    setItems((prev) =>
      prev.map((it, idx) => (idx === i ? { text: value } : it))
    );
  };

  // Add todo item + focus new item
  const addItem = () => {
    setItems((prev) => {
      const next = [...prev, { text: "" }];

      queueMicrotask(() => {
        const idx = next.length - 1;
        itemRefs.current[idx]?.focus();
      });

      return next;
    });
  };

  // Remove todo item + maintain focus correctly
  const removeItem = (i) => {
    setItems((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      itemRefs.current.splice(i, 1);

      queueMicrotask(() => {
        const focusIdx = Math.min(i, next.length - 1);
        if (focusIdx >= 0) itemRefs.current[focusIdx]?.focus();
        else titleRef.current?.focus();
      });

      return next;
    });
  };

  // Save item
  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (item.type === "note") {
        await updateNote(item._id, {
          title: title.trim(),
          description: description.trim(),
        });
      } else {
        await updateTodo(item._id, {
          title: title.trim(),
          items: items
            .map((i) => ({ text: i.text.trim() }))
            .filter((i) => i.text.length > 0),
        });
      }

      toast.success(`${item.type === "note" ? "Note" : "Todo"} updated!`);
      onUpdated();
      onClose();
    } catch {
      toast.error("Failed to update");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="edit-modal">
        <p style={{ fontSize: 12, color: "#888" }}>{typing}</p>

        <form onSubmit={handleSave}>
          <input
            className="input"
            placeholder="Title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              emitTyping();
              emitEdit(e.target.value, description);
            }}
            ref={titleRef}
            required
          />

          {item.type === "note" ? (
            <textarea
              className="input"
              rows={6}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                emitTyping();
                emitEdit(title, e.target.value);
              }}
              required
            />
          ) : (
            <div className="todo-list-input" style={{ display: "grid", gap: 10 }}>
              {items.map((it, i) => (
                <div key={i} style={{ display: "flex", gap: 8 }}>
                  <input
                    className="input"
                    placeholder={`Item ${i + 1}`}
                    value={it.text}
                    onChange={(e) => updateItem(i, e.target.value)}
                    ref={(el) => (itemRefs.current[i] = el)}
                  />
                  <button
                    type="button"
                    className="btn link-btn"
                    onClick={() => removeItem(i)}
                  >
                    Remove
                  </button>
                </div>
              ))}

              <button type="button" className="btn link-btn" onClick={addItem}>
                + Add item
              </button>
            </div>
          )}

          <div className="btn-containers">
            <button
              type="button"
              className="btn link-btn"
              onClick={onClose}
            >
              Cancel
            </button>

            <button className="btn" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
