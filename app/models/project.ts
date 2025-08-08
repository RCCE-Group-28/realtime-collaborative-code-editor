import mongoose from "mongoose";

const FileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    content: { type: String, default: "" },
    type: { type: String, enum: ["file", "folder"], default: "file" },
    children: [{ type: mongoose.Schema.Types.Mixed }], // recursive folder/file
  },
  { _id: false },
);

const ProjectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    owner: { type: String, required: true }, // <-- Email string, required
    collaborators: [{ type: String }], // <-- Array of emails
    structure: { type: FileSchema, required: true },
  },
  { timestamps: true },
);

export default mongoose.models.Project ||
  mongoose.model("Project", ProjectSchema);
