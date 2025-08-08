import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  //_id: { type: String, required: false },
  projects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }], // store project IDs
});

export default mongoose.models.User || mongoose.model("User", userSchema);
