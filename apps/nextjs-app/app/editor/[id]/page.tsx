"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import Editor from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useParams } from "next/navigation";
import { VscComment } from "react-icons/vsc";
import { VscGitCommit, VscHistory, VscGitMerge } from "react-icons/vsc";
import { Bot } from "lucide-react";

import type {
  ChatMessage,
  NodeAddedPayload,
  NodeDeletedPayload,
} from "./types";

import { useUser } from "./hooks/useUser";
import { useSocket } from "./hooks/useSocket";
import { useFileTree } from "./hooks/useFileTree";
import { useYjs } from "./hooks/useYjs";
import { useMonaco } from "./hooks/useMonaco";

import { addNode, deleteNode, reconstructTree } from "./utils/fileTreeHelpers";
import { FileTree } from "./components/FileTree";
import { ChatPanel } from "./components/ChatPanel";
import { AiChatPanel } from "./components/AiChatPanel";
import VersionControlPanel from "./components/versioncontrol";
import { ResizablePanel } from "./components/ResizablePanel";
import GitHubIntegrationPanel from "./components/GitHubIntegrationPanel";
import { ToastContainer, type ToastMessage } from "./components/Toast";

// --- Modern Toast Implementation ---
type UseToastReturn = {
  toasts: ToastMessage[];
  showToast: (message: string, type: "success" | "error" | "info") => void;
  dismissToast: (id: string) => void;
};

const useToast = (): UseToastReturn => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
};

type StructureNode = {
  name: string;
  type: "file" | "folder";
  content?: string;
  children?: StructureNode[];
};

type GitCommit = {
  hash: string;
  message: string;
  author: string;
  date: string;
};

type GitStatus = {
  commits: GitCommit[];
  // Add other properties as needed
};

