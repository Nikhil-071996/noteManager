import { asyncHandler } from "../utils/asynchandler.js";
import User from "../models/UserModal.js";
import Todo from "../models/TodoModel.js";


// utility: get access (owner/editor/viewer)
const getAccessForUser = (todo, userId) => {
  if (todo.user.toString() === userId.toString()) return "owner";
  const shared = todo.sharedWith.find(s => s.user.toString() === userId.toString());
  return shared ? shared.access : null;
};

// ============================================================
// GET /api/todos  -> owned
// ============================================================
export const getMyTodos = asyncHandler(async (req, res) => {
  const todos = await Todo.find({ user: req.user._id })
    .populate("user", "name email");

  res.json(todos);
});

// ============================================================
// GET /api/todos/all -> owned + shared
// ============================================================
export const getAllTodos = asyncHandler(async (req, res) => {
  const todos = await Todo.find({
    $or: [{ user: req.user._id }, { "sharedWith.user": req.user._id }],
  }).populate("user", "name email");

  res.json(todos);
});

// ============================================================
// GET /api/todos/shared -> shared with me
// ============================================================
export const getSharedTodos = asyncHandler(async (req, res) => {
  const todos = await Todo.find({ "sharedWith.user": req.user._id })
    .populate("user", "name email");

  res.json(todos);
});

// ============================================================
// GET /api/todos/:id -> owner or shared
// ============================================================
export const getTodoById = asyncHandler(async (req, res) => {
  const todo = await Todo.findById(req.params.id)
    .populate("user", "name email")
    .populate("sharedWith.user", "name email");

  if (!todo) {
    res.status(404);
    throw new Error("Todo not found");
  }

  const access = getAccessForUser(todo, req.user._id);
  if (!access) {
    res.status(403);
    throw new Error("Not authorized");
  }

  res.json({ todo, access });
});

// ============================================================
// GET /api/todos/shared/:id
// ============================================================
export const getSharedTodoById = asyncHandler(async (req, res) => {
  const todo = await Todo.findById(req.params.id)
    .populate("user", "name email")
    .populate("sharedWith.user", "name email");

  if (!todo) {
    res.status(404);
    throw new Error("Todo not found");
  }

  // no access check here; already filtered by route
  res.json({ todo });
});

// ============================================================
// POST /api/todos -> create todo
// ============================================================
export const createTodo = asyncHandler(async (req, res) => {
  const todo = await Todo.create({
    user: req.user._id,
    title: req.body.title,
    items: req.body.items || [],
  });

  await todo.populate("user", "name email");

  res.status(201).json(todo);
});

// ============================================================
// PUT /api/todos/:id -> update owner/editor
// ============================================================
export const updateTodo = asyncHandler(async (req, res) => {
  const todo = await Todo.findById(req.params.id);

  if (!todo) {
    res.status(404);
    throw new Error("Todo not found");
  }

  const access = getAccessForUser(todo, req.user._id);
  if (access !== "owner" && access !== "editor") {
    res.status(403);
    throw new Error("Not authorized to edit");
  }

  const { title, items } = req.body;

  if (title !== undefined) todo.title = title;
  if (items !== undefined) todo.items = items;

  await todo.save();

  await todo.populate([
    { path: "user", select: "name email" },
    { path: "sharedWith.user", select: "name email" }
  ]);

  // real-time refresh for owner + shared
  try {
    if (req.io) {
      const recipients = new Set();

      recipients.add(todo.user._id.toString());

      (todo.sharedWith || []).forEach(s =>
        recipients.add(s.user._id.toString())
      );

      recipients.forEach(uid => {
        req.io.to(uid).emit("todo_updated_refresh", {
          todoId: todo._id.toString(),
        });
      });
    }
  } catch (e) {
    console.error("Socket emit error:", e.message);
  }

  res.json({ message: "Todo updated", todo: todo.toObject() });
});

// ============================================================
// DELETE /api/todos/:id -> owner delete, shared remove access
// ============================================================
export const deleteTodo = asyncHandler(async (req, res) => {
  const todo = await Todo.findById(req.params.id);

  if (!todo) {
    res.status(404);
    throw new Error("Todo not found");
  }

  const userId = req.user._id.toString();
  const ownerId = todo.user.toString();

  // owner deletes
  if (userId === ownerId) {
    const sharedIds = todo.sharedWith.map(s => s.user.toString());

    await todo.deleteOne();

    try {
      if (req.io) {
        sharedIds.forEach(uid => {
          req.io.to(uid).emit("shared_item_deleted", {
            todoId: todo._id,
            message: `A shared todo "${todo.title}" was deleted by the owner.`,
          });
        });
      }
    } catch (e) {
      console.error("Socket delete error:", e.message);
    }

    return res.json({ message: "Todo deleted successfully (owner)" });
  }

  // shared user removes their own access
  const sharedIndex = todo.sharedWith.findIndex(
    s => s.user.toString() === userId
  );

  if (sharedIndex !== -1) {
    todo.sharedWith.splice(sharedIndex, 1);
    await todo.save();
    return res.json({ message: "Removed your access to this todo" });
  }

  res.status(403);
  throw new Error("Not authorized");
});

// ============================================================
// POST /api/todos/:id/share -> owner only
// ============================================================
export const shareTodo = asyncHandler(async (req, res) => {
  const todo = await Todo.findById(req.params.id);
  if (!todo) throw new Error("Todo not found");

  if (todo.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only owner can share");
  }

  const { email, access } = req.body;

  const userToShare = await User.findOne({ email: email.toLowerCase() });
  if (!userToShare) throw new Error("User not found");

  const existing = todo.sharedWith.find(
    (s) => s.user.toString() === userToShare._id.toString()
  );

  if (existing) existing.access = access;
  else todo.sharedWith.push({ user: userToShare._id, access });

  await todo.save();

  // notify new user
  req.io.to(userToShare._id.toString()).emit("shared_item", {
    message: `${req.user.name} shared a todo with you`,
    itemId: todo._id,
    type: "todo",
  });

  res.json({ message: "Shared successfully", todo });
});

// ============================================================
// PUT /api/todos/:id/shared/:sharedId -> owner updates access
// ============================================================
export const updateSharedAccessTodos = asyncHandler(async (req, res) => {
  const { id, sharedId } = req.params;
  const { access } = req.body;

  const todo = await Todo.findById(id);
  if (!todo) throw new Error("Todo not found");

  if (todo.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only owner can update access");
  }

  const entry = todo.sharedWith.id(sharedId);
  if (!entry) throw new Error("Shared entry not found");

  entry.access = access;

  await todo.save();

  await todo.populate("sharedWith.user", "name email");

  // notify user
  req.io.to(entry.user._id.toString()).emit("share_access_updated", {
    todoId: todo._id,
    message: `Your access to "${todo.title}" was changed to ${access}`,
  });

  res.json({ message: "Access updated", sharedWith: todo.sharedWith });
});

// ============================================================
// DELETE /api/todos/:id/:userId/share -> owner revokes access
// ============================================================
export const revokeTodoShare = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;

  const todo = await Todo.findById(id);
  if (!todo) throw new Error("Todo not found");

  if (todo.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only owner can revoke");
  }

  todo.sharedWith = todo.sharedWith.filter(
    (s) => s.user.toString() !== userId.toString()
  );

  await todo.save();

  // notify revoked user
  req.io.to(userId.toString()).emit("share_revoked", {
    todoId: todo._id,
    message: `Your access to "${todo.title}" was revoked.`,
  });

  res.json({ message: "Share revoked", todo });
});
