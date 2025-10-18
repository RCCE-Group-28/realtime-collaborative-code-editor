import { renderHook, act } from "@testing-library/react";
import { useVersionControlSocket } from "@/app/editor/[id]/hooks/useVersionControlSocket";
import io from "socket.io-client";
import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// Mock socket.io-client
jest.mock("socket.io-client");
const mockSocket = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  disconnect: jest.fn(),
  connected: true,
  id: "socket123",
};
(io as unknown as jest.Mock).mockReturnValue(mockSocket);

describe("useVersionControlSocket", () => {
  const mockProjectId = "project123";
  const mockEvents = {
    onCommitCreated: jest.fn(),
    onCommitRestored: jest.fn(),
    onBranchMerged: jest.fn(),
    onConflictsResolved: jest.fn(),
    onChangesPulled: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (io as unknown as jest.Mock).mockReturnValue(mockSocket);
    Object.values(mockEvents).forEach((mock) => mock.mockClear());
  });

  describe("Connection", () => {
    it("should establish socket connection with correct URL", () => {
      renderHook(() => useVersionControlSocket(mockProjectId, mockEvents));

      // Config helper returns the URL based on environment variables
      expect(io).toHaveBeenCalledWith(expect.any(String), {
        transports: ["websocket", "polling"],
      });
    });

    it("should emit connect event and join project", () => {
      let connectCallback: () => void;
      mockSocket.on = jest.fn((event, callback) => {
        if (event === "connect") {
          connectCallback = callback as () => void;
        }
      });

      renderHook(() => useVersionControlSocket(mockProjectId, mockEvents));

      act(() => {
        connectCallback();
      });

      expect(mockSocket.emit).toHaveBeenCalledWith("join-doc", mockProjectId);
    });

    it("should disconnect on unmount", () => {
      const { unmount } = renderHook(() =>
        useVersionControlSocket(mockProjectId, mockEvents),
      );

      unmount();

      expect(mockSocket.emit).toHaveBeenCalledWith("leave-doc", mockProjectId);
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe("Version Control Events", () => {
    it("should handle commit-created events", () => {
      let commitCallback: (data: unknown) => void;
      mockSocket.on = jest.fn((event, callback) => {
        if (event === "commit-created") {
          commitCallback = callback as (data: unknown) => void;
        }
      });

      renderHook(() => useVersionControlSocket(mockProjectId, mockEvents));

      const commitData = {
        commitHash: "abc123",
        message: "Initial commit",
        author: "testuser",
        timestamp: "2024-01-01T00:00:00Z",
      };

      act(() => {
        commitCallback(commitData);
      });

      expect(mockEvents.onCommitCreated).toHaveBeenCalledWith(commitData);
    });

    it("should handle commit-restored events", () => {
      let restoreCallback: (data: unknown) => void;
      mockSocket.on = jest.fn((event, callback) => {
        if (event === "commit-restored") {
          restoreCallback = callback as (data: unknown) => void;
        }
      });

      renderHook(() => useVersionControlSocket(mockProjectId, mockEvents));

      const restoreData = {
        commitHash: "def456",
        structure: {
          name: "root",
          type: "folder",
          children: [],
        },
      };

      act(() => {
        restoreCallback(restoreData);
      });

      expect(mockEvents.onCommitRestored).toHaveBeenCalledWith(restoreData);
    });

    it("should handle branch-merged events", () => {
      let mergeCallback: (data: unknown) => void;
      mockSocket.on = jest.fn((event, callback) => {
        if (event === "branch-merged") {
          mergeCallback = callback as (data: unknown) => void;
        }
      });

      renderHook(() => useVersionControlSocket(mockProjectId, mockEvents));

      const mergeData = {
        sourceBranch: "feature-branch",
        targetBranch: "main",
        structure: {
          name: "root",
          type: "folder",
          children: [],
        },
      };

      act(() => {
        mergeCallback(mergeData);
      });

      expect(mockEvents.onBranchMerged).toHaveBeenCalledWith(mergeData);
    });

    it("should handle conflicts-resolved events", () => {
      let conflictsCallback: (data: unknown) => void;
      mockSocket.on = jest.fn((event, callback) => {
        if (event === "conflicts-resolved") {
          conflictsCallback = callback as (data: unknown) => void;
        }
      });

      renderHook(() => useVersionControlSocket(mockProjectId, mockEvents));

      const conflictsData = {
        structure: {
          name: "root",
          type: "folder",
          children: [],
        },
        message: "Conflicts resolved successfully",
      };

      act(() => {
        conflictsCallback(conflictsData);
      });

      expect(mockEvents.onConflictsResolved).toHaveBeenCalledWith(
        conflictsData,
      );
    });

    it("should handle changes-pulled events", () => {
      let pullCallback: (data: unknown) => void;
      mockSocket.on = jest.fn((event, callback) => {
        if (event === "changes-pulled") {
          pullCallback = callback as (data: unknown) => void;
        }
      });

      renderHook(() => useVersionControlSocket(mockProjectId, mockEvents));

      const pullData = {
        branch: "main",
        structure: {
          name: "root",
          type: "folder",
          children: [],
        },
        commit: "ghi789",
      };

      act(() => {
        pullCallback(pullData);
      });

      expect(mockEvents.onChangesPulled).toHaveBeenCalledWith(pullData);
    });
  });

  describe("Pull Changes", () => {
    it("should pull changes successfully", async () => {
      // Mock fetch
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response),
      );

      const { result } = renderHook(() =>
        useVersionControlSocket(mockProjectId, mockEvents),
      );

      const pullResult = await result.current.pullChanges();

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/projects/${mockProjectId}/version-control/pull-git`,
        { method: "POST" },
      );
      expect(pullResult).toEqual({ success: true });
    });

    it("should handle pull changes error", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Mock fetch to fail
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
        } as Response),
      );

      const { result } = renderHook(() =>
        useVersionControlSocket(mockProjectId, mockEvents),
      );

      await expect(result.current.pullChanges()).rejects.toThrow(
        "Failed to pull changes",
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Error Handling", () => {
    it("should handle connection errors", () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      let errorCallback: (error: Error) => void;
      mockSocket.on = jest.fn((event, callback) => {
        if (event === "connect_error") {
          errorCallback = callback as (error: Error) => void;
        }
      });

      renderHook(() => useVersionControlSocket(mockProjectId, mockEvents));

      const testError = new Error("Connection failed");
      act(() => {
        errorCallback(testError);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Socket connection error:",
        testError,
      );

      consoleSpy.mockRestore();
    });
  });
});
