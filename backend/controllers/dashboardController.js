import Notes from "../models/NotesModel.js";
import Todo from "../models/TodoModel.js";
import { asyncHandler } from "../utils/asynchandler.js";

export const getDashboardData = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [notes, todos] = await Promise.all([
    Notes.find({
      $or: [
        { user: userId },
        { "sharedWith.user": userId }
      ]
    }),
    Todo.find({
      $or: [
        { user: userId },
        { "sharedWith.user": userId }
      ]
    })
  ]);

  const allData = [...notes, ...todos].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );

  res.json(allData);
});
