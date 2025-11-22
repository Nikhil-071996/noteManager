import express from "express";
import {
  createTodo,
  deleteTodo,
  shareTodo,
  getAllTodos,
  updateTodo,
  getTodoById,
  revokeTodoShare,
  getSharedTodos,
  getMyTodos,
  getSharedTodoById,
  updateSharedAccessTodos,
} from "../controllers/todoController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// /api/todos
router
  .route("/")
  .get(protect, getMyTodos)       // owned
  .post(protect, createTodo);     // create

// all todos shared + owned
router.get("/all", protect, getAllTodos);

// /api/todos/shared
router.get("/shared", protect, getSharedTodos);

// /api/todos/:id
router
  .route("/:id")
  .get(protect, getTodoById)
  .put(protect, updateTodo)
  .delete(protect, deleteTodo);

// /api/todos/:id/share
router.post("/:id/share", protect, shareTodo);

// /api/todos/shared/:id
router.get("/shared/:id", protect, getSharedTodoById);

// update shared access
router.put("/:id/shared/:sharedId", protect, updateSharedAccessTodos);

// revoke share
router.delete("/:id/:userId/share", protect, revokeTodoShare);

export default router;
