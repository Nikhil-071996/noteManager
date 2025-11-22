import mongoose from "mongoose";

const todoItemSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
});

const todoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    type: { type: String, default: "todo" },
    items: [todoItemSchema], // Array of { text, completed }
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sharedWith: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        access: {
          type: String,
          enum: ["viewer", "editor"],
          default: "viewer",
        },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Todo", todoSchema);
