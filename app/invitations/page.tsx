"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function InvitationsPage() {
  const [user, setUser] = useState<{ username: string; email: string } | null>(
    null,
  );
  const [showPopup, setShowPopup] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!token || !userData) {
      router.push("/");
    } else {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  return (
    <div className="flex min-h-screen font-sans text-lg">
      {/* Sidebar */}
      <aside className="w-64 bg-purple-700 text-white p-6 shadow-lg">
        <h1 className="text-4xl font-extrabold mb-10 tracking-wide">RCCE</h1>
        <nav className="space-y-4">
          <button
            onClick={() => router.push("/projects")}
            className="block w-full text-left px-3 py-2 rounded-lg hover:bg-purple-500 font-bold"
          >
            Projects
          </button>
          <button
            onClick={() => router.push("/invitations")}
            className="block w-full text-left px-3 py-2 rounded-lg hover:bg-purple-500 bg-purple-500 font-bold"
          >
            Invitations
          </button>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col bg-gray-50 relative">
        {/* Topbar */}
        <header className="bg-purple-100 shadow p-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-purple-800 tracking-wide">
            Invitations
          </h2>
          <div
            className="relative"
            onMouseEnter={() => setShowPopup(true)}
            onMouseLeave={() => setShowPopup(false)}
          >
            <div className="w-11 h-11 bg-purple-600 text-white flex items-center justify-center rounded-full cursor-pointer text-xl font-bold">
              {user?.username?.charAt(0)?.toUpperCase() || "U"}
            </div>
            {showPopup && user && (
              <div className="absolute right-0 mt-2 w-56 bg-white shadow-lg rounded-lg p-4 text-sm z-50 border border-gray-200">
                <p className="font-semibold text-gray-800">{user.username}</p>
                <p className="font-semibold text-gray-800">{user.email}</p>
                <button
                  className="w-full bg-red-500 text-white py-1.5 rounded hover:bg-red-600 font-medium"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Invitation Table */}
        <main className="flex-1 p-8">
          <div className="w-full overflow-x-auto">
            <div className="grid grid-cols-5 font-semibold text-left text-gray-700 border-b pb-2 mb-4">
              <div>Title</div>
              <div>Invitor</div>
              <div>Time Left</div>
              <div>Accept</div>
              <div>Decline</div>
            </div>

            {[1, 2, 3].map((invitation) => (
              <div
                key={invitation}
                className="grid grid-cols-5 items-center gap-4 bg-white p-4 mb-4 rounded-lg shadow-sm border hover:shadow transition"
              >
                <div className="text-gray-800 font-medium">
                  Invitation {invitation}
                </div>
                <div className="text-gray-600">User {invitation}</div>
                <div className="text-gray-500">{24 - invitation} hrs</div>
                <button
                  className="w-8 h-8 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center text-sm font-bold"
                  title="Accept"
                >
                  ✓
                </button>
                <button
                  className="w-8 h-8 bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center text-sm font-bold"
                  title="Decline"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
