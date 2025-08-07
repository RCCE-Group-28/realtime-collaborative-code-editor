"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "./actions";
import { useActionState } from "react";

export default function Login() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, isPending] = useActionState(loginAction, {
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      router.push("/dashboard");
    }
  }, [state.success, router]);

  return (
    <main className="min-h-screen flex justify-center items-center bg-gradient-to-br from-purple-600 to-indigo-700 px-4">
      <form
        action={formAction}
        className="bg-white shadow-lg rounded-xl p-8 space-y-4 w-full max-w-md text-gray-800"
      >
        <h2 className="text-2xl font-semibold text-center text-purple-700">
          Login
        </h2>

        <input
          type="email"
          name="email"
          placeholder="Email"
          className="block w-full border p-2 rounded"
          required
        />

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            className="block w-full border p-2 rounded"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute top-2 right-2"
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>

        {state.message && (
          <>
            {state.success ? (
              <p className="text-green-600 text-sm text-center">
                {state.message}
              </p>
            ) : (
              <p className="text-red-600 text-sm text-center">
                {state.message}
              </p>
            )}
          </>
        )}

        <button
          className="w-full bg-purple-700 text-white py-2 rounded hover:bg-purple-800 disabled:opacity-50"
          disabled={isPending}
        >
          {isPending ? "Logging in..." : "Login"}
        </button>

        <p className="text-center text-sm text-gray-600">
          Don’t have an account?{" "}
          <span
            onClick={() => router.push("/signup")}
            className="text-purple-700 cursor-pointer underline"
          >
            Sign Up
          </span>
        </p>
      </form>
    </main>
  );
}
