"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateProjectPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [newCollaborator, setNewCollaborator] = useState("");

  // Example: fetch ownerEmail from localStorage or auth here
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setOwnerEmail(user.email);
    }
  }, []);

  const handleAddCollaborator = () => {
    if (
      newCollaborator.trim() &&
      !collaborators.includes(newCollaborator.trim())
    ) {
      setCollaborators([...collaborators, newCollaborator.trim()]);
      setNewCollaborator("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, ownerEmail, collaborators }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/editor/${data.projectId}`);
    } else {
      const errorData = await res.json();
      alert(errorData.error || "Failed to create project");
    }
  };

  return (
    <main className="min-h-screen flex justify-center items-center bg-gradient-to-br from-purple-600 to-indigo-700 px-4">
      <form
        onSubmit={handleSubmit}
        className="max-w-md w-full space-y-6 bg-white p-8 rounded-xl shadow-lg text-gray-800"
      >
        <h1 className="text-2xl font-bold text-center text-purple-700">
          Create New Project
        </h1>

        <div>
          <label className="block mb-1 font-medium">Project Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Enter project title"
            className="w-full border border-gray-300 rounded px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Owner Email</label>
          <input
            type="email"
            value={ownerEmail}
            readOnly
            placeholder="Owner email"
            className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-gray-600"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">
            Collaborators (Emails)
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="email"
              value={newCollaborator}
              onChange={(e) => setNewCollaborator(e.target.value)}
              placeholder="Enter collaborator email"
              className="flex-grow border border-gray-300 rounded px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="button"
              onClick={handleAddCollaborator}
              className="bg-purple-600 text-white px-4 rounded hover:bg-purple-700 transition"
            >
              Add
            </button>
          </div>
          <ul className="list-disc pl-5 text-gray-700">
            {collaborators.map((email, idx) => (
              <li key={idx}>{email}</li>
            ))}
          </ul>
        </div>

        <button
          type="submit"
          className="w-full bg-purple-700 text-white py-2 rounded hover:bg-purple-800 transition"
        >
          Create Project
        </button>
      </form>
    </main>
  );
}
