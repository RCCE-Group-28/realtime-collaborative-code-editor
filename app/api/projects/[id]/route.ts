import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/mongoose";
import Project from "@/app/models/project";

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(_req: NextRequest, context: RouteContext) {
  await connectDB();
  const { id } = context.params;
  const project = await Project.findById(id).lean();
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}

type UpdateProjectBody = {
  title?: string;
  description?: string;
  structure?: FileEntity;
};

type FileEntity = {
  name: string;
  type: "file" | "folder";
  children?: FileEntity[];
  content?: string | null;
};

export async function PUT(req: NextRequest, context: RouteContext) {
  await connectDB();
  const { id } = context.params;
  const body: UpdateProjectBody = await req.json();

  const update: UpdateProjectBody = {};
  if (body.title !== undefined) update.title = body.title;
  if (body.description !== undefined) update.description = body.description;
  if (body.structure !== undefined) update.structure = body.structure;

  const project = await Project.findByIdAndUpdate(id, update, {
    new: true,
  }).lean();
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}

export async function POST(req: NextRequest, context: RouteContext) {
  await connectDB();
  const { id } = context.params;
  const { senderEmail, senderUsername, message } = await req.json();

  const project = await Project.findById(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const chatMsg = {
    senderEmail,
    senderUsername,
    message,
    timestamp: new Date(),
  };
  project.chats.push(chatMsg);
  await project.save();

  return NextResponse.json(chatMsg);
}
