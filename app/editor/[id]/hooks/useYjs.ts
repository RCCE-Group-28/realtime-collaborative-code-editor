import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type * as Monaco from "monaco-editor";
import type { MonacoBinding } from "y-monaco";
import { randomColor } from "../utils/colorHelpers";
import type { PresenceUser, User } from "../types";

export function useYjs(
  activeFile: string,
  user: User | null,
  projectId: string,
  initialFiles: Record<string, string>,
  files: Record<string, string>,
  currentBranch: string,
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

  // Update remote cursor decorations
  const updateRemoteCursorDecorations = useCallback(
    (states: PresenceUser[]) => {
      if (!providerRef.current || !editor || !monaco) return;
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

      decorationsRef.current = editor.deltaDecorations(
        decorationsRef.current,
        decs,
      );

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
    console.log("🧹 Starting complete cleanup");

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

    console.log("✅ Cleanup complete");
  }, []);

  // Main effect for Yjs setup - depends on activeFile, projectId, currentBranch
  useEffect(() => {
    if (!activeFile || !monaco || !editor) return;

    let mounted = true;
    console.log(`🔄 Setting up Yjs for: ${currentBranch}/${activeFile}`);

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
      "ws://localhost:1234",
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
      console.log(`📝 Created new model for ${activeFile}`);
    } else {
      console.log(`📝 Using existing model for ${activeFile}`);
    }

    modelRef.current = model;

    // Attach model to editor
    if (model && !model.isDisposed()) {
      editor.setModel(model);
    }

    // Initialize Yjs binding after provider syncs
    const initBinding = async () => {
      if (!mounted || !model || model.isDisposed()) return;

      try {
        const { MonacoBinding } = await import("y-monaco");
        if (!mounted || !model || model.isDisposed()) return;

        const ytext = ydoc.getText("monaco");
        const ymap = ydoc.getMap("metadata");

        // Initialize content only if Yjs doc is empty
        const isInitialized = ymap.get("initialized");
        const hasContent = ytext.length > 0;

        if (!isInitialized && !hasContent) {
          const initialContent = files[activeFile] ?? "";
          if (initialContent) {
            console.log(`💾 Initializing Yjs content for ${activeFile}`);
            ytext.insert(0, initialContent);
          }
          ymap.set("initialized", true);
        } else {
          // Sync local files with Yjs content
          const yjsContent = ytext.toString();
          if (yjsContent !== files[activeFile]) {
            console.log(`🔄 Syncing local content from Yjs`);
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

        console.log(`✅ Yjs binding established for ${activeFile}`);
      } catch (err) {
        console.error("Failed to create MonacoBinding:", err);
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
      const states = Array.from(provider.awareness.getStates().entries()).map(
        ([clientId, state]) => ({
          clientId: Number(clientId),
          user: state?.user,
          cursor: state?.cursor,
        }),
      );
      setPresence(states);
      updateRemoteCursorDecorations(states);
    };

    provider.awareness.on("change", onAwarenessChange);
    awarenessListenerRef.current = onAwarenessChange;

    const cursorListener = editor.onDidChangeCursorPosition((e) => {
      if (!mounted) return;
      provider.awareness.setLocalStateField("cursor", {
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });
    cursorListenerRef.current = cursorListener;

    // Cleanup on unmount or when dependencies change
    return () => {
      mounted = false;
      console.log(`🛑 Unmounting Yjs for ${activeFile}`);
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
    cleanupAll,
    updateRemoteCursorDecorations,
  ]);

  return { presence, setEditor, setMonaco };
}
