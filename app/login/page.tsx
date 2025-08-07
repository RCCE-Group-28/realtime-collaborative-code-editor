"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem(
        "user",
        JSON.stringify({ username: data.username, email: data.email }),
      );
      setStatus({
        type: "success",
        message: "Login successful! Redirecting...",
      });
      setTimeout(() => router.push("/projects"), 1500);
    } else {
      setStatus({ type: "error", message: data.error || "Login failed" });
    }
  };

  const EyeIcon = ({ visible }: { visible: boolean }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      {visible ? (
        <>
          <path d="M1 1l22 22" />
          <path d="M17.94 17.94A10.05 10.05 0 0 1 12 19c-5.05 0-9.27-3.18-10.61-7.5a10.05 10.05 0 0 1 4.13-5.34" />
          <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
          <path d="M12 5c5.05 0 9.27 3.18 10.61 7.5a10.05 10.05 0 0 1-1.78 2.84" />
        </>
      ) : (
        <>
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );

  return (
    <main className="min-h-screen flex justify-center items-center bg-gradient-to-br from-purple-600 to-indigo-700 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-lg rounded-xl p-8 space-y-4 w-full max-w-md text-gray-800"
      >
        <h2 className="text-2xl font-semibold text-center text-purple-700">
          Login
        </h2>

        {status && (
          <div
            className={`text-sm text-center p-2 rounded ${
              status.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {status.message}
          </div>
        )}

        <input
          type="email"
          name="email"
          placeholder="Email"
          onChange={handleChange}
          className="block w-full border p-2 rounded"
          required
        />

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            onChange={handleChange}
            className="block w-full border p-2 rounded pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute top-2 right-2 text-gray-600"
            aria-label="Toggle Password Visibility"
          >
            <EyeIcon visible={showPassword} />
          </button>
        </div>

        <button
          type="submit"
          className="w-full bg-purple-700 text-white py-2 rounded hover:bg-purple-800"
        >
          Login
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
