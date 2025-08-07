"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Signup() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" }); // type: 'success' | 'error'
  const router = useRouter();

  const checkPasswordStrength = (password: string) => {
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    const lengthValid = password.length >= 8;

    const strengthCount = [hasUpper, hasLower, hasNumber, hasSymbol].filter(
      Boolean,
    ).length;

    if (lengthValid && strengthCount >= 3) return "Strong";
    if (password.length >= 6 && strengthCount >= 2) return "Medium";
    if (password.length > 0) return "Weak";
    return "";
  };

  const passwordStrength = checkPasswordStrength(form.password);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    if (form.password !== form.confirmPassword) {
      return setStatus({ type: "error", message: "Passwords do not match!" });
    }

    if (passwordStrength === "Weak") {
      return setStatus({
        type: "error",
        message: "Please choose a stronger password.",
      });
    }

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.username,
        email: form.email,
        password: form.password,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setStatus({
        type: "success",
        message: "Signup successful! Redirecting to login...",
      });
      setTimeout(() => router.push("/login"), 2000);
    } else {
      setStatus({ type: "error", message: data.error || "Signup failed" });
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
    <main className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md space-y-4 text-gray-800"
      >
        <h2 className="text-2xl font-semibold text-center text-purple-700">
          Create New Account
        </h2>

        {status.message && (
          <div
            className={`text-sm p-2 rounded text-center ${
              status.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {status.message}
          </div>
        )}

        <input
          type="text"
          name="username"
          placeholder="Username"
          onChange={handleChange}
          className="block w-full p-2 border rounded"
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          onChange={handleChange}
          className="block w-full p-2 border rounded"
          required
        />

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            onChange={handleChange}
            className="block w-full p-2 border rounded pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-2 text-gray-600"
            aria-label="Toggle Password Visibility"
          >
            <EyeIcon visible={showPassword} />
          </button>
        </div>

        {passwordStrength && (
          <p
            className={`text-sm font-semibold ${
              passwordStrength === "Strong"
                ? "text-green-600"
                : passwordStrength === "Medium"
                  ? "text-yellow-600"
                  : "text-red-600"
            }`}
          >
            Password strength: {passwordStrength}{" "}
            {passwordStrength !== "Strong" && (
              <span className="block text-xs font-normal text-gray-500">
                Use uppercase, lowercase, numbers & symbols
              </span>
            )}
          </p>
        )}

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="confirmPassword"
            placeholder="Confirm Password"
            onChange={handleChange}
            className="block w-full p-2 border rounded pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-2 text-gray-600"
            aria-label="Toggle Password Visibility"
          >
            <EyeIcon visible={showPassword} />
          </button>
        </div>

        <button
          type="submit"
          className="bg-purple-700 text-white p-2 rounded w-full hover:bg-purple-800 transition"
        >
          Sign Up
        </button>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <span
            onClick={() => router.push("/login")}
            className="text-purple-700 cursor-pointer hover:underline"
          >
            Log in
          </span>
        </p>
      </form>
    </main>
  );
}
