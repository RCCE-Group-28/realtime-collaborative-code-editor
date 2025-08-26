import { NextResponse } from "next/server";
import { loginUser } from "@/app/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const { token, username } = await loginUser(email, password);

    return NextResponse.json({
      message: "Login successful",
      token,
      username,
      email,
    });
  } catch (err: unknown) {
    const errorMessage =
      typeof err === "object" && err !== null && "message" in err
        ? (err as { message: string }).message
        : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
