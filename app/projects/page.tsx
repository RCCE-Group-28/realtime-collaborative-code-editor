"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProjectsPage() {
  const [user, setUser] = useState<{ username: string; email: string } | null>(
    null,
  );
  const [showPopup, setShowPopup] = useState(false);
  const router = useRouter();
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!token || !userData) {
      router.push("/");
    } else {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setShowPopup(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
            className="block w-full text-left px-3 py-2 rounded-lg hover:bg-purple-500 bg-purple-500 font-bold"
          >
            Projects
          </button>
          <button
            onClick={() => router.push("/invitations")}
            className="block w-full text-left px-3 py-2 rounded-lg hover:bg-purple-500 font-bold"
          >
            Invitations
          </button>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col bg-gray-50 relative">
        {/* Topbar */}
        <header className="bg-purple-100 shadow p-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-purple-800 tracking-wide">
            Projects
          </h2>

          {/* User Icon & Popup */}
          <div
            className="relative"
            ref={popupRef}
            onMouseEnter={() => {
              if (!showPopup) setShowPopup(true);
            }}
          >
            <div
              className="w-11 h-11 bg-purple-600 text-white flex items-center justify-center rounded-full cursor-pointer text-xl font-bold"
              onClick={() => setShowPopup((prev) => !prev)}
            >
              {user?.username?.charAt(0)?.toUpperCase() || "U"}
            </div>

            {showPopup && user && (
              <div
                className="absolute right-0 mt-2 w-56 bg-white shadow-lg rounded-lg p-4 text-sm z-50 border border-gray-200"
                onMouseEnter={() => setShowPopup(true)}
                onMouseLeave={() => setShowPopup(false)}
              >
                <p className="font-semibold text-gray-800">{user.username}</p>
                <p className="font-semibold text-gray-800">{user.email}</p>
                <button
                  className="w-full bg-red-500 text-white py-1.5 rounded hover:bg-red-600 font-medium mt-2"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Floating create button */}
        <div className="absolute bottom-8 right-8">
          <div className="group relative">
            <button
              onClick={() => alert("Open create project modal")}
              className="w-14 h-14 bg-purple-700 text-white text-3xl rounded-full shadow-lg hover:bg-purple-800 focus:outline-none flex items-center justify-center"
            >
              +
            </button>
            <div className="absolute bottom-16 right-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-black text-white text-xs px-2 py-1 rounded">
              Create New Project
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 px-8 py-6">
          <div className="mb-6 flex items-center gap-3">
            <input
              type="text"
              placeholder="Search projects..."
              className="p-3 border border-gray-300 rounded-lg w-1/2 text-gray-700 focus:outline-purple-500 bg-white shadow-sm"
            />
            <button className="px-5 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold">
              Search
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((project) => (
              <div
                key={project}
                className="bg-white p-4 shadow-lg rounded-lg space-y-2 border border-gray-100 hover:shadow-xl transition"
              >
                <h3 className="font-bold text-xl text-purple-800">
                  Project Title {project}
                </h3>
                <p className="text-sm text-gray-700">Owner: User {project}</p>
                <p className="text-xs text-gray-500">Last Modified: Today</p>
                <div className="pt-2">
                  <button
                    className="bg-purple-600 text-white rounded-lg px-4 py-1 hover:bg-purple-700 font-medium"
                    onClick={() =>
                      window.open(`/projects/${project}`, "_blank")
                    }
                  >
                    Open
                  </button>
                  <button className="ml-4 text-purple-600 underline hover:text-blue-900 font-medium">
                    More
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
