import { useEffect, useRef, useState } from "react";
import { updateTodo } from "../api/todosApi";
import { toast } from "react-toastify";

export default function EditTodoModal({ item, user, onClose, onUpdated, viewOnly }) {
  const [title, setTitle] = useState("");
  const [items, setItems] = useState([{ text: "", completed: false }]);
  const titleRef = useRef(null);

  useEffect(() => {
    if (item) {
      setTitle(item.title || "");
      setItems(
        item.items?.length
          ? item.items
          : [{ text: "", completed: false }]
      );
    }
  }, [item]);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const updateItemText = (index, value) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, text: value } : it))
    );
  };

  const toggleCompleted = (index) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === index ? { ...it, completed: !it.completed } : it
      )
    );
  };

  const addItem = () => {
    setItems((prev) => [...prev, { text: "", completed: false }]);
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      await updateTodo(item._id, {
        title: title.trim(),
        items: items
          .map((it) => ({
            text: it.text.trim(),
            completed: it.completed || false,
          }))
          .filter((it) => it.text.length > 0),
      });

      toast.success("Todo updated");
      onUpdated();
      onClose();
    } catch {
      toast.error("Update failed");
    }
  };

  if (!item) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {viewOnly && (
        <p style={{ color: "#fff", fontSize: 14, marginBottom: 10 }}>
          You have view-only access.
        </p>
      )}

      <div className="edit-modal">
        <form>
          <input
            ref={titleRef}
            className="input"
            placeholder="Title"
            value={title}
            disabled={viewOnly}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="todo-list-input">
            {items.map((it, idx) => (
              <div
                key={idx}
                style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: 'space-between' }}
              >
                <div className="inputs-content">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={!!it.completed}
                    disabled={viewOnly}
                    onChange={() => toggleCompleted(idx)}
                  />

                  {/* Text */}
                  <input
                    className="input"
                    value={it.text}
                    placeholder={`Item ${idx + 1}`}
                    disabled={viewOnly}
                    onChange={(e) => updateItemText(idx, e.target.value)}
                  />
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  className="btn link-btn"
                  disabled={viewOnly}
                  onClick={() => removeItem(idx)}
                >
                  Remove
                </button>
              </div>
            ))}

          </div>
            <button
              type="button"
              className="btn link-btn"
              disabled={viewOnly}
              onClick={addItem}
            >
              + Add item
            </button>

          <div className="btn-containers">
            <button type="button" className="btn link-btn" onClick={onClose}>
              Cancel
            </button>
            {!viewOnly && <button className="btn" onClick={handleSave}>Save Changes</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
