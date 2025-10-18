import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type * as Monaco from "monaco-editor";
import type { MonacoBinding } from "y-monaco";
import { randomColor } from "../utils/colorHelpers";
import type { PresenceUser, User } from "../types";
import { getYjsServerUrl } from "@/app/lib/config";

export function useYjs(
  activeFile: string,
  user: User | null,
  projectId: string,
  initialFiles: Record<string, string>,
  files: Record<string, string>,
  currentBranch: string,
  forceRefresh?: number, // Add timestamp to force refresh when files are externally updated
) {
  const [monaco, setMonaco] = useState<typeof import("monaco-editor") | null>(
    null,
  );
  const [editor, setEditor] =
    useState<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const [presence, setPresence] = useState<PresenceUser[]>([]);

  const decorationsRef = useRef<string[]>([]);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const modelRef = useRef<Monaco.editor.ITextModel | null>(null);
  const cursorListenerRef = useRef<Monaco.IDisposable | null>(null);
  const awarenessListenerRef = useRef<(() => void) | null>(null);
  const ytextObserverRef = useRef<(() => void) | null>(null);

  // Update remote cursor decorations
  const updateRemoteCursorDecorations = useCallback(
    (states: PresenceUser[]) => {
      if (!providerRef.current || !editor || !monaco) return;

      // Enhanced safety checks for editor state
      try {
        // Check if editor exists (less strict - just check existence, not DOM connection)
        const domNode = editor.getDomNode?.();
        if (!domNode) {
          console.warn("Skipping cursor update - editor DOM node missing");
          return;
        }

        const model = editor.getModel();
        if (!model || model.isDisposed()) {
          console.warn("Skipping cursor update - editor model is disposed");
          return;
        }
      } catch (err) {
        console.warn("Error checking editor state:", err);
        return;
      }

      const myClientId = providerRef.current.awareness.clientID;
      const decs: Monaco.editor.IModelDeltaDecoration[] = [];

      states.forEach((s) => {
        if (!s.cursor || s.clientId === myClientId) return;
        const line = s.cursor.line ?? 1;
        const col = s.cursor.column ?? 1;
        decs.push({
          range: new monaco.Range(line, col, line, col),
          options: {
            isWholeLine: false,
            stickiness:
              monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            hoverMessage: {
              value: `**${s.user?.name ?? s.user?.email ?? "user"}**`,
            },
            inlineClassName: `remoteCursor_${s.clientId}`,
          },
        });
      });

      try {
        // Additional safety check before updating decorations
        const currentModel = editor.getModel();
        if (currentModel && !currentModel.isDisposed()) {
          decorationsRef.current = editor.deltaDecorations(
            decorationsRef.current,
            decs,
          );
        } else {
          decorationsRef.current = [];
        }
      } catch (err) {
        console.warn("Error updating decorations:", err);
        decorationsRef.current = [];
      }

      const styleId = "remote-cursors-styles";
      let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.innerHTML = states
        .map((s) => {
          if (!s.user) return "";
          const color = s.user.color ?? "#888";
          return `.monaco-editor .remoteCursor_${s.clientId} {
            background: rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, 0.12);
            border-left: 2px solid ${color};
          }`;
        })
        .join("\n");
    },
    [editor, monaco],
  );

  // Complete cleanup function
  const cleanupAll = useCallback(() => {
    console.log("Starting complete cleanup");

    // Remove awareness listener
    if (awarenessListenerRef.current && providerRef.current) {
      try {
        providerRef.current.awareness.off(
          "change",
          awarenessListenerRef.current,
        );
        awarenessListenerRef.current = null;
      } catch (err) {
        console.warn("Awareness listener cleanup warning:", err);
      }
    }

    // Dispose cursor listener
    if (cursorListenerRef.current) {
      try {
        cursorListenerRef.current.dispose();
        cursorListenerRef.current = null;
      } catch (err) {
        console.warn("Cursor listener cleanup warning:", err);
      }
    }

    // Remove ytext observer
    if (ytextObserverRef.current && ydocRef.current) {
      try {
        if (!ydocRef.current.isDestroyed) {
          const ytext = ydocRef.current.getText("monaco");
          if (ytext && ytext.unobserve) {
            ytext.unobserve(ytextObserverRef.current);
          }
        }
      } catch (err) {
        // This can happen if the doc is destroyed in a way we don't expect
        console.warn("YText observer cleanup warning:", err);
      } finally {
        ytextObserverRef.current = null;
      }
    }

    // Destroy binding
    if (bindingRef.current) {
      try {
        bindingRef.current.destroy();
        bindingRef.current = null;
      } catch (err) {
        console.warn("Binding cleanup warning:", err);
      }
    }

    // Destroy provider
    if (providerRef.current) {
      try {
        providerRef.current.destroy();
        providerRef.current = null;
      } catch (err) {
        console.warn("Provider cleanup warning:", err);
      }
    }

    // Destroy ydoc
    if (ydocRef.current) {
      try {
        ydocRef.current.destroy();
        ydocRef.current = null;
      } catch (err) {
        console.warn("YDoc cleanup warning:", err);
      }
    }

    // Clear model ref (don't dispose - editor will handle it)
    modelRef.current = null;

    console.log("Cleanup complete");
  }, []);

  // Main effect for Yjs setup - depends on activeFile, projectId, currentBranch
  useEffect(() => {
    // Don't initialize if no active file (during loading or branch switch)
    if (!activeFile || !monaco || !editor) {
      console.log("⏸Yjs setup skipped - waiting for dependencies");
      // Ensure cleanup if activeFile is cleared (branch switch signal)
      if (!activeFile && (providerRef.current || ydocRef.current)) {
        console.log("🧹 Cleaning up Yjs due to cleared activeFile");
        cleanupAll();
      }
      return;
    }

    let mounted = true;
    console.log(` Setting up Yjs for: ${currentBranch}/${activeFile}`);

    // Wrap entire setup in try-catch to prevent Monaco DOM errors
    try {
      // Cleanup previous setup
      cleanupAll();

      // Create new Y.Doc
      const ydoc = new Y.Doc();
      ydocRef.current = ydoc;

      // Create WebSocket provider with branch-specific room
      const safeFile = activeFile.replace(/[\/\\]/g, "--").replace(/\./g, "-");
      const safeBranch = currentBranch
        .replace(/[\/\\]/g, "--")
        .replace(/\s/g, "%20");
      const roomName = `${projectId}-${safeBranch}--${safeFile}`;

      console.log(`📡 Connecting to Yjs room: ${roomName}`);
      const provider = new WebsocketProvider(
        getYjsServerUrl(),
        roomName,
        ydoc,
        {
          connect: true,
        },
      );
      providerRef.current = provider;

      // Get or create Monaco model
      const uri = monaco.Uri.parse(
        `inmemory:///${projectId}/${currentBranch}/${activeFile}`,
      );
      let model = monaco.editor.getModel(uri);

      if (!model) {
        const content = files[activeFile] ?? "";
        model = monaco.editor.createModel(content, undefined, uri);
        console.log(`Created new model for ${activeFile}`);
      } else {
        console.log(`Using existing model for ${activeFile}`);
      }

      modelRef.current = model;

      // Attach model to editor with retry logic
      const attachModel = () => {
        try {
          if (!model || model.isDisposed()) {
            console.warn("Model is disposed, cannot attach");
            return false;
          }

          // Check if editor exists and is mounted
          const domNode = editor.getDomNode?.();
          if (!domNode) {
            console.warn("Editor DOM node not available yet");
            return false;
          }

          // Directly set model - Monaco will handle DOM readiness
          editor.setModel(model);
          console.log(`Model attached for ${activeFile}`);
          return true;
        } catch (err) {
          console.warn("Error attaching model:", err);
          return false;
        }
      };

      // Try to attach immediately, with fallback retry
      if (!attachModel()) {
        // If immediate attach fails, retry after a short delay
        setTimeout(() => {
          if (mounted) {
            attachModel();
          }
        }, 50);
      }

      // Initialize Yjs binding after provider syncs
      const initBinding = async () => {
        if (!mounted || !model || model.isDisposed()) return;

        // Check if editor is ready (less strict check)
        try {
          const domNode = editor.getDomNode?.();
          if (!domNode) {
            console.warn("Editor DOM not ready, retrying binding init...");
            // Retry after a short delay
            setTimeout(() => {
              if (mounted) initBinding();
            }, 100);
            return;
          }
        } catch (err) {
          console.warn("Error checking editor DOM:", err);
          return;
        }

        try {
          const { MonacoBinding } = await import("y-monaco");
          if (!mounted || !model || model.isDisposed()) return;

          // Verify editor is still available after async import
          const domNode = editor.getDomNode?.();
          if (!domNode) {
            console.warn("Editor DOM removed during import, skipping binding");
            return;
          }

          const ytext = ydoc.getText("monaco");
          const ymap = ydoc.getMap("metadata");

          // Initialize content only if Yjs doc is empty OR if force refresh is triggered
          const isInitialized = ymap.get("initialized");
          const hasContent = ytext.length > 0;
          const lastForceRefresh =
            (ymap.get("lastForceRefresh") as number) || 0;
          const shouldForceRefresh =
            forceRefresh && forceRefresh > lastForceRefresh;

          if (!isInitialized && !hasContent) {
            const initialContent = files[activeFile] ?? "";
            if (initialContent) {
              console.log(`Initializing Yjs content for ${activeFile}`);
              ytext.insert(0, initialContent);
            }
            ymap.set("initialized", true);
            if (forceRefresh) {
              ymap.set("lastForceRefresh", forceRefresh);
            }
          } else if (shouldForceRefresh) {
            // Force refresh: overwrite Yjs content with current file content
            const newContent = files[activeFile] ?? "";
            console.log(`Force refreshing Yjs content for ${activeFile}`);

            // Clear existing content and insert new content
            if (ytext.length > 0) {
              ytext.delete(0, ytext.length);
            }
            if (newContent) {
              ytext.insert(0, newContent);
            }
            ymap.set("lastForceRefresh", forceRefresh);
          } else {
            // Normal sync: prefer Yjs content over local files
            const yjsContent = ytext.toString();
            if (yjsContent !== files[activeFile]) {
              console.log(`Syncing local content from Yjs`);
              files[activeFile] = yjsContent;
            }
          }

          // Create binding
          const binding = new MonacoBinding(
            ytext,
            model,
            new Set([editor]),
            provider.awareness,
          );
          bindingRef.current = binding;

          // Observe ytext changes to update local files
          const observer = () => {
            if (!mounted || !files || !activeFile) return;
            files[activeFile] = ytext.toString();
          };
          ytext.observe(observer);
          ytextObserverRef.current = observer;

          console.log(`Yjs binding established for ${activeFile}`);
        } catch (err) {
          if (process.env.NODE_ENV !== "test") {
            console.error("Failed to create MonacoBinding:", err);
          }
        }
      };

      // Wait for provider to sync
      if (provider.synced) {
        initBinding();
      } else {
        const onSync = () => {
          if (mounted) initBinding();
          provider.off("synced", onSync);
        };
        provider.on("synced", onSync);
      }

      // Setup awareness
      if (user) {
        provider.awareness.setLocalStateField("user", {
          name: user.username ?? user.email ?? "unknown",
          email: user.email,
          color: randomColor(),
          cursor: null,
        });
      }

      const onAwarenessChange = () => {
        if (!mounted) return;

        try {
          // Check if editor is still available before processing awareness changes
          const domNode = editor.getDomNode?.();
          if (!domNode || !domNode.isConnected) {
            return;
          }

          const states = Array.from(
            provider.awareness.getStates().entries(),
          ).map(([clientId, state]) => ({
            clientId: Number(clientId),
            user: state?.user,
            cursor: state?.cursor,
          }));
          setPresence(states);
          updateRemoteCursorDecorations(states);
        } catch (err) {
          console.warn("Error in awareness change handler:", err);
        }
      };

      provider.awareness.on("change", onAwarenessChange);
      awarenessListenerRef.current = onAwarenessChange;

      const cursorListener = editor.onDidChangeCursorPosition((e) => {
        if (!mounted) return;

        // Safety check before awareness update
        try {
          const domNode = editor.getDomNode?.();
          if (!domNode || !domNode.isConnected) {
            return;
          }

          provider.awareness.setLocalStateField("cursor", {
            line: e.position.lineNumber,
            column: e.position.column,
          });
        } catch (err) {
          console.warn("Error updating cursor position:", err);
        }
      });
      cursorListenerRef.current = cursorListener;
    } catch (err) {
      console.error("Critical error in Yjs setup:", err);
      // Ensure cleanup even if setup fails
      cleanupAll();
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      mounted = false;
      console.log(`Unmounting Yjs for ${activeFile}`);
      cleanupAll();
    };
  }, [
    activeFile,
    projectId,
    currentBranch,
    monaco,
    editor,
    files,
    user,
    forceRefresh,
    cleanupAll,
    updateRemoteCursorDecorations,
  ]);

  return { presence, setEditor, setMonaco };
}
