import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { createTodo } from "../api/todosApi";

export default function CreateTodoModal({ open, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [items, setItems] = useState([{ text: "", completed: false }]);
  const [loading, setLoading] = useState(false);

  const titleRef = useRef(null);
  const itemRefs = useRef([]);

  // Reset modal when opened
  useEffect(() => {
    if (open) {
      setTitle("");
      setItems([{ text: "", completed: false }]);
      setTimeout(() => titleRef.current?.focus(), 0);
      itemRefs.current = [];
    }
  }, [open]);

  if (!open) return null;

  const updateItemText = (i, value) => {
    setItems((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, text: value } : it))
    );
  };

  const toggleCompleted = (i) => {
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === i ? { ...it, completed: !it.completed } : it
      )
    );
  };

  const addItem = () => {
    setItems((prev) => {
      const next = [...prev, { text: "", completed: false }];
      queueMicrotask(() => {
        const idx = next.length - 1;
        itemRefs.current[idx]?.focus();
      });
      return next;
    });
  };

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

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        title: title.trim(),
        items: items
          .map((i) => ({
            text: i.text.trim(),
            completed: i.completed || false,
          }))
          .filter((i) => i.text.length > 0),
      };

      await createTodo(payload);

      toast.success("Todo created");
      onCreated?.();
      onClose();
    } catch (err) {
      toast.error("Failed to create todo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="edit-modal">
        <form onSubmit={handleCreate}>
          <input
            className="input"
            placeholder="Todo title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            ref={titleRef}
          />

          <div className="todo-list-input" style={{ display: "grid", gap: 10 }}>
            {items.map((it, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  justifyContent: 'space-between'
                }}
              >
                <div className="inputs-content">

                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={!!it.completed}
                    onChange={() => toggleCompleted(i)}
                  />

                  {/* Text input */}
                  <input
                    className="input"
                    placeholder={`Item ${i + 1}`}
                    value={it.text}
                    onChange={(e) => updateItemText(i, e.target.value)}
                    ref={(el) => (itemRefs.current[i] = el)}
                  />
                </div>

                {/* Remove item */}
                <button
                  type="button"
                  className="btn link-btn"
                  onClick={() => removeItem(i)}
                >
                  Remove
                </button>
              </div>
            ))}

          </div>
            <button type="button" className="btn link-btn" onClick={addItem}>
              + Add item
            </button>

          <div className="btn-containers">
            <button type="button" className="btn link-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="btn" disabled={loading}>
              {loading ? "Saving..." : "Create Todo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
