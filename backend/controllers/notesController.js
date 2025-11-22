import Notes from "../models/NotesModel.js";
import SharedContact from "../models/SharedContact.js";
import User from "../models/UserModal.js";
import { asyncHandler } from "../utils/asynchandler.js";

// 🧩 Utility: check user access type
const getAccessForUser = (note, userId) => {
  if (!note) return null;
  if (note.user.toString() === userId.toString()) return "owner";
  const shared = (note.sharedWith || []).find(
    (s) => s.user.toString() === userId.toString()
  );
  return shared ? shared.access : null;
};

// ============================================================
// 🗒️ GET /api/notes/all  -> Owned + Shared
// ============================================================
export const getAllNotes = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const notes = await Notes.find({
    $or: [{ user: userId }, { "sharedWith.user": userId }],
  }).populate("user", "name email");

  res.json(notes);
});

// ============================================================
// 🗒️ GET /api/notes  -> Owned
// ============================================================
export const getMyNotes = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const notes = await Notes.find({ user: userId }).populate("user", "name email");
  res.json(notes);
});

// ============================================================
// 🗒️ GET /api/notes/shared -> Only shared with me
// ============================================================
export const getSharedNotes = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const notes = await Notes.find({ "sharedWith.user": userId }).populate(
    "user",
    "name email"
  );
  res.json(notes);
});

// ============================================================
// 🗒️ GET /api/notes/shared/:id -> Get a specific note (owner or shared)
// ============================================================
export const getSharedNoteById = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const noteId = req.params.id;

  const note = await Notes.findById(noteId)
    .populate("user", "name email")
    .populate("sharedWith.user", "name email");

  if (!note) {
    res.status(404);
    throw new Error("Note not found");
  }

  // 🔥 Access check
  const isOwner = note.user._id.toString() === userId.toString();
  const isShared = note.sharedWith.some(
    (s) => s.user._id.toString() === userId.toString()
  );

  if (!isOwner && !isShared) {
    res.status(403);
    throw new Error("Forbidden — you do not have access to this shared note");
  }

  res.json({ note });
});


// ============================================================
// Update Shared Access (owner only)
// ============================================================
export const updateSharedAccessNotes = asyncHandler(async (req, res) => {
  const { id, sharedId } = req.params;
  const { access } = req.body;
  const userId = req.user._id;

  const note = await Notes.findById(id);
  if (!note) {
    res.status(404);
    throw new Error("Note not found");
  }

  if (note.user.toString() !== userId.toString()) {
    res.status(403);
    throw new Error("Only owner can update sharing access");
  }

  const shared = note.sharedWith.id(sharedId);
  if (!shared) {
    res.status(404);
    throw new Error("Shared entry not found");
  }

  shared.access = access;
  await note.save();

  await note.populate({
  path: "sharedWith.user",
  select: "name email"
});



  // notify the user whose access changed
  try {
    if (req.io && shared && shared.user) {
      req.io.to(shared.user._id.toString()).emit("share_access_updated", {
        noteId: note._id,
        access: shared.access,
        message: `Your access to "${note.title}" was changed to ${shared.access}`,
      });
    }
  } catch (e) {
    // don't crash on socket errors
    console.error("Socket notify error (updateSharedAccessNotes):", e.message);
  }

  res.json({ message: "Access updated", sharedWith: note.sharedWith });
});

// ============================================================
// 🗒️ GET /api/notes/:id -> Accessible if owner or shared
// ============================================================
export const getNoteById = asyncHandler(async (req, res) => {
  const note = await Notes.findById(req.params.id)
    .populate("user", "name email")
    .populate("sharedWith.user", "name email");
  if (!note) {
    res.status(404);
    throw new Error("Note not found");
  }

  const access = getAccessForUser(note, req.user._id);
  if (!access) {
    res.status(403);
    throw new Error("Not authorized to view this note");
  }

  res.json({ note, access });
});

// ============================================================
// 🗒️ POST /api/notes -> Create new note
// ============================================================
export const createNotes = asyncHandler(async (req, res) => {
  const { title, description } = req.body;


  const notes = await Notes.create({
    user: req.user._id,
    title,
    description,
  });

  // populate for response
  await notes.populate("user", "name email");

  res.status(201).json(notes);
});

