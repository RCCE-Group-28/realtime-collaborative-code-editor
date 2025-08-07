"use server";
import { loginUser } from "@/app/lib/auth";
import { cookies } from "next/headers";

type LoginActionState = {
  success: boolean;
  message?: string;
};

export async function loginAction(
  _currentState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const cookieStore = await cookies();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  try {
    const { token } = await loginUser(email, password);
    cookieStore.set("token", token, {
      httpOnly: true,
      secure: true,
      path: "/",
    });
    return { success: true, message: "Login successful" };
  } catch (err: unknown) {
    return {
      success: false,
      message: (err as Error)?.message || "Login failed with an unknown error",
    };
  }
}
