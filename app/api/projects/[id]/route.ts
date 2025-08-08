import { NextRequest, NextResponse } from "next/server";
import connectDB from "../../../lib/mongoose";
import Project from "../../../models/project";

interface Props {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: Props) {
  await connectDB();
  const project = await Project.findById(params.id).lean();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}

export async function POST(req: NextRequest, { params }: Props) {
  await connectDB();

  const { structure } = await req.json();

  if (!structure) {
    return NextResponse.json(
      { error: "Project structure is required" },
      { status: 400 },
    );
  }

  try {
    const updated = await Project.findByIdAndUpdate(
      params.id,
      { structure },
      { new: true },
    );

    if (!updated) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Project updated" });
  } catch (error) {
    console.error("Failed to update project", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
