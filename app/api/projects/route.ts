import { NextRequest, NextResponse } from "next/server";
import connectDB from "../../lib/mongoose";
import Project from "../../models/project";
import User from "../../models/User";

export async function POST(req: NextRequest) {
  await connectDB();

  const { title, ownerEmail, collaborators } = await req.json();

  if (!title || !ownerEmail) {
    return NextResponse.json(
      { error: "Title and owner email are required" },
      { status: 400 },
    );
  }

  const defaultStructure = {
    name: "root",
    type: "folder",
    children: [
      {
        name: "src",
        type: "folder",
        children: [
          {
            name: "index.js",
            type: "file",
            content: `// Start coding here\nconsole.log("Hello World");`,
          },
        ],
      },
      {
        name: "README.md",
        type: "file",
        content: "# New Project\nWelcome to your new project!",
      },
    ],
  };

  try {
    const newProject = await Project.create({
      title,
      owner: ownerEmail,
      collaborators: Array.isArray(collaborators) ? collaborators : [],
      structure: defaultStructure,
    });

    // Update owner
    await User.findOneAndUpdate(
      { email: ownerEmail },
      { $addToSet: { projects: newProject._id } },
    );

    // Update collaborators
    if (Array.isArray(collaborators) && collaborators.length > 0) {
      await User.updateMany(
        { email: { $in: collaborators } },
        { $addToSet: { projects: newProject._id } },
      );
    }

    return NextResponse.json({
      message: "Project created successfully",
      projectId: newProject._id,
    });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const userEmail = searchParams.get("userEmail");

  let projects;
  if (userEmail) {
    projects = await Project.find({
      $or: [{ owner: userEmail }, { collaborators: userEmail }],
    });
  } else {
    projects = await Project.find();
  }

  return NextResponse.json(projects);
}
