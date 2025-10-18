// Socket.IO Hook for Version Control Events

import { useEffect, useCallback, useRef } from "react";
import io from "socket.io-client";
import { FileNode } from "../types";
import { getSocketIOServerUrl } from "@/app/lib/config";

interface VersionControlEvents {
  onCommitCreated?: (data: {
    commitHash: string;
    message: string;
    author: string;
    timestamp: string;
  }) => void;
  onCommitRestored?: (data: {
    commitHash: string;
    structure: FileNode;
  }) => void;
  onBranchMerged?: (data: {
    sourceBranch: string;
    targetBranch: string;
    structure: FileNode;
  }) => void;
  onConflictsResolved?: (data: {
    structure: FileNode;
    message: string;
  }) => void;
  onChangesPulled?: (data: {
    branch: string;
    structure: FileNode;
    commit: string;
  }) => void;
  onBranchCreated?: (data: {
    branchName: string;
    baseBranch: string;
    allBranches: string[];
  }) => void;
  onBranchDeleted?: (data: {
    branchName: string;
    remainingBranches: string[];
    activeBranch: string;
  }) => void;
  onBranchSwitched?: (data: {
    fromBranch?: string;
    toBranch: string;
    branchName?: string;
    structure: FileNode;
  }) => void;
}

export const useVersionControlSocket = (
  projectId: string,
  events: VersionControlEvents,
) => {
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const eventsRef = useRef(events);

  // Update events ref when callbacks change
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    const socket = io(getSocketIOServerUrl(), {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(" VC Socket connected:", socket.id);
      socket.emit("join-doc", projectId);
    });

    // Version control event listeners
    socket.on(
      "commit-created",
      (data: {
        commitHash: string;
        message: string;
        author: string;
        timestamp: string;
      }) => {
        console.log(" New commit created:", data.commitHash);
        eventsRef.current.onCommitCreated?.(data);
      },
    );

    socket.on(
      "commit-restored",
      (data: { commitHash: string; structure: FileNode }) => {
        console.log(" Commit restored:", data.commitHash);
        eventsRef.current.onCommitRestored?.(data);
      },
    );

    socket.on(
      "branch-merged",
      (data: {
        sourceBranch: string;
        targetBranch: string;
        structure: FileNode;
      }) => {
        console.log(
          " Branch merged:",
          data.sourceBranch,
          "→",
          data.targetBranch,
        );
        eventsRef.current.onBranchMerged?.(data);
      },
    );

    socket.on(
      "conflicts-resolved",
      (data: { structure: FileNode; message: string }) => {
        console.log(" Conflicts resolved");
        eventsRef.current.onConflictsResolved?.(data);
      },
    );

    socket.on(
      "changes-pulled",
      (data: { branch: string; structure: FileNode; commit: string }) => {
        console.log("⬇️ Changes pulled from branch:", data.branch);
        eventsRef.current.onChangesPulled?.(data);
      },
    );

    socket.on(
      "branch-created",
      (data: {
        branchName: string;
        baseBranch: string;
        allBranches: string[];
      }) => {
        console.log(
          "🌿 Branch created:",
          data.branchName,
          "from",
          data.baseBranch,
        );
        eventsRef.current.onBranchCreated?.(data);
      },
    );

    socket.on(
      "branch-deleted",
      (data: {
        branchName: string;
        remainingBranches: string[];
        activeBranch: string;
      }) => {
        console.log("🗑️ Branch deleted:", data.branchName);
        eventsRef.current.onBranchDeleted?.(data);
      },
    );

    socket.on(
      "branch-switched",
      (data: {
        fromBranch?: string;
        toBranch: string;
        branchName?: string;
        structure: FileNode;
      }) => {
        const targetBranch = data.toBranch || data.branchName;
        console.log(
          "🔀 Branch switched:",
          data.fromBranch || "unknown",
          "→",
          targetBranch,
        );
        eventsRef.current.onBranchSwitched?.(data);
      },
    );

    socket.on("disconnect", () => {
      console.log("❌ VC Socket disconnected");
    });

    socket.on("connect_error", (error: Error) => {
      console.error("Socket connection error:", error);
    });

    return () => {
      socket.emit("leave-doc", projectId);
      socket.disconnect();
    };
  }, [projectId]);

  // Manual pull trigger
  const pullChanges = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/version-control/pull-git`,
        { method: "POST" },
      );

      if (!response.ok) {
        throw new Error("Failed to pull changes");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (process.env.NODE_ENV !== "test") {
        console.error("Pull changes error:", error);
      }
      throw error;
    }
  }, [projectId]);

  return {
    socket: socketRef.current,
    pullChanges,
  };
};
