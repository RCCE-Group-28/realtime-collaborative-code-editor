import { renderHook, act } from "@testing-library/react";
import { useSocket } from "@/app/editor/[id]/hooks/useSocket";
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

describe("useSocket", () => {
  const mockProjectId = "project123";

  beforeEach(() => {
    jest.clearAllMocks();
    (io as unknown as jest.Mock).mockReturnValue(mockSocket);
  });

  describe("Connection", () => {
    it("should establish socket connection on mount", () => {
      renderHook(() => useSocket(mockProjectId));

      // Config helper returns the default localhost URL in test environment
      expect(io).toHaveBeenCalledWith(expect.any(String));
      expect(mockSocket.emit).toHaveBeenCalledWith("join-doc", mockProjectId);
    });

    it("should disconnect on unmount", () => {
      const { unmount } = renderHook(() => useSocket(mockProjectId));

      unmount();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it("should not connect if no projectId", () => {
      renderHook(() => useSocket(""));

      expect(io).not.toHaveBeenCalled();
    });
  });

  describe("Chat Messages", () => {
    it("should handle incoming chat history", () => {
      const mockMessages = [
        {
          senderEmail: "user1@example.com",
          senderUsername: "user1",
          message: "Hello",
          timestamp: 1234567890,
        },
      ];

      mockSocket.on = jest.fn((event: unknown, callback: unknown) => {
        if (event === "chat-history") {
          (callback as (messages: unknown) => void)(mockMessages);
        }
      });

      const { result } = renderHook(() => useSocket(mockProjectId));

      expect(result.current.chatMessages).toEqual(mockMessages);
    });

    it("should handle new chat messages", () => {
      const initialMessages = [
        {
          senderEmail: "user1@example.com",
          senderUsername: "user1",
          message: "Hello",
          timestamp: 1234567890,
        },
      ];

      const newMessage = {
        senderEmail: "user2@example.com",
        senderUsername: "user2",
        message: "Hi there",
        timestamp: 1234567891,
      };

      let chatMessageCallback: (message: unknown) => void;

      mockSocket.on = jest.fn((event: unknown, callback: unknown) => {
        if (event === "chat-history") {
          (callback as (data: unknown) => void)(initialMessages);
        } else if (event === "chat-message") {
          chatMessageCallback = callback as (message: unknown) => void;
        }
      });

      const { result } = renderHook(() => useSocket(mockProjectId));

      act(() => {
        chatMessageCallback(newMessage);
      });

      expect(result.current.chatMessages).toEqual([
        ...initialMessages,
        newMessage,
      ]);
    });

    it("should emit chat messages", () => {
      const { result } = renderHook(() => useSocket(mockProjectId));

      const messageData = {
        senderEmail: "user@example.com",
        senderUsername: "user",
        message: "Test message",
        timestamp: Date.now(),
      };

      act(() => {
        result.current.emitChatMessage(messageData);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith("chat-message", messageData);
    });
  });

  describe("File Tree Events", () => {
    it("should emit node added events", () => {
      const { result } = renderHook(() => useSocket(mockProjectId));

      const payload = {
        type: "file" as const,
        parentPath: "src",
        name: "newfile.js",
      };

      act(() => {
        result.current.emitNodeAdded(payload);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith("node-added", payload);
    });

    it("should emit node deleted events", () => {
      const { result } = renderHook(() => useSocket(mockProjectId));

      const payload = {
        path: "src/oldfile.js",
      };

      act(() => {
        result.current.emitNodeDeleted(payload);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith("node-deleted", payload);
    });
  });

  describe("Socket Reference", () => {
    it("should return socket reference", () => {
      const { result } = renderHook(() => useSocket(mockProjectId));

      expect(result.current.socket).toBe(mockSocket);
    });
  });
});
