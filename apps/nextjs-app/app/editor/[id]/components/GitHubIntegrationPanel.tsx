"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  VscRepo,
  VscCloudUpload,
  VscCloudDownload,
  VscAdd,
} from "react-icons/vsc";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { GitHubConnectButton } from "./GitHubConnectButton";

type Repo = {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  html_url: string;
  default_branch: string;
  clone_url: string;
};

type LocalCommit = {
  hash: string;
  author: string;
  email: string;
  date: string;
  message: string;
};

type FileChange = {
  path: string;
  status: string;
};

type StructureNode = {
  name: string;
  type: "file" | "folder";
  content?: string;
  children?: StructureNode[];
};

interface GitHubIntegrationPanelProps {
  projectId: string;
  currentBranch: string;
  setCurrentBranch: (branch: string) => void;
  showToast: (message: string, type: "success" | "error") => void;
  applyStructureToEditor: (structure: StructureNode | null) => void;
}

const GitHubIntegrationPanel: React.FC<GitHubIntegrationPanelProps> = ({
  projectId,
  currentBranch,
  setCurrentBranch,
  showToast,
  applyStructureToEditor,
}) => {
  // GitHub state
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [token, setToken] = useState<string>("");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [newRepoName, setNewRepoName] = useState<string>("");
  const [newRepoDescription, setNewRepoDescription] = useState<string>("");

  // Local Git state
  const [repoPath, setRepoPath] = useState<string>("");
  const [stagedFiles, setStagedFiles] = useState<FileChange[]>([]);
  const [unstagedFiles, setUnstagedFiles] = useState<FileChange[]>([]);
  const [commitHistory, setCommitHistory] = useState<LocalCommit[]>([]);
  const [localBranches, setLocalBranches] = useState<string[]>([]);
  const [newBranchName, setNewBranchName] = useState<string>("");
  const [hasLocalRepo, setHasLocalRepo] = useState<boolean>(false);
  const [operationInProgress, setOperationInProgress] = useState(false);

  // Operation locking wrapper (same as Local VC)
  const withLock = useCallback(
    async (operation: () => Promise<void>) => {
      if (operationInProgress) {
        showToast("Please wait for current operation to complete", "error");
        return;
      }

      setOperationInProgress(true);
      try {
        await operation();
      } catch (err) {
        console.error("Operation error:", err);
        showToast("Operation failed", "error");
      } finally {
        setOperationInProgress(false);
      }
    },
    [operationInProgress, showToast],
  );

  // Fetch repository path
  useEffect(() => {
    async function fetchRepoPath() {
      try {
        const res = await fetch(`/api/projects/${projectId}/repo-path`);
        if (res.ok) {
          const data = await res.json();
          setRepoPath(data.repoPath);
        }
      } catch (error) {
        console.error("Error fetching repo path:", error);
      }
    }
    fetchRepoPath();
  }, [projectId]);

  // Restore selected repository from localStorage
  const restoreSelectedRepo = useCallback(() => {
    const savedRepoId = localStorage.getItem(`github_repo_${projectId}`);
    if (savedRepoId && repos.length > 0) {
      const repo = repos.find((r) => r.id.toString() === savedRepoId);
      if (repo) {
        setSelectedRepo(repo);
        showToast(`Restored: ${repo.full_name}`, "success");
      }
    }
  }, [projectId, repos, showToast]);

  useEffect(() => {
    restoreSelectedRepo();
  }, [restoreSelectedRepo]);

  // Fetch repos function
  const fetchRepos = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        "https://api.github.com/user/repos?per_page=100",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (res.ok) {
        const data = await res.json();
        setRepos(data);
        showToast("Repositories loaded", "success");
      } else {
        showToast("Failed to fetch repositories", "error");
      }
    } catch (error) {
      console.error("Error fetching repos:", error);
      showToast("Error fetching repositories", "error");
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  // Check GitHub authentication
  const checkGitHubAuth = useCallback(async () => {
    try {
      console.log("[GitHub Panel] Checking auth status...");
      const res = await fetch("/api/auth/github/check");
      console.log("[GitHub Panel] Auth check response:", res.status);

      if (res.ok) {
        const data = await res.json();
        console.log("[GitHub Panel] Auth data:", {
          authenticated: data.authenticated,
          hasToken: !!data.token,
        });

        if (data.authenticated && data.token) {
          console.log("[GitHub Panel] ✅ Setting connected state");
          setIsConnected(true);
          setToken(data.token);
          return true;
        }
      }
      console.log("[GitHub Panel] ❌ Not authenticated");
      setIsConnected(false);
      setToken("");
      return false;
    } catch (error) {
      console.error("[GitHub Panel] Error checking GitHub auth:", error);
      setIsConnected(false);
      setToken("");
      return false;
    }
  }, []);

  useEffect(() => {
    checkGitHubAuth();
  }, [checkGitHubAuth]);

  // Listen for GitHub connection events from popup
  useEffect(() => {
    const handleGitHubConnected = async () => {
      console.log("[GitHub Panel] 🎉 Received github-connected event!");
      showToast("GitHub connected successfully!", "success");

      // Wait for cookies to be set (increased to 1 second for reliability)
      console.log("[GitHub Panel] Waiting 1s for cookies to be set...");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("[GitHub Panel] Checking auth status now...");
      const connected = await checkGitHubAuth();

      if (connected) {
        console.log("[GitHub Panel] ✅ Connected! Fetching repos...");
        // Trigger repos fetch after token is set
        setTimeout(() => fetchRepos(), 100);
      } else {
        console.log("[GitHub Panel] ❌ Still not connected after event");
        showToast("Connection failed. Please try again.", "error");
      }
    };

    window.addEventListener(
      "github-connected",
      handleGitHubConnected as EventListener,
    );
    return () => {
      window.removeEventListener(
        "github-connected",
        handleGitHubConnected as EventListener,
      );
    };
  }, [checkGitHubAuth, showToast, fetchRepos]);

  // Fetch GitHub repositories when connected
  useEffect(() => {
    if (isConnected && token) {
      fetchRepos();
    }
  }, [isConnected, token, fetchRepos]);

  // Load local Git status
  const loadLocalGitStatus = useCallback(async () => {
    if (!repoPath) return;

    try {
      const res = await fetch(
        `/api/projects/${projectId}/version-control/status?repoPath=${encodeURIComponent(repoPath)}`,
      );

      if (res.ok) {
        const data = await res.json();
        const stagedChanges: FileChange[] = [];
        const unstagedChanges: FileChange[] = [];

        if (data.status) {
          data.status.forEach(
            (file: { path: string; index?: string; working_dir?: string }) => {
              if (file.index && file.index !== " " && file.index !== "?") {
                stagedChanges.push({
                  path: file.path,
                  status: file.index,
                });
              }
              if (file.working_dir && file.working_dir !== " ") {
                unstagedChanges.push({
                  path: file.path,
                  status: file.working_dir,
                });
              }
            },
          );
        }

        setStagedFiles(stagedChanges);
        setUnstagedFiles(unstagedChanges);
        setHasLocalRepo(true);
      }
    } catch (error) {
      console.error("Error loading Git status:", error);
    }
  }, [repoPath, projectId]);

  // Load local branches
  const loadLocalBranches = useCallback(async () => {
    if (!repoPath) return;

    try {
      const res = await fetch(
        `/api/projects/${projectId}/version-control/branch-git`,
      );

      if (res.ok) {
        const data = await res.json();
        setLocalBranches(data.branches || []);
      }
    } catch (error) {
      console.error("Error loading branches:", error);
    }
  }, [repoPath, projectId]);

  // Load commit history
  const loadLocalCommitHistory = useCallback(async () => {
    if (!repoPath) return;

    try {
      const res = await fetch(
        `/api/git/local?repoPath=${encodeURIComponent(repoPath)}&action=log`,
      );

      if (res.ok) {
        const data = await res.json();
        setCommitHistory(data.commits || []);
      }
    } catch (error) {
      console.error("Error loading commit history:", error);
    }
  }, [repoPath]);

  // Load all Git data
  useEffect(() => {
    if (repoPath) {
      loadLocalGitStatus();
      loadLocalBranches();
      loadLocalCommitHistory();
    }
  }, [repoPath, loadLocalGitStatus, loadLocalBranches, loadLocalCommitHistory]);

  // Handle repository selection
  const handleRepoSelect = (repo: Repo) => {
    setSelectedRepo(repo);
    localStorage.setItem(`github_repo_${projectId}`, repo.id.toString());
    showToast(`Selected: ${repo.full_name}`, "success");
  };

  // Handle branch switching with file structure update (NO PAGE RELOAD)
  const handleBranchSwitch = async (branchName: string) => {
    if (branchName === currentBranch) return;

    await withLock(async () => {
      setLoading(true);

      try {
        // Check for uncommitted changes
        if (unstagedFiles.length > 0 || stagedFiles.length > 0) {
          const uncommittedCount = unstagedFiles.length + stagedFiles.length;
          showToast(
            `⚠️ You have ${uncommittedCount} uncommitted change(s). Please commit them in Local Version Control before switching.`,
            "error",
          );
          setLoading(false);
          return;
        }

        // Signal Yjs to disconnect
        console.log(
          "[GitHub Panel] Signaling Yjs disconnect for branch switch",
        );
        applyStructureToEditor(null);

        // Wait for cleanup
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Call API to switch branch
        const res = await fetch(
          `/api/projects/${projectId}/version-control/branch-git`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ branchName }),
          },
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to switch branch");
        }

        // Update current branch
        setCurrentBranch(branchName);

        // Fetch file structure for new branch
        let structure = data.structure;

        if (!structure) {
          console.warn("[GitHub Panel] Fetching structure separately");
          const structureRes = await fetch(
            `/api/projects/${projectId}?branch=${branchName}`,
            {
              cache: "no-store",
              headers: { "Cache-Control": "no-cache" },
            },
          );
          const structureData = await structureRes.json();

          if (structureRes.ok && structureData.structure) {
            structure = structureData.structure;
          }
        }

        if (!structure) {
          throw new Error("Failed to load branch structure");
        }

        // Apply structure to editor (NO PAGE RELOAD!)
        console.log("[GitHub Panel] Applying structure to editor");
        await new Promise((resolve) => setTimeout(resolve, 200));
        applyStructureToEditor(structure as StructureNode);

        // Cache structure
        try {
          localStorage.setItem(
            `vc_structure:${projectId}:${branchName}`,
            JSON.stringify(structure),
          );
        } catch (cacheErr) {
          console.warn("[GitHub Panel] Failed to cache structure:", cacheErr);
        }

        // Reload Git data
        await Promise.all([
          loadLocalGitStatus(),
          loadLocalBranches(),
          loadLocalCommitHistory(),
        ]);

        showToast(`✓ Switched to branch: ${branchName}`, "success");
      } catch (error) {
        console.error("[GitHub Panel] Branch switch error:", error);
        showToast(
          error instanceof Error ? error.message : "Failed to switch branch",
          "error",
        );
        setLoading(false);
      } finally {
        setLoading(false);
      }
    });
  };

  // Handle branch creation
  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      showToast("Please enter a branch name", "error");
      return;
    }

    await withLock(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/projects/${projectId}/version-control/branch-git`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              branchName: newBranchName,
              baseBranch: currentBranch || "main",
            }),
          },
        );

        if (res.ok) {
          showToast(`✓ Created branch: ${newBranchName}`, "success");
          setNewBranchName("");
          await loadLocalBranches();
        } else {
          const data = await res.json();
          showToast(data.error || "Failed to create branch", "error");
        }
      } catch (error) {
        console.error("Error creating branch:", error);
        showToast("Error creating branch", "error");
      } finally {
        setLoading(false);
      }
    });
  };

  // Handle push to GitHub
  const handlePush = async () => {
    if (!selectedRepo) {
      showToast("⚠️ Please select a GitHub repository first", "error");
      return;
    }

    if (!currentBranch) {
      showToast("⚠️ No active branch detected", "error");
      return;
    }

    await withLock(async () => {
      setLoading(true);
      console.log(
        `[GitHub Push] Starting push of branch '${currentBranch}' to ${selectedRepo.full_name}`,
      );
      showToast(`Pushing '${currentBranch}' to GitHub...`, "success");

      try {
        // Set remote
        const remoteUrl = selectedRepo.clone_url.replace(
          "https://",
          `https://${token}@`,
        );

        console.log(
          `[GitHub Push] Setting remote URL for ${selectedRepo.full_name}`,
        );
        const setRemoteRes = await fetch("/api/git/local", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repoPath,
            action: "set-remote",
            remote: remoteUrl,
          }),
        });

        if (!setRemoteRes.ok) {
          console.warn("[GitHub Push] Failed to set remote, may already exist");
        } else {
          console.log("[GitHub Push] Remote URL set successfully");
        }

        // Push current branch
        console.log(
          `[GitHub Push] Executing: git push -u origin ${currentBranch}`,
        );
        const res = await fetch("/api/git/local", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repoPath,
            action: "push",
            branchName: currentBranch,
            remote: "origin",
          }),
        });

        const data = await res.json();
        console.log(`[GitHub Push] Push response:`, data);

        // Show detailed information about what was pushed
        if (data.filesCount !== undefined) {
          console.log(
            `[GitHub Push] Files pushed: ${data.filesCount}, Commits: ${data.commitCount}`,
          );
        }

        if (res.ok && data.success) {
          console.log(
            `[GitHub Push] ✓ Successfully pushed '${currentBranch}' to GitHub`,
          );
          const successMsg =
            data.filesCount !== undefined
              ? `✓ Pushed ${data.commitCount} commit(s) with ${data.filesCount} file(s) to ${selectedRepo.full_name}`
              : `✓ Pushed '${currentBranch}' to ${selectedRepo.full_name} successfully!`;
          showToast(successMsg, "success");
          await loadLocalCommitHistory();
        } else {
          console.error(`[GitHub Push] ✗ Push failed:`, data);

          // Check if rejection is due to remote changes
          if (
            data.message &&
            (data.message.includes("rejected") ||
              data.message.includes("fetch first") ||
              data.message.includes("git pull"))
          ) {
            showToast(
              "⚠️ Push rejected: Remote has changes. Pull first, then push again.",
              "error",
            );
          } else {
            showToast(data.error || data.message || "Push failed", "error");
          }
        }
      } catch (error) {
        console.error("[GitHub Push] Exception during push:", error);
        showToast("Error pushing to GitHub", "error");
      } finally {
        setLoading(false);
      }
    });
  };

  // Handle pull from GitHub
  const handlePull = async () => {
    if (!currentBranch) {
      showToast("⚠️ No active branch detected", "error");
      return;
    }

    // Check for uncommitted changes
    if (unstagedFiles.length > 0) {
      showToast(
        `⚠️ You have ${unstagedFiles.length} uncommitted change(s). Please commit them in Local Version Control before pulling.`,
        "error",
      );
      return;
    }

    await withLock(async () => {
      setLoading(true);
      showToast(`Pulling '${currentBranch}' from GitHub...`, "success");

      try {
        // Pull current branch
        const res = await fetch("/api/git/local", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repoPath,
            action: "pull",
            branchName: currentBranch,
            remote: "origin",
          }),
        });

        const data = await res.json();

        if (res.ok || data.success) {
          showToast(
            `✓ Pulled '${currentBranch}' from GitHub successfully!`,
            "success",
          );

          // Reload Git status and commits
          await loadLocalGitStatus();
          await loadLocalCommitHistory();

          // Update file structure from Git
          try {
            const structureRes = await fetch(
              `/api/projects/${projectId}?branch=${currentBranch}`,
              {
                cache: "no-store",
                headers: { "Cache-Control": "no-cache" },
              },
            );

            if (structureRes.ok) {
              const structureData = await structureRes.json();
              if (structureData.structure) {
                // Apply structure WITHOUT page reload
                console.log("[GitHub Panel] Applying pulled structure");
                applyStructureToEditor(null); // Clear first
                await new Promise((resolve) => setTimeout(resolve, 200));
                applyStructureToEditor(
                  structureData.structure as StructureNode,
                );

                showToast(
                  `✓ File structure updated from '${currentBranch}'`,
                  "success",
                );
              }
            }
          } catch (fetchErr) {
            console.error("Failed to fetch structure after pull:", fetchErr);
          }
        } else {
          showToast(data.error || data.message || "Pull failed", "error");
        }
      } catch (error) {
        console.error("Pull error:", error);
        showToast("Error pulling from GitHub", "error");
      } finally {
        setLoading(false);
      }
    });
  };

  // Handle create repository
  const handleCreateRepo = async () => {
    if (!newRepoName.trim()) {
      showToast("Please enter a repository name", "error");
      return;
    }

    await withLock(async () => {
      setLoading(true);

      try {
        const res = await fetch("https://api.github.com/user/repos", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newRepoName,
            description: newRepoDescription,
            private: false,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          showToast(`✓ Created repository: ${data.full_name}`, "success");
          setNewRepoName("");
          setNewRepoDescription("");
          await fetchRepos();
        } else {
          const error = await res.json();
          showToast(error.message || "Failed to create repository", "error");
        }
      } catch (error) {
        console.error("Error creating repository:", error);
        showToast("Error creating repository", "error");
      } finally {
        setLoading(false);
      }
    });
  };

  if (!isConnected) {
    return (
      <div className="flex h-full flex-col bg-sidebar text-white overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-4">
          <GitHubConnectButton projectId={projectId} mode="popup" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-white overflow-hidden">
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Repository Selection */}
        <Card className="bg-sidebar border border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <VscRepo />
              GitHub Repository
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              value={selectedRepo?.id || ""}
              onChange={(e) => {
                const repo = repos.find(
                  (r) => r.id.toString() === e.target.value,
                );
                if (repo) handleRepoSelect(repo);
              }}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="">Select a repository</option>
              {repos.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.full_name}
                </option>
              ))}
            </select>

            {selectedRepo && (
              <div className="text-sm text-gray-300">
                <p>✓ Connected to: {selectedRepo.full_name}</p>
                <a
                  href={selectedRepo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  View on GitHub →
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create New Repository */}
        <Card className="bg-sidebar border border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <VscAdd />
              Create New Repository
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Repository name"
              value={newRepoName}
              onChange={(e) => setNewRepoName(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <Textarea
              placeholder="Description (optional)"
              value={newRepoDescription}
              onChange={(e) => setNewRepoDescription(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              disabled={loading}
            />
            <Button
              onClick={handleCreateRepo}
              disabled={loading || !newRepoName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <VscAdd className="mr-2" />
              Create Repository
            </Button>
          </CardContent>
        </Card>

        {/* Current Branch & Branches */}
        {hasLocalRepo && (
          <Card className="bg-sidebar border border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">
                Branch: {currentBranch}
                <Badge className="ml-2 bg-green-600">Active</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm text-gray-300 block mb-2">
                  Switch Branch:
                </label>
                <select
                  value={currentBranch}
                  onChange={(e) => handleBranchSwitch(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  {localBranches.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 border-t border-gray-700">
                <label className="text-sm text-gray-300 block mb-2">
                  Create New Branch:
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="branch-name"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    className="bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <Button
                    onClick={handleCreateBranch}
                    disabled={loading || !newBranchName.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <VscAdd />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Git Status */}
        {hasLocalRepo && (
          <Card className="bg-sidebar border border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Git Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <span className="text-gray-300">Staged files:</span>
                <Badge className="ml-2 bg-green-600">
                  {stagedFiles.length}
                </Badge>
              </div>
              <div className="text-sm">
                <span className="text-gray-300">Unstaged files:</span>
                <Badge className="ml-2 bg-yellow-600">
                  {unstagedFiles.length}
                </Badge>
              </div>
              {(stagedFiles.length > 0 || unstagedFiles.length > 0) && (
                <p className="text-xs text-yellow-400 mt-2">
                  ⚠️ Commit changes in Local Version Control before push/pull
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Push/Pull Actions */}
        {hasLocalRepo && selectedRepo && (
          <Card className="bg-sidebar border border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Sync with GitHub</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={handlePush}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <VscCloudUpload className="mr-2" />
                Push to GitHub
              </Button>
              <Button
                onClick={handlePull}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <VscCloudDownload className="mr-2" />
                Pull from GitHub
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Commit History */}
        {commitHistory.length > 0 && (
          <Card className="bg-sidebar border border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Recent Commits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {commitHistory.slice(0, 10).map((commit) => (
                  <div
                    key={commit.hash}
                    className="text-sm p-2 bg-gray-700 rounded border border-gray-600"
                  >
                    <div className="font-mono text-xs text-gray-400 mb-1">
                      {commit.hash.substring(0, 7)}
                    </div>
                    <div className="text-white">{commit.message}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {commit.author} • {new Date(commit.date).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GitHubIntegrationPanel;
