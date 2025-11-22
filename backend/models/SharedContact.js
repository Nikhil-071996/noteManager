import mongoose from "mongoose";

const sharedContactSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  contact: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  email: { type: String, required: true, lowercase: true },
  lastSharedAt: { type: Date, default: Date.now }
});

sharedContactSchema.index({ owner: 1, email: 1 }, { unique: true });

const SharedContact = mongoose.model("SharedContact", sharedContactSchema);
export default SharedContact;
