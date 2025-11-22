import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import "../assets/styles/Dashboard.css";
import { deleteTodo, getTodos, getSharedTodos, shareTodo } from "../api/todosApi";
import { deleteNote, getNotes, getSharedNotes, shareNote } from "../api/notesApi";
import { Link } from "react-router-dom";
import ShareModal from "../components/ShareModal";
import { FaTrash, FaShareAlt, FaEdit } from "react-icons/fa";
import EditModal from "../components/EditModal";
import CreateNoteModal from "../components/CreateNoteModal";
import CreateTodoModal from "../components/CreateTodoModal";
import { socket } from "../api/socket";
import EditNoteModal from "../components/EditNoteModal";
import EditTodoModal from "../components/EditTodoModal";

export default function Dashboard() {
  const { user, logout } = useAuth();

  const [notes, setNotes] = useState([]);
  const [todos, setTodos] = useState([]);
  const [sharedNotes, setSharedNotes] = useState([]);
  const [sharedTodos, setSharedTodos] = useState([]);
  const [activeTab, setActiveTab] = useState("owned"); 

  const [createNoteOpen, setCreateNoteOpen] = useState(false);
  const [createTodoOpen, setCreateTodoOpen] = useState(false);
  
  const [unseenSharedCount, setUnseenSharedCount] = useState(0);

  const [editNote, setEditNote] = useState(null);
  const [editTodo, setEditTodo] = useState(null);




  const [shareOpen, setShareOpen] = useState(false);
  const [shareItem, setShareItem] = useState(null);
  const ownerEmail = user?.email;
  const [q, setQ] = useState("");


  useEffect(() => {
  if (!user?.id) return;

  if (socket.connected) {
    socket.emit("register_user", user.id);
  } else {
    socket.on("connect", () => {
      socket.emit("register_user", user.id);
    });
  }

  const handleSharedItem = (data) => {
    toast.info(data.message);

    setUnseenSharedCount((prev) =>
      activeTab === "shared" ? prev : prev + 1
    );

    fetchSharedNotes();
    fetchSharedTodos();
  };

  socket.on("shared_item", handleSharedItem);

  return () => {
    socket.off("shared_item", handleSharedItem);
  };
}, [user]);

useEffect(() => {
  const handleAccessChange = (data) => {

    toast.info(data.message);

    if (activeTab !== "shared") {
      setUnseenSharedCount((prev) => prev + 1);
    }

    fetchSharedNotes();
    fetchSharedTodos();
  };

  const handleAccessRemoved = (data) => {
    toast.error(data.message);
    if (activeTab !== "shared") {
      setUnseenSharedCount((prev) => prev + 1);
    }
    fetchSharedNotes();
    fetchSharedTodos();
  };


  socket.on("share_access_updated", handleAccessChange);
  socket.on("share_revoked", handleAccessRemoved);

  return () => {
    socket.off("share_access_updated", handleAccessChange);
    socket.off("share_revoked", handleAccessRemoved);
  };
}, []);




useEffect(() => {
  const handleNoteUpdate = (data) => {
    console.log("Got socket note_updated_refresh:", data);
    fetchAll();
  };

  socket.on("note_updated_refresh", handleNoteUpdate);
  return () => socket.off("note_updated_refresh", handleNoteUpdate);
}, []);

useEffect(() => {
  const handleTodoUpdate = (data) => {
    console.log("Got socket todo_updated_refresh:", data);
    fetchAll(); // refresh everything like notes
  };

  socket.on("todo_updated_refresh", handleTodoUpdate);
  return () => socket.off("todo_updated_refresh", handleTodoUpdate);
}, []);



  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    Promise.all([
      fetchNotes(),
      fetchTodos(),
      fetchSharedNotes(),
      fetchSharedTodos(),
    ]);
  };

  const fetchNotes = async () => {
    try {
      const { data } = await getNotes();
      const typed = data.map((n) => ({ ...n, type: "note" }));
      setNotes(typed);
    } catch {
      toast.error("Failed to fetch notes");
    }
  };

  const fetchSharedNotes = async () => {
    try {
      const { data } = await getSharedNotes();
      const typed = data.map((n) => ({ ...n, type: "note" }));
      setSharedNotes(typed);
    } catch {
      toast.error("Failed to fetch shared notes");
    }
  };

  const fetchTodos = async () => {
    try {
      const { data } = await getTodos();
      const typed = data.map((t) => ({ ...t, type: "todo" }));
      setTodos(typed);
    } catch {
      toast.error("Failed to fetch todos");
    }
  };

  const fetchSharedTodos = async () => {
    try {
      const { data } = await getSharedTodos();
      const typed = data.map((t) => ({ ...t, type: "todo" }));
      setSharedTodos(typed);
    } catch {
      toast.error("Failed to fetch shared todos");
    }
  };

  const handleEdit = (item) => {
    if(item.type === "note") {
      setEditNote(item);
    } else {
      setEditTodo(item);
    }
  };


  const handleDelete = async (item) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete this ${item.type}?`
    );

    if (!confirmDelete) return;

    try {
      if (item.type === "note") {
        await deleteNote(item._id);
        setNotes((prev) => prev.filter((n) => n._id !== item._id));
      } else {
        await deleteTodo(item._id);
        setTodos((prev) => prev.filter((t) => t._id !== item._id));
      }

      toast.success(`${item.type} deleted successfully`);
    } catch {
      toast.error("Failed to delete");
    }
  };


  // ✅ Share Modal Handlers
  const handleShare = (item) => {
    setShareItem(item);
    setShareOpen(true);
  };

  const switchToShared = () => {
    setActiveTab("shared");
    setUnseenSharedCount(0);   // RESET badges once opened
  };

  const switchToOwned = () => {
    setActiveTab("owned");
  };



  const performShare = async ({ item, email, access }) => {
    try {
      if (item.type === "note") {
        await shareNote(item._id, { email, access });
      } else {
        await shareTodo(item._id, { email, access });
      }
      toast.success(`Shared ${item.type} with ${email} as ${access}`);
    } catch (e) {
      console.log(e?.response?.data?.message);
      toast.error(e?.response?.data?.message || "Failed to share item");
    }
  };

  // ✅ Combine all for filtering/search
  const combined = useMemo(() => {
    const ownedAll = [...notes, ...todos];
    const sharedAll = [...sharedNotes, ...sharedTodos];
    const current = activeTab === "owned" ? ownedAll : sharedAll;

    const term = q.trim().toLowerCase();
    const filtered = term
      ? current.filter(
          (item) =>
            item.title.toLowerCase().includes(term) ||
            (item.description?.toLowerCase?.() || "").includes(term)
        )
      : current;

    return filtered.sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  }, [activeTab, q, notes, todos, sharedNotes, sharedTodos]);

  return (
    <div className="container">
      {/* Share Modal */}
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        item={shareItem}
        ownerEmail={ownerEmail}
        currentUser={user}
        onShare={performShare}
      />

      {editNote && (
        <EditNoteModal
          item={editNote}
          user={user}
          onClose={() => setEditNote(null)}
          onUpdated={fetchAll}
          viewOnly={(() => {
            const isOwner = editNote.user?._id === user?.id;
            if (isOwner) return false; // OWNER CAN ALWAYS EDIT

            const shared = editNote.sharedWith?.find(
              s => s.user === user?._id || s.user?._id === user?._id
            );
            return shared?.access === "viewer";
          })()}
        />
      )}

      {editTodo && (
        <EditTodoModal
          item={editTodo}
          user={user}
          onClose={() => setEditTodo(null)}
          onUpdated={fetchAll}
          viewOnly={(() => {
            const isOwner = editTodo.user?._id === user?.id;
            if (isOwner) return false;

            const shared = editTodo.sharedWith?.find(
              s => s.user === user?._id || s.user?._id === user?._id
            );

            return shared?.access === "viewer";
          })()}
        />
      )}

      <CreateNoteModal
        open={createNoteOpen}
        onClose={() => setCreateNoteOpen(false)}
        onCreated={fetchAll}
      />
      <CreateTodoModal
        open={createTodoOpen}
        onClose={() => setCreateTodoOpen(false)}
        onCreated={fetchAll}
      />

      {/* Header Actions */}
      <div className="dashboard-header">
        <h2>Hello, {user?.name}</h2>
        
        <button className="logout" onClick={logout}>
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === "owned" ? "active" : ""}`}
          onClick={switchToOwned}
        >
          Owned
        </button>
        <button
          className={`tab-btn ${activeTab === "shared" ? "active" : ""}`}
          onClick={switchToShared}
        >
          Shared with me

          {unseenSharedCount > 0 && activeTab !== "shared" && (
            <span
              className="badge"
            >
              {unseenSharedCount}
            </span>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="searchbar">
        <input
          className="search"
          placeholder={`Search ${activeTab === "owned" ? "your" : "shared"} notes and todos…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          
        />

        <div className="add-links-container">
          <button onClick={() => setCreateNoteOpen(true)} >
            New Note +
          </button>
          <button onClick={() => setCreateTodoOpen(true)} >
            New Todo +
          </button>
        </div>
      </div>

      <p className="meta">
        {combined.length} {activeTab} item(s) match “{q || ""}”
      </p>

      {/* Grid View */}
      <div className="note-manager-body">
        {combined.map((item) => {
          const isOwner = item.user?._id === user?.id;
          const sharedAccess = item.sharedWith?.find(
            (s) => s.user === user?._id || s.user?._id === user?._id
          );
          const canEdit = isOwner || sharedAccess?.access === "editor";
          const isViewerOnly = sharedAccess?.access === "viewer";

          return (
            <article key={item._id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h3 className="note-title">{item.title}</h3>
                <span
                  style={{
                    background: item.type === "note" ? "#0077ff22" : "#ffbb0022",
                    color: item.type === "note" ? "#0077ff" : "#b58900",
                    fontSize: 12,
                    padding: "2px 8px",
                    borderRadius: "10px",
                    alignSelf: "center",
                  }}
                >
                  {item.type}
                </span>
              </div>

              {/* Description or todo items */}
              {item.type === "note" ? (
                <p className="note-desc">{item.description || "No description"}</p>
              ) : Array.isArray(item.items) && item.items.length > 0 ? (
                <ol style={{ margin: 0, paddingLeft: 18 }}>
                  {item.items.slice(0, 5).map((it, idx) => (
                    <li key={idx} style={{textDecoration: it.completed ? 'line-through' : ''}} >{it.text}</li>
                  ))}
                </ol>
              ) : (
                <p className="note-desc">No items yet</p>
              )}

              {/* Actions */}
              <div className="can-edit-container">
                {isViewerOnly && (
                  <button
                    className="icon-btn"
                    title="View Only"
                    onClick={() => handleEdit(item)}  // opens modal but in view mode
                  >
                    👁
                  </button>
                )}

                {/* Editor or Owner: Full edit */}
                {canEdit && (
                  <button className="icon-btn" title="Edit" onClick={() => handleEdit(item)}>
                    <FaEdit />
                  </button>
                )}
                {isOwner && (
                  <button
                    className="icon-btn"
                    title="Delete"
                    onClick={() => handleDelete(item)}
                  >
                    <FaTrash />
                  </button>
                )}

        {/* 🔗 Share (only owner) */}
        {isOwner && (
          <button
            className="icon-btn"
            title="Share"
            onClick={() => handleShare(item)}
          >
            <FaShareAlt />
          </button>
        )}
      </div>
    </article>
  );
})}

        {combined.length === 0 && (
          <p className="meta" style={{ gridColumn: "1 / -1" }}>
            No results found
          </p>
        )}
      </div>
    </div>
  );
}
