import { NextRequest, NextResponse } from "next/server";
import connectDB from "../../lib/mongoose";
import Project from "../../models/project";
import User from "../../models/User";
import Invitation from "../../models/Invitation";
import sendEmail from "@/app/lib/email";

// POST: Create a new project
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { title, description, ownerEmail, collaborators } = await req.json();

    if (!title || !ownerEmail) {
      return NextResponse.json(
        { error: "Title and owner email are required" },
        { status: 400 },
      );
    }

    // Remove ownerEmail from collaborators if present
    const filteredCollaborators: string[] = Array.isArray(collaborators)
      ? collaborators.filter((email: string) => email && email !== ownerEmail)
      : [];

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
              content: `console.log(\"Hello World\");`,
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

    const newProject = await Project.create({
      title,
      description: description || "",
      owner: ownerEmail,
      collaborators: [],
      members: [
        {
          email: ownerEmail,
          username: ownerEmail.split("@")[0],
          role: "owner",
        },
      ],
      structure: defaultStructure,
    });

    await User.findOneAndUpdate(
      { email: ownerEmail },
      { $addToSet: { projects: newProject._id } },
      { upsert: true },
    );

    // Send invitations if any
    if (filteredCollaborators.length > 0) {
      for (const collabEmail of filteredCollaborators) {
        const invitation = await Invitation.create({
          projectId: newProject._id,
          projectTitle: title,
          ownerEmail,
          collaboratorEmail: collabEmail,
        });

        const appBaseUrl =
          process.env.NEXT_PUBLIC_APP_URL ||
          process.env.VERCEL_URL ||
          "http://localhost:3000";
        // Unique invitation link with invitation ID as token
        const inviteUrl = `${appBaseUrl}/invitations/accept?token=${invitation._id}`;
        await sendEmail({
          to: collabEmail,
          subject: `Invitation to Collaborate on "${title}"`,
          text: `You have been invited by ${ownerEmail} to collaborate on the project "${title}". Click the link to accept: ${inviteUrl}`,
          html: `<p>You have been invited by <strong>${ownerEmail}</strong> to collaborate on the project <strong>${title}</strong>.</p><p>Click <a href="${inviteUrl}">here</a> to accept the invitation.</p>`,
        });
      }
    }

    return NextResponse.json({
      message: "Project created successfully",
      projectId: newProject._id,
    });
  } catch (error) {
    console.error("Error in /api/projects POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET: fetch projects where user is member
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get("userEmail");
    if (!userEmail) return NextResponse.json([], { status: 400 });

    const projects = await Project.find({ "members.email": userEmail }).lean();

    const projectsWithOwner = projects.map((p) => ({
      ...p,
      owner:
        p.members.find(
          (m: { email: string; role: string }) => m.role === "owner",
        )?.email || "",
      collaborators: p.members
        .filter((m: { email: string; role: string }) => m.role === "editor")
        .map((m: { email: string }) => m.email),
    }));

    return NextResponse.json(projectsWithOwner);
  } catch (err) {
    console.error("Project GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