export default function EditorPage() {
  const { id: projectId } = useParams() as { id: string };
  useMonaco();

  const user = useUser();
  const { toasts, showToast, dismissToast } = useToast();

  const {
    socket,
    chatMessages,
    emitNodeAdded,
    emitNodeDeleted,
    emitChatMessage,
  } = useSocket(projectId);

  const [activeFile, setActiveFile] = useState<string>("");
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [chatOpen, setChatOpen] = useState(false);
  const [vcOpen, setVcOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<string>("main");
  const [forceRefresh, setForceRefresh] = useState<number>(0);
  const [panelWidth, setPanelWidth] = useState(320);

  // Tab management functions
  const openFileInTab = useCallback((filePath: string) => {
    setOpenTabs((prev) => {
      if (!prev.includes(filePath)) {
        return [...prev, filePath];
      }
      return prev;
    });
    setActiveFile(filePath);
  }, []);

  const closeTab = useCallback(
    (filePath: string, event?: React.MouseEvent) => {
      event?.stopPropagation();
      setOpenTabs((prev) => {
        const newTabs = prev.filter((tab) => tab !== filePath);
        // If closing the active tab, switch to another tab or clear active file
        if (activeFile === filePath) {
          const currentIndex = prev.indexOf(filePath);
          if (newTabs.length > 0) {
            const nextIndex = Math.min(currentIndex, newTabs.length - 1);
            setActiveFile(newTabs[nextIndex]);
          } else {
            setActiveFile("");
          }
        }
        return newTabs;
      });
    },
    [activeFile],
  );

  const switchToTab = useCallback((filePath: string) => {
    setActiveFile(filePath);
  }, []);

  // New UI state variables
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showGitPanel, setShowGitPanel] = useState(false);
  const [gitStatus] = useState<GitStatus | null>(null);

  const {
    fileTree,
    setFileTree,
    initialFiles,
    filesRef,
    projectTitle,
    getFirstFile,
    isLoading,
    // fetchProjectForBranch, // Expose the fetch function
  } = useFileTree(projectId);

  // CRITICAL: Pass currentBranch to useYjs - only after loading completes
  const { presence, setEditor, setMonaco } = useYjs(
    isLoading ? "" : activeFile, // Don't initialize Yjs until files are loaded
    user,
    projectId,
    initialFiles,
    filesRef.current,
    currentBranch,
    forceRefresh,
  );

  // Responsive handling
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      // Auto-hide panels on very small screens
      if (width < 1024 && (chatOpen || vcOpen || showGitPanel || aiChatOpen)) {
        setChatOpen(false);
        setVcOpen(false);
        setShowGitPanel(false);
        setAiChatOpen(false);
      }
      // Auto-collapse sidebar on small screens
      if (width < 640) {
        setSidebarCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [chatOpen, vcOpen, showGitPanel, aiChatOpen]);

  // Force editor to reload when activeFile, filesRef, OR currentBranch changes
  const [editorKey, setEditorKey] = useState(0);
  const [editorMounting, setEditorMounting] = useState(false);

  // ---- Build structure from current editor state ----
  const buildStructure = useCallback((): StructureNode | null => {
    try {
      const root = reconstructTree(fileTree, "", filesRef.current)[0];
      return root as StructureNode;
    } catch (err) {
      console.error("buildStructure error", err);
      showToast("Failed to build project structure.", "error");
      return null;
    }
  }, [fileTree, filesRef, showToast]);

  // ---- Apply structure to editor (complete replacement) ----
  const applyStructureToEditor = useCallback(
    (structure: StructureNode | null) => {
      // Handle null structure (branch switch signal - clear editor)
      if (!structure) {
        console.log(" Clearing editor for branch switch");
        setActiveFile(""); // This triggers Yjs cleanup
        setEditorMounting(true);
        return;
      }

      console.log(" Applying structure to editor:", structure);

      // Step 1: Clear active file to trigger Yjs cleanup
      setActiveFile("");

      // Step 2: Wait for cleanup to complete
      setTimeout(() => {
        // Full hard reset
        setFileTree([]);
        filesRef.current = {};
        setExpandedFolders(new Set());

        const newFilesRef: Record<string, string> = {};
        const newExpanded = new Set<string>();

        const traverse = (node: StructureNode, path: string) => {
          const fullPath = path ? `${path}/${node.name}` : node.name;
          if (node.type === "file") {
            newFilesRef[fullPath] = node.content ?? "";
          } else if (node.type === "folder" && node.children) {
            newExpanded.add(fullPath);
            node.children.forEach((child) => traverse(child, fullPath));
          }
        };

        if (structure.type === "folder" && Array.isArray(structure.children)) {
          traverse(structure, "");
        }

        // Apply all changes
        filesRef.current = newFilesRef;
        setFileTree([structure]);
        setExpandedFolders(newExpanded);

        console.log(
          ` Applied structure: ${Object.keys(newFilesRef).length} files`,
        );

        // Step 3: Set new active file after a delay and trigger force refresh
        setTimeout(() => {
          const firstFile = Object.keys(newFilesRef)[0];
          if (firstFile) {
            setActiveFile(firstFile);
            // Trigger force refresh to ensure Yjs uses the new content
            setForceRefresh(Date.now());
            // Safer editor reload
            setEditorMounting(true);
            setTimeout(() => {
              setEditorKey((prev) => prev + 1);
              setEditorMounting(false);
            }, 50);
            console.log(
              `📄 Active file set to: ${firstFile} with force refresh`,
            );
          }
          showToast("Project structure updated.", "success");
        }, 100);
      }, 100);
    },
    [setFileTree, filesRef, showToast, setForceRefresh],
  );

  // ---- Load current branch on mount ----
  useEffect(() => {
    if (isLoading) return; // Wait for initial load to complete

    const loadCurrentBranch = async () => {
      try {
        const res = await fetch(
          `/api/projects/${projectId}/version-control/branch`,
        );
        if (res.ok) {
          const data = await res.json();
          const branch = data.activeBranch || "main";
          console.log(` Setting current branch to: ${branch}`);
          setCurrentBranch(branch);
        }
      } catch (err) {
        console.error("Failed to load current branch:", err);
      }
    };
    loadCurrentBranch();
  }, [projectId, isLoading]);

  // ---- Check for vc_load flag ----
  useEffect(() => {
    const checkVcLoad = () => {
      try {
        const item = localStorage.getItem(`vc_load:${projectId}`);
        if (item) {
          const parsed = JSON.parse(item);
          const structure = parsed.structure as StructureNode | undefined;
          const branch = parsed.branch as string | undefined;

          if (structure) {
            if (branch && branch !== currentBranch) {
              setCurrentBranch(branch);
            }
            // Small delay to ensure branch state is updated
            setTimeout(() => {
              applyStructureToEditor(structure);
              showToast(
                parsed.message || "Loaded changes from version control.",
                "success",
              );
            }, 100);
          }

          localStorage.removeItem(`vc_load:${projectId}`);
        }
      } catch (err) {
        console.error("Error checking vc_load:", err);
      }
    };

    checkVcLoad();
    const interval = setInterval(checkVcLoad, 500);
    return () => clearInterval(interval);
  }, [projectId, currentBranch, applyStructureToEditor, showToast]);

  // ---- Socket handlers ----
  useEffect(() => {
    if (!socket) return;

    const handleNodeAdded = (payload: NodeAddedPayload) => {
      setFileTree((prev) => addNode(prev, payload));
      if (payload.type === "file") {
        const filePath = `${payload.parentPath}/${payload.name}`;
        filesRef.current[filePath] = "";
        openFileInTab(filePath);
      }
      setExpandedFolders((p) => {
        const n = new Set(p);
        n.add(payload.parentPath);
        return n;
      });
    };

    const handleNodeDeleted = (payload: NodeDeletedPayload) => {
      if (payload.path === "root") {
        showToast("Root cannot be deleted.", "error");
        return;
      }
      setFileTree((prev) => deleteNode(prev, payload));
      delete filesRef.current[payload.path];
      if (activeFile === payload.path) {
        const remainingFiles = Object.keys(filesRef.current);
        setActiveFile(remainingFiles.length > 0 ? remainingFiles[0] : "");
      }
    };

    socket.on("node-added", handleNodeAdded);
    socket.on("node-deleted", handleNodeDeleted);

    return () => {
      socket.off("node-added", handleNodeAdded);
      socket.off("node-deleted", handleNodeDeleted);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, setFileTree, filesRef, showToast]);

  // ---- Save project ----
  const handleSaveProject = useCallback(async () => {
    if (!projectId) return;
    const structure = buildStructure();
    if (!structure) return;

    try {
      if (currentBranch === "main") {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ structure }),
        });
        if (res.ok) {
          showToast("Project saved to main.", "success");
          localStorage.removeItem(`vc_autosave:${projectId}:main`);
        } else {
          showToast("Save to main failed.", "error");
        }
      } else {
        const res = await fetch(
          `/api/projects/${projectId}/version-control/branch/update`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ branchName: currentBranch, structure }),
          },
        );
        if (res.ok) {
          showToast(
            `Working copy saved to branch "${currentBranch}".`,
            "success",
          );
          localStorage.removeItem(`vc_autosave:${projectId}:${currentBranch}`);
        } else {
          const data = await res.json();
          showToast(data.error || "Branch working copy save failed.", "error");
        }
      }
    } catch (err) {
      console.error("handleSaveProject error", err);
      showToast("An unexpected error occurred during save.", "error");
    }
  }, [projectId, currentBranch, buildStructure, showToast]);

  // ---- Autosave to localStorage every 10s ----
  useEffect(() => {
    let mounted = true;
    const interval = setInterval(() => {
      if (!mounted) return;
      try {
        const structure = buildStructure();
        if (!structure) return;
        localStorage.setItem(
          `vc_autosave:${projectId}:${currentBranch}`,
          JSON.stringify({ structure, updatedAt: Date.now() }),
        );
      } catch (err) {
        console.error("Autosave error:", err);
      }
    }, 10000);
    return () => {
      clearInterval(interval);
      mounted = false;
    };
  }, [projectId, currentBranch, buildStructure]);

  // ---- Warn on unload ----
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      try {
        const prefix = `vc_autosave:${projectId}:`;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            e.preventDefault();
            e.returnValue = "";
            return "";
          }
        }
      } catch {}
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [projectId]);

  // ---- Editor mount ----
  const handleMount = useCallback(
    (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
      console.log("🎯 Monaco Editor mounted");
      setEditor(editor);
      setMonaco(monaco);

      // Add error handler to prevent crashes
      if (editor) {
        editor.onDidDispose(() => {
          console.log("📤 Monaco Editor disposed");
          setEditor(null);
          setMonaco(null);
        });
      }
    },
    [setEditor, setMonaco],
  ); // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => {
      console.log(" Editor page unmounting");
      // Cleanup will be handled by useYjs
    };
  }, []);

  // ---- Set initial active file ----
  useEffect(() => {
    if (isLoading || fileTree.length === 0 || activeFile) return;

    const firstFile = getFirstFile();
    if (firstFile) {
      console.log(` Setting initial active file: ${firstFile}`);
      openFileInTab(firstFile);
      if (fileTree[0] && fileTree[0].name) {
        setExpandedFolders(new Set([fileTree[0].name]));
      }
    }
  }, [fileTree, activeFile, getFirstFile, isLoading, openFileInTab]);

  // ---- Node operations ----
  const handleAddNode = useCallback(
    (type: "file" | "folder", parentPath: string) => {
      const name = prompt(`Enter ${type} name`);
      if (!name) {
        showToast("Operation cancelled.", "error");
        return;
      }

      setFileTree((p) => addNode(p, { type, parentPath, name }));
      const newPath = `${parentPath}/${name}`;

      if (type === "file") {
        filesRef.current[newPath] = "";
        openFileInTab(newPath);
      }

      setExpandedFolders((p) => {
        const n = new Set(p);
        n.add(parentPath);
        return n;
      });

      emitNodeAdded({ type, parentPath, name });
      showToast(
        `${type === "file" ? "File" : "Folder"} "${name}" added.`,
        "success",
      );
    },
    [setFileTree, filesRef, emitNodeAdded, showToast, openFileInTab],
  );

  const handleDeleteNode = useCallback(
    (path: string) => {
      if (path === "root") {
        showToast("Root cannot be deleted.", "error");
        return;
      }
      if (!confirm(`Delete ${path}? This action cannot be undone.`)) return;

      setFileTree((p) => deleteNode(p, { path }));
      emitNodeDeleted({ path });
      delete filesRef.current[path];

      if (activeFile === path) {
        const remainingFiles = Object.keys(filesRef.current);
        if (remainingFiles.length > 0) {
          const nextFile = remainingFiles[0];
          setActiveFile(nextFile);
        } else {
          setActiveFile("");
        }
      }
      // Close the tab for the deleted file
      closeTab(path);
      showToast(`Deleted ${path}.`, "success");
    },
    [setFileTree, emitNodeDeleted, filesRef, activeFile, showToast, closeTab],
  );

  const handleSendChatMessage = useCallback(
    (message: ChatMessage) => {
      // Only emit via socket - the socket server will save to DB and broadcast
      emitChatMessage(message);
    },
    [emitChatMessage],
  );

  const handleRestoreCommit = useCallback(
    async (commitHash: string) => {
      if (
        !user?.email ||
        !confirm(
          "Are you sure you want to restore this commit? This will overwrite your current changes.",
        )
      ) {
        return;
      }

      try {
        showToast("Restoring commit...", "success");

        const response = await fetch(
          `/api/projects/${projectId}/version-control/restore`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userEmail: user.email,
              commitHash,
              branch: currentBranch,
            }),
          },
        );

        if (response.ok) {
          const data = await response.json();

          // Apply the restored structure to the editor
          if (data.structure) {
            applyStructureToEditor(data.structure);
          }

          showToast(
            `Successfully restored commit ${commitHash.substring(0, 7)}`,
            "success",
          );
        } else {
          const error = await response.json();
          showToast(error.error || "Failed to restore commit", "error");
        }
      } catch (error) {
        console.error("Restore commit error:", error);
        showToast("Failed to restore commit", "error");
      }
    },
    [projectId, user?.email, currentBranch, showToast, applyStructureToEditor],
  );

  return (
    <div className="flex h-screen bg-background text-gray-200 overflow-hidden">
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Sidebar - File Tree */}
      <aside
        className={`${
          sidebarCollapsed ? "w-12" : "w-64"
        } bg-sidebar border-r border-gray-700 flex flex-col transition-all duration-300 ease-in-out ${
          isMobile && (chatOpen || vcOpen || showGitPanel) ? "hidden" : ""
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 flex items-center justify-center min-h-[60px] relative bg-card">
          {!sidebarCollapsed && (
            <h2 className="text-lg font-bold truncate text-center bg-gradient-primary bg-clip-text text-transparent">
              {projectTitle}
            </h2>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute right-4 p-1 hover:bg-gray-700 rounded transition-colors"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={sidebarCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
              />
            </svg>
          </button>
        </div>

        {/* File Tree Content */}
        <div className="flex-[2] overflow-hidden p-3 bg-sidebar/30 rounded-lg mx-2 mb-2">
          {!sidebarCollapsed && (
            <div className="h-full">
              <FileTree
                fileTree={fileTree}
                setFileTree={setFileTree}
                activeFile={activeFile}
                setActiveFile={openFileInTab}
                expandedFolders={expandedFolders}
                setExpandedFolders={setExpandedFolders}
                onAddNode={handleAddNode}
                onDeleteNode={handleDeleteNode}
              />
            </div>
          )}
        </div>

        {/* Online Users Section */}
        <div className="flex-[1] overflow-y-auto p-3 border-t border-gray-700/50 bg-sidebar/50 mx-2 mt-2 rounded-lg">
          {!sidebarCollapsed && (
            <>
              <div className="mb-2">
                <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                  Online Users
                </h4>
              </div>
              <div className="space-y-2 h-full overflow-y-auto">
                {presence && presence.length > 0 ? (
                  presence.map((userPresence) => {
                    const displayName =
                      userPresence.user?.name ||
                      (userPresence.user?.email
                        ? userPresence.user.email.split("@")[0]
                        : "Unknown");
                    return (
                      <div
                        key={userPresence.clientId}
                        className="flex items-center gap-2 bg-gray-700/50 border border-gray-600 rounded-lg p-2 hover:border-gray-500 transition-colors"
                      >
                        <div
                          className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"
                          title={`${displayName} is online`}
                        ></div>
                        <span className="text-xs text-gray-300 font-medium truncate">
                          {displayName}
                        </span>
                        {userPresence.cursor && (
                          <span className="text-xs text-gray-500 ml-auto">
                            L{userPresence.cursor.line}
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-gray-400 italic text-center py-2">
                    No users online
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Fixed Navigation Bar with Tabs */}
        <div className="bg-card border-b border-gray-700 flex-shrink-0 min-h-[48px]">
          {/* Combined Tab Bar and Action Bar */}
          <div className="flex items-center justify-between px-4 py-2 min-h-[44px]">
            {/* Left side: Mobile menu + Tab Bar */}
            <div className="flex items-center flex-1 min-w-0">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="md:hidden p-2 hover:bg-gray-700 rounded-lg transition-colors mr-2"
                title="Toggle sidebar"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>

              {/* Tab Bar */}
              <div className="flex items-center min-h-[40px] overflow-x-auto flex-1 gap-1">
                {openTabs.map((filePath) => {
                  const fileName = filePath.split("/").pop() || filePath;
                  const isActive = activeFile === filePath;
                  return (
                    <div
                      key={filePath}
                      className={`group flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-gray-700 transition-all duration-200 min-w-0 rounded-lg border ${
                        isActive
                          ? "bg-gray-700 border-blue-500/50 text-white shadow-md"
                          : "bg-gray-800 border-gray-600/50 text-gray-300 hover:border-gray-500/50"
                      }`}
                      onClick={() => switchToTab(filePath)}
                    >
                      <span
                        className={`text-sm truncate font-medium ${isActive ? "text-white" : "text-gray-300"}`}
                      >
                        {fileName}
                      </span>
                      <button
                        onClick={(e) => closeTab(filePath, e)}
                        className="ml-1 p-0.5 rounded hover:bg-gray-600 opacity-60 group-hover:opacity-100 transition-opacity"
                        title="Close tab"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-shrink-0 ml-4">
              <button
                className="bg-gradient-primary hover:bg-gradient-secondary text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
                onClick={handleSaveProject}
              >
                Save Project
              </button>
            </div>
          </div>
        </div>{" "}
        {/* Editor Content */}
        <div className="flex-1 relative">
          {isLoading || editorMounting ? (
            <div className="flex items-center justify-center h-full bg-background">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-400">
                  {isLoading ? "Loading project..." : "Switching branch..."}
                </p>
              </div>
            </div>
          ) : (
            <Editor
              key={editorKey}
              height="100%"
              theme="vs-dark"
              defaultLanguage="javascript"
              path={activeFile}
              value={filesRef.current[activeFile] || ""}
              onMount={handleMount}
              options={{
                minimap: { enabled: false },
                automaticLayout: true,
                fontSize: 14,
                lineHeight: 1.5,
                scrollBeyondLastLine: false,
                wordWrap: "on",
              }}
            />
          )}
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div
        className="fixed z-30 bottom-6 flex flex-col gap-4 mb-2 transition-all duration-300 ease-in-out"
        style={{
          right:
            chatOpen || vcOpen || showGitPanel || aiChatOpen || githubOpen
              ? `${panelWidth + 24}px`
              : "24px",
        }}
      >
        {/* Chat Button */}
        <button
          className={`w-12 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg transition-all duration-200 transform hover:scale-110 active:scale-95 flex items-center justify-center group ${
            chatOpen ? "ring-2 ring-blue-400" : ""
          }`}
          onClick={() => {
            setChatOpen(!chatOpen);
            setVcOpen(false);
            setShowGitPanel(false);
            setAiChatOpen(false);
            setGithubOpen(false);
          }}
          title="Open Chat"
        >
          <VscComment className="w-5 h-5" />
        </button>

        {/* AI Chat Button */}
        <button
          className={`w-12 h-12 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-lg transition-all duration-200 transform hover:scale-110 active:scale-95 flex items-center justify-center group ${
            aiChatOpen ? "ring-2 ring-purple-400" : ""
          }`}
          onClick={() => {
            setAiChatOpen(!aiChatOpen);
            setChatOpen(false);
            setVcOpen(false);
            setShowGitPanel(false);
            setGithubOpen(false);
          }}
          title="Open AI Assistant"
        >
          <Bot className="w-5 h-5" />
        </button>

        {/* GitHub Integration Button */}
        <button
          className={`w-12 h-12 bg-gray-800 hover:bg-gray-700 text-white rounded-full shadow-lg transition-all duration-200 transform hover:scale-110 active:scale-95 flex items-center justify-center group ${
            githubOpen ? "ring-2 ring-gray-400" : ""
          }`}
          onClick={() => {
            setGithubOpen(!githubOpen);
            setChatOpen(false);
            setVcOpen(false);
            setShowGitPanel(false);
            setAiChatOpen(false);
          }}
          title="GitHub Integration"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path
              fillRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Git History Button */}
        {gitStatus && (
          <button
            className={`w-12 h-12 bg-orange-600 hover:bg-orange-500 text-white rounded-full shadow-lg transition-all duration-200 transform hover:scale-110 active:scale-95 flex items-center justify-center group ${
              showGitPanel ? "ring-2 ring-orange-400" : ""
            }`}
            onClick={() => {
              setShowGitPanel(!showGitPanel);
              setChatOpen(false);
              setVcOpen(false);
              setAiChatOpen(false);
              setGithubOpen(false);
            }}
            title="Git History"
          >
            <VscHistory className="w-5 h-5" />
          </button>
        )}

        {/* Version Control Button */}
        <button
          className={`w-12 h-12 bg-gradient-primary hover:bg-white text-white rounded-full shadow-lg transition-all duration-200 transform hover:scale-110 active:scale-95 flex items-center justify-center group ${
            vcOpen ? "ring-2 ring-green-400" : ""
          }`}
          onClick={() => {
            setVcOpen(!vcOpen);
            setChatOpen(false);
            setShowGitPanel(false);
            setAiChatOpen(false);
            setGithubOpen(false);
          }}
          title="Version Control"
        >
          <VscGitMerge className="w-5 h-5" />
        </button>
      </div>

      {/* Right Sidebar Panel */}
      <ResizablePanel
        isOpen={chatOpen || vcOpen || showGitPanel || aiChatOpen || githubOpen}
        minWidth={280}
        maxWidth={800}
        defaultWidth={320}
        storageKey={`editor-panel-width-${projectId}`}
        side="right"
        onWidthChange={setPanelWidth}
      >
        {chatOpen && (
          <ChatPanel
            chatMessages={chatMessages}
            user={user}
            onSendMessage={handleSendChatMessage}
            onClose={() => setChatOpen(false)}
          />
        )}

        {aiChatOpen && (
          <AiChatPanel
            projectId={projectId}
            userEmail={user?.email || ""}
            onClose={() => setAiChatOpen(false)}
          />
        )}

        {githubOpen && (
          <div className="h-full flex flex-col">
            {/* GitHub Panel Header */}
            <div className="flex justify-between items-center p-3 min-h-[44px] flex-shrink-0 border-b border-gray-700 bg-card h-14">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                GitHub Integration
              </h3>
              <button
                onClick={() => setGithubOpen(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* GitHub Panel Content */}
            <div className="flex-1 overflow-y-auto">
              <GitHubIntegrationPanel
                projectId={projectId}
                currentBranch={currentBranch}
                setCurrentBranch={setCurrentBranch}
                showToast={showToast}
                applyStructureToEditor={applyStructureToEditor}
              />
            </div>
          </div>
        )}

        {vcOpen && (
          <div className="h-full flex flex-col">
            {/* Version Control Panel Header */}
            <div className="flex justify-between items-center p-3 min-h-[44px] flex-shrink-0 border-b border-gray-700 bg-card h-14">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <VscGitMerge className="w-5 h-5" />
                Version Control
              </h3>
              <button
                onClick={() => setVcOpen(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Version Control Panel Content */}
            <div className="flex-1 overflow-y-auto">
              {user && (
                <VersionControlPanel
                  projectId={projectId}
                  user={user}
                  onClose={() => setVcOpen(false)}
                  showToast={showToast}
                  applyStructureToEditor={applyStructureToEditor}
                  buildStructure={buildStructure}
                  currentBranch={currentBranch}
                  setCurrentBranch={setCurrentBranch}
                />
              )}
            </div>
          </div>
        )}

        {showGitPanel && gitStatus && (
          <div className="h-full flex flex-col">
            {/* Git Panel Header */}
            <div className="flex justify-between items-center p-4 min-h-[60px] flex-shrink-0 border-b border-gray-700 bg-card">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <VscHistory className="w-5 h-5" />
                Git History
              </h3>
              <button
                onClick={() => setShowGitPanel(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Git Panel Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {gitStatus?.commits && gitStatus.commits.length > 0 ? (
                <div className="space-y-4">
                  {gitStatus.commits.map((commit: GitCommit) => (
                    <div
                      key={commit.hash}
                      className="bg-gray-900 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <VscGitCommit className="text-green-500 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate mb-2">
                            {commit.message}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span>{commit.author}</span>
                            <span>
                              {new Date(commit.date).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 font-mono mt-2">
                            {commit.hash.substring(0, 7)}
                          </p>
                          <button
                            onClick={() => handleRestoreCommit(commit.hash)}
                            className="mt-2 text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded transition-colors"
                          >
                            Restore
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <VscHistory className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No commits yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </ResizablePanel>
    </div>
  );
}
