// src/components/ShareModal.jsx
import { useEffect, useRef, useState } from "react";
import "../assets/styles/ShareModal.css";
import {
  getSuggestedUsersList,
  revokeShareApiNotes,
  updateSharedAccess,
  createShareLink,
  revokeShareLink,
} from "../api/notesApi";
import { revokeShareApiTodos } from "../api/todosApi";

export default function ShareModal({ open, onClose, item, ownerEmail, onShare, currentUser }) {
  const [email, setEmail] = useState("");
  const [access, setAccess] = useState("viewer"); // controls user-invite access
  const [submitting, setSubmitting] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sharedWith, setSharedWith] = useState([]);
  const [removing, setRemoving] = useState(null);

  // Link-sharing state — separate from sharedWith
  const [linkInfo, setLinkInfo] = useState(null); // { url }
  const [linkCreating, setLinkCreating] = useState(false);
  const [linkRevoking, setLinkRevoking] = useState(false);

  const emailRef = useRef(null);

  useEffect(() => {
    if (open && item?._id) {
      fetchContacts();
      fetchSharedUsers();
    } else {
      setEmail("");
      setSuggestions([]);
      setShowSuggestions(false);
      setSharedWith([]);
      setLinkInfo(null);
    }
  }, [open, item]);

  const fetchContacts = async () => {
    try {
      const { data } = await getSuggestedUsersList();
      setContacts((data || []).sort((a, b) => new Date(b.lastSharedAt) - new Date(a.lastSharedAt)));
    } catch (err) {
      console.error("Failed to fetch shared contacts", err);
    }
  };

  const fetchSharedUsers = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/${item.type}s/shared/${item._id}`, {
        credentials: "include",
      });
      const data = await res.json();
      // Keep the existing shared users intact and separate from shareLink
      const shared = data?.note?.sharedWith || data?.todo?.sharedWith || [];
      setSharedWith(shared);

      // If backend returns shareLink info inside the note, show it (but do not copy into sharedWith)
      const shareLink = data?.note?.shareLink || data?.todo?.shareLink;
      if (shareLink && shareLink.enabled && shareLink.token) {
        const fullUrl = shareLink.fullUrl || `${window.location.origin}/shared/${shareLink.token}`;
        setLinkInfo({ url: fullUrl });
      } else {
        setLinkInfo(null);
      }
    } catch (err) {
      console.error("Failed to load shared users", err);
    }
  };

  const handleAccessChange = async (sharedId, newAccess) => {
    try {
      await updateSharedAccess(item._id, sharedId, { access: newAccess }, item.type);
      setSharedWith((prev) => prev.map((s) => (s._id === sharedId ? { ...s, access: newAccess } : s)));
    } catch (err) {
      console.error("Failed to update access", err);
    }
  };

  const handleRemoveAccess = async (sharedId, userId) => {
    const ok = window.confirm("Remove this user's access?");
    if (!ok) return;
    try {
      setRemoving(sharedId);
      if (item?.type === "todo") {
        await revokeShareApiTodos(item._id, userId);
      } else {
        await revokeShareApiNotes(item._id, userId);
      }
      setSharedWith((prev) => prev.filter((s) => s._id !== sharedId));
    } catch (err) {
      console.error("Failed to revoke access", err);
    } finally {
      setRemoving(null);
    }
  };

  // Create a link that grants editor (full) access — separate from per-user sharedWith
  const handleCreateLink = async () => {
  if (!item?._id) return;
  try {
    setLinkCreating(true);

    const body = { access: "editor" };

    const res = await createShareLink(item._id, body, item.type);
    const payload = res.data || {};
    const url = payload.url || (payload.token ? `${window.location.origin}/shared/${payload.token}` : null);
    if (url) setLinkInfo({ url });
  } catch (err) {
    console.error("Failed to create share link", err);
    alert("Could not create link. See console.");
  } finally {
    setLinkCreating(false);
  }
};

  const handleRevokeLink = async () => {
    if (!item?._id) return;
    const ok = window.confirm("Revoke the public share link? This will disable the link immediately.");
    if (!ok) return;
    try {
      setLinkRevoking(true);
      await revokeShareLink(item._id, item.type);
      setLinkInfo(null);
    } catch (err) {
      console.error("Failed to revoke link", err);
      alert("Could not revoke link.");
    } finally {
      setLinkRevoking(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      if (!linkInfo?.url) return;
      await navigator.clipboard.writeText(linkInfo.url);
      // Replace alert with nicer UI if you have toasts
      alert("Link copied to clipboard");
    } catch (err) {
      console.error("Copy failed", err);
      alert("Unable to copy link");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!item) return;
    setSubmitting(true);
    try {
      await onShare({ item, email: email.trim(), access });
      // refresh shared users to reflect new invite
      await fetchSharedUsers();
    } finally {
      setSubmitting(false);
      onClose();
    }
  };

  // Only owner should be able to create/revoke links. Quick check:
  const isOwner = currentUser?.email === ownerEmail;



  if (!open || !item) return null;

  return (
    <div className="modal">
      <div className="share-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="share-content card">

          {/* User invite form (unchanged) */}
          <form onSubmit={submit} style={{ display: "grid", gap: 12, position: "relative" }}>
            <label className="note-desc" htmlFor="share-email">User email</label>

            <input
              id="share-email"
              ref={emailRef}
              className="input"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              required
              autoComplete="off"
            />

            {showSuggestions && suggestions.length > 0 && (
              <ul className="suggestion-list">
                {suggestions.map((s) => (
                  <li key={s._id} className="suggestion-item" onClick={() => setEmail(s.email)}>
                    <strong>{s.contact?.name || s.email}</strong>
                  </li>
                ))}
              </ul>
            )}

            <fieldset className="card" style={{ padding: 12 }}>
              <legend className="note-desc">Access</legend>
              <div>
                <label>
                  <input
                    type="radio"
                    name="access"
                    value="viewer"
                    checked={access === "viewer"}
                    onChange={() => setAccess("viewer")}
                  /> Viewer
                </label>
                <label style={{ marginLeft: 16 }}>
                  <input
                    type="radio"
                    name="access"
                    value="editor"
                    checked={access === "editor"}
                    onChange={() => setAccess("editor")}
                  /> Editor
                </label>
              </div>
            </fieldset>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn link-btn" onClick={onClose}>Cancel</button>
              <button className="btn" disabled={submitting}>
                {submitting ? "Sharing..." : "Share"}
              </button>
            </div>
          </form>

          {sharedWith.length > 0 && (
            <div className="shared-users" style={{ marginTop: 20 }}>
              <h4 className="note-title">Shared With</h4>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {sharedWith.map((s) => (
                  <li
                    key={s._id}
                    className="shared-people-list"
                  >
                    <div className="shared-with-name">
                      <strong>{s.user?.name}</strong> — {s.user?.email}
                    </div>

                    <select
                      value={s.access}
                      className="change-access"
                      onChange={(e) => handleAccessChange(s._id, e.target.value)}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>

                    <button
                      className="btn link-btn"
                      onClick={() => handleRemoveAccess(s._id, s.user?._id)}
                      disabled={removing === s._id}
                      title="Remove access"
                      style={{whiteSpace: "nowrap" }}
                    >
                      {removing === s._id ? "Removing…" : "Remove access"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          
        </div>
      </div>
    </div>
  );
}
