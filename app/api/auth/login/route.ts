import { NextResponse } from "next/server";
import { loginUser } from "@/app/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  try {
    const { token, username } = await loginUser(email, password);
    return NextResponse.json(
      { message: "Login successful", token, username, email },
      { status: 200 },
    );
  } catch (err: unknown) {
    const errorMessage =
      typeof err === "object" && err !== null && "message" in err
        ? (err as { message: string }).message
        : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
