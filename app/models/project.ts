// import mongoose, { Schema, Document } from "mongoose";

// export interface Member {
//   email: string;
//   role: "owner" | "editor";
// }

// export interface ProjectDocument extends Document {
//   title: string;
//   description?: string;
//   members: Member[]; // contains both owner + collaborators
//   structure: Record<string, unknown>; // Replaced 'any' with 'unknown' for better type safety
//   createdAt: Date;
//   updatedAt: Date;
// }

// const ProjectSchema = new Schema<ProjectDocument>(
//   {
//     title: { type: String, required: true },
//     description: { type: String },
//     members: [
//       {
//         email: { type: String, required: true },
//         role: { type: String, enum: ["owner", "editor"], required: true },
//       },
//     ],
//     structure: { type: Schema.Types.Mixed, default: {} }, // Ensure this matches the updated type
//   },
//   { timestamps: true },
// );

// export default mongoose.models.Project ||
//   mongoose.model<ProjectDocument>("Project", ProjectSchema);

import mongoose, { Schema, Document } from "mongoose";

export interface Member {
  email: string;
  username: string;
  role: "owner" | "editor";
}

export interface ChatMessage {
  senderEmail: string;
  senderUsername: string;
  message: string;
  timestamp: Date;
}

export interface ProjectDocument extends Document {
  title: string;
  description?: string;
  members: Member[];
  structure: Record<string, unknown>;
  chats: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema = new Schema<ChatMessage>(
  {
    senderEmail: { type: String, required: true },
    senderUsername: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const MemberSchema = new Schema<Member>(
  {
    email: { type: String, required: true },
    username: { type: String, required: true },
    role: { type: String, enum: ["owner", "editor"], required: true },
  },
  { _id: false },
);

const ProjectSchema = new Schema<ProjectDocument>(
  {
    title: { type: String, required: true },
    description: { type: String },
    members: { type: [MemberSchema], required: true },
    structure: { type: Schema.Types.Mixed, default: {} },
    chats: { type: [ChatSchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.models.Project ||
  mongoose.model<ProjectDocument>("Project", ProjectSchema);