// ============================================================
// 🗒️ PUT /api/notes/:id -> Update (owner/editor only)
// ============================================================
export const updateNote = asyncHandler(async (req, res) => {
  const note = await Notes.findById(req.params.id);
  if (!note) {
    res.status(404);
    throw new Error("Note not found");
  }

  const access = getAccessForUser(note, req.user._id);
  if (access !== "owner" && access !== "editor") {
    res.status(403);
    throw new Error("Not authorized to edit");
  }

  const { title, description, completed } = req.body;

  if (title !== undefined) note.title = title;
  if (description !== undefined) note.description = description;
  if (completed !== undefined) note.completed = completed;

  await note.save();

  // FIXED POPULATE
  await note.populate([
    { path: "user", select: "name email" },
    { path: "sharedWith.user", select: "name email" }
  ]);

  // Real-time update
  try {
    if (req.io) {

      const recipientIds = new Set();

      // Owner
      recipientIds.add(note.user._id.toString());

      // Each shared user
      (note.sharedWith || []).forEach((s) => {
        recipientIds.add(s.user._id.toString());
      });

      // Emit to each user room
      recipientIds.forEach((uid) => {
        req.io.to(uid).emit("note_updated_refresh", {
          noteId: note._id.toString(),
        });
      });

    }
  } catch (e) {
    console.error("Socket emit error (updateNote):", e.message);
  }



  // FIX JSON serialization issue
  res.json({
    message: "Note updated",
    note: note.toObject(),
  });
});


// ============================================================
// 🗑️ DELETE /api/notes/:id
// Owner → delete note
// Shared user → remove their access
// ============================================================
export const deleteNotes = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const note = await Notes.findById(id);

  if (!note) {
    res.status(404);
    throw new Error("Note not found");
  }

  const userId = req.user._id.toString();
  const ownerId = note.user.toString();

  // Owner deletes note entirely
  if (userId === ownerId) {
    // before delete, get list of shared user ids to notify
    const sharedUserIds = (note.sharedWith || []).map((s) => s.user.toString());

    await note.deleteOne();

    // notify collaborators in the note room and personal rooms
    try {
      if (req.io) {
        // room notification
        req.io.to(id.toString()).emit("note_deleted", { noteId: id });

        // personal notification to each shared user
        sharedUserIds.forEach((uid) => {
          req.io.to(uid).emit("shared_item_deleted", {
            noteId: id,
            message: `A shared note "${note.title}" was deleted by the owner.`,
          });
        });
      }
    } catch (e) {
      console.error("Socket emit error (deleteNotes owner):", e.message);
    }

    return res.json({ message: "Note deleted successfully (owner)" });
  }

  // Shared user removes their access
  const sharedIndex = note.sharedWith.findIndex((s) => s.user.toString() === userId);
  if (sharedIndex !== -1) {
    const removedEntry = note.sharedWith.splice(sharedIndex, 1)[0];
    await note.save();

    // notify the user (their own client) that their access was removed — optional
    try {
      if (req.io) {
        req.io.to(req.user._id.toString()).emit("share_removed", {
          noteId: id,
          message: `Your access to "${note.title}" was removed.`,
        });
      }
    } catch (e) {
      console.error("Socket emit error (deleteNotes shared user):", e.message);
    }

    return res.json({ message: "Removed your shared access to this note" });
  }

  // Otherwise unauthorized
  res.status(403);
  throw new Error("Not authorized to delete this note");
});

// ============================================================
// 🤝 POST /api/notes/:id/share -> Owner only
// Body: { email, access }
// ============================================================
export const shareNote = asyncHandler(async (req, res) => {
  const note = await Notes.findById(req.params.id);
  if (!note) throw new Error("Note not found");

  if (note.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only owner can share");
  }

  const { email, access } = req.body;
  const userToShare = await User.findOne({ email: email.toLowerCase() });
  if (!userToShare) throw new Error("User not found");

  const existing = note.sharedWith.find(
    (s) => s.user.toString() === userToShare._id.toString()
  );

  if (existing) existing.access = access;
  else note.sharedWith.push({ user: userToShare._id, access });

  await note.save();

  // socket emit (inside route)
  req.io.to(userToShare._id.toString()).emit("shared_item", {
    message: `${req.user.name} shared a note with you`,
    itemId: note._id,
    type: "note",
  });

  res.json({ message: "Shared successfully", note });
});


// ============================================================
// 🚫 DELETE /api/notes/:id/share -> Owner only
// Body: { userId }
// ============================================================
export const revokeShare = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;
  const note = await Notes.findById(id);
  if (!note) {
    res.status(404);
    throw new Error("Note not found");
  }

  if (note.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only owner can revoke");
  }

  const wasShared = (note.sharedWith || []).some((s) => s.user.toString() === userId.toString());
  note.sharedWith = (note.sharedWith || []).filter(
    (s) => s.user.toString() !== userId.toString()
  );

  await note.save();

  // notify revoked user
  try {
    if (req.io) {
      console.log(userId.toString())
      req.io.to(userId.toString()).emit("share_revoked", {
        noteId: note._id,
        message: `Your access to "${note.title}" was revoked by the owner.`,
      });
    }
  } catch (e) {
    console.error("Socket emit error (revokeShare):", e.message);
  }

  res.json({ message: "Share revoked", note });
});
