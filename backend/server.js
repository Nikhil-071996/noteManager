import express from "express";
import dotenv from "dotenv";
import { db } from "./config/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import notesRoute from "./routes/notesRoutes.js";
import todoRoutes from "./routes/todoRoutes.js";
import dashboardRoute from "./routes/dashboardRoutes.js";
import sharedContactRoutes from "./routes/sharedContactsRoutes.js";
import { errorHandler, routeNotFound } from "./utils/errorhandler.js";

import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();

const app = express();
const server = createServer(app);
const port = process.env.PORT || 5000;
const allowedUrl = process.env.ALLOWED_URL || "http://localhost:5173";

// SOCKET.IO SETUP
const io = new Server(server, {
  cors: {
    origin: [allowedUrl],
    credentials: true,
  },
});

// Attach io to req object
app.use((req, res, next) => {
  req.io = io;
  next();
});

db();

// middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [allowedUrl, "http://192.168.0.231:5173"],
    credentials: true,
  })
);

// routes
app.use("/api/users", userRoutes);
app.use("/api/notes", notesRoute);
app.use("/api/todos", todoRoutes);
app.use("/api/all", dashboardRoute);
app.use("/api/shared-contacts", sharedContactRoutes);

app.use(routeNotFound);
app.use(errorHandler);


io.on("connection", (socket) => {

  socket.on("register_user", (userId) => {
    socket.join(userId);  
  });

  socket.on("join_room", ({ roomId }) => {
    socket.join(roomId.toString());
  });

  socket.on("leave_room", ({ roomId }) => {
    socket.leave(roomId);
  });


  // socket.on("join_note", (noteId) => {
  //   console.log("JoinedNotes", noteId)
  //   socket.join(noteId);
  // });

  // socket.on("leave_note", (noteId) => {
  //   socket.leave(noteId);
  // });


  socket.on("note_live_update", (data) => {
    socket.to(data.roomId).emit("note_live_apply", data);
  });


});



server.listen(port, () =>
  console.log(`Server is running on port ${port}`)
);
