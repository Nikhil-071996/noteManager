import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import SharedContact from "../models/SharedContact.js";

const router = express.Router();
router.use(protect);

router.get("/", async (req, res) => {
  const contacts = await SharedContact.find({ owner: req.user._id })
    .populate("contact", "email name")
    .sort({ lastSharedAt: -1 })
    .limit(10);
  res.json(contacts);
});

export default router;
