import express from "express";
import {
  createNotes,
  deleteNotes,
  shareNote,
  getAllNotes,
  updateNote,
  getNoteById,
  revokeShare,
  getSharedNotes,
  getMyNotes,
  getSharedNoteById,
  updateSharedAccessNotes,
} from "../controllers/notesController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// /api/notes
router
  .route("/")
  .get(protect, getMyNotes)
  .post(protect, createNotes);

// all notes shared and owned
router.get("/all", protect, getAllNotes);

// /api/notes/shared
router.get("/shared", protect, getSharedNotes);

// /api/notes/:id
router
  .route("/:id")
  .get(protect, getNoteById)
  .put(protect, updateNote)
  .delete(protect, deleteNotes);

// /api/notes/:id/share
router.post("/:id/share", protect, shareNote);
router.get("/shared/:id", protect, getSharedNoteById);
router.put("/:id/shared/:sharedId", protect, updateSharedAccessNotes);
router.delete("/:id/:userId/share", protect, revokeShare);


export default router;
