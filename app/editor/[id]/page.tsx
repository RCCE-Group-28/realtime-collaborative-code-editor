"use client";

import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import io, { type Socket } from "socket.io-client";
import { useParams } from "next/navigation";
import {
  VscChevronDown,
  VscChevronRight,
  VscFile,
  VscFolder,
  VscFolderOpened,
  VscNewFile,
  VscNewFolder,
} from "react-icons/vsc";

interface FileNode {
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
  content?: string | null; // only for files
}

export default function EditorPage() {
  const { id: projectId } = useParams();

  const [socket, setSocket] = useState<typeof Socket | null>(null);
  const editorRef = useRef<
    import("monaco-editor").editor.IStandaloneCodeEditor | null
  >(null);

  const [projectTitle, setProjectTitle] = useState("Loading...");
  const [activeFile, setActiveFile] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [filesContent, setFilesContent] = useState<Record<string, string>>({});

  // Connect socket and join room
  useEffect(() => {
    if (!projectId) return;

    const newSocket = io("http://localhost:3001");
    setSocket(newSocket);

    newSocket.emit("join-doc", projectId);

    newSocket.on(
      "remote-changes",
      ({ file, content }: { file: string; content: string }) => {
        setFilesContent((prev) => ({ ...prev, [file]: content }));
      },
    );

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [projectId]);

  // Fetch project & structure on load
  useEffect(() => {
    if (!projectId) return;

    fetch(`/api/projects/${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        setProjectTitle(data.title);
        const rootNode: FileNode = data.structure;

        // Flatten files for easy access
        const flatFiles: Record<string, string> = {};
        function flatten(node: FileNode, path = "") {
          const currentPath = path ? `${path}/${node.name}` : node.name;
          if (node.type === "file") {
            flatFiles[currentPath] = node.content ?? "";
          } else if (node.children) {
            node.children.forEach((child) => flatten(child, currentPath));
          }
        }
        flatten(rootNode);

        setFilesContent(flatFiles);
        setFileTree([rootNode]);

        const firstFile = Object.keys(flatFiles)[0];
        if (firstFile) setActiveFile(firstFile);

        // Expand root folder by default
        setExpandedFolders(new Set([rootNode.name]));
      });
  }, [projectId]);

  // Editor change handler
  const onEditorChange = (value?: string) => {
    if (!value) return;
    setFilesContent((prev) => {
      const updated = { ...prev, [activeFile]: value };
      return updated;
    });
    socket?.emit("editor-changes", { file: activeFile, content: value });
  };

  // Toggle folder expanded/collapsed
  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) newSet.delete(path);
      else newSet.add(path);
      return newSet;
    });
  };

  // Render the file tree recursively
  const renderTree = (nodes: FileNode[], basePath = "") => {
    return nodes.map((node) => {
      const path = basePath ? `${basePath}/${node.name}` : node.name;

      if (node.type === "folder") {
        const isExpanded = expandedFolders.has(path);
        return (
          <div key={path} className="ml-2">
            <div
              className="cursor-pointer flex items-center gap-1 px-2 py-1 hover:bg-gray-700 rounded select-none"
              onClick={() => toggleFolder(path)}
            >
              {isExpanded ? <VscChevronDown /> : <VscChevronRight />}
              {isExpanded ? <VscFolderOpened /> : <VscFolder />}
              <span>{node.name}</span>
              <AddNodeButtons parentPath={path} onAdd={handleAddNode} />
            </div>
            {isExpanded && node.children && (
              <div className="ml-4">{renderTree(node.children, path)}</div>
            )}
          </div>
        );
      } else {
        return (
          <div
            key={path}
            className={`cursor-pointer flex items-center gap-2 px-2 py-1 hover:bg-gray-700 rounded text-sm select-none ${
              activeFile === path ? "bg-gray-700" : ""
            }`}
            onClick={() => setActiveFile(path)}
          >
            <VscFile />
            <span>{node.name}</span>
          </div>
        );
      }
    });
  };

  // Add new file or folder to the tree
  function handleAddNode(type: "file" | "folder", parentPath: string) {
    const name = prompt(`Enter ${type} name`);
    if (!name) return;
    const nodeName = name; // Assert non-null here

    // Deep copy the fileTree so React notices changes
    const newTree = JSON.parse(JSON.stringify(fileTree)) as FileNode[];

    function addNode(nodes: FileNode[], currentPath: string): boolean {
      for (const node of nodes) {
        const nodePath = currentPath
          ? `${currentPath}/${node.name}`
          : node.name;

        if (nodePath === parentPath) {
          if (!node.children) node.children = [];
          if (type === "file") {
            node.children.push({ name: nodeName, type, content: "" });
            const fullPath = `${nodePath}/${nodeName}`;
            setFilesContent((prev) => ({ ...prev, [fullPath]: "" }));
          } else {
            node.children.push({ name: nodeName, type, children: [] });
          }
          return true;
        }

        if (node.children && addNode(node.children, nodePath)) {
          return true;
        }
      }
      return false;
    }
    addNode(newTree, "");
    setFileTree(newTree);
    setExpandedFolders((prev) => new Set(prev).add(parentPath));
  }

  // Reconstruct the nested structure to save in DB
  function reconstructTree(nodes: FileNode[], basePath = ""): FileNode[] {
    return nodes.map((node) => {
      const path = basePath ? `${basePath}/${node.name}` : node.name;
      if (node.type === "folder") {
        return {
          name: node.name,
          type: "folder",
          children: node.children ? reconstructTree(node.children, path) : [],
        };
      } else {
        return {
          name: node.name,
          type: "file",
          content: filesContent[path] || "",
        };
      }
    });
  }

  // Save updated project structure and files to DB
  const handleSave = async () => {
    if (!projectId) return alert("No project ID!");

    const updatedStructure = reconstructTree(fileTree)[0]; // root node

    const res = await fetch(`/api/projects/${projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ structure: updatedStructure }),
    });

    if (res.ok) alert("Project saved!");
    else alert("Failed to save project");
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 p-4 overflow-y-auto text-sm">
        <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">
          {projectTitle}
        </h2>
        <div>{renderTree(fileTree)}</div>
        <button
          onClick={() => handleAddNode("folder", "root")}
          className="mt-4 bg-blue-600 hover:bg-blue-700 w-full py-1 rounded"
        >
          + New Folder in root
        </button>
        <button
          onClick={() => handleAddNode("file", "root")}
          className="mt-2 bg-green-600 hover:bg-green-700 w-full py-1 rounded"
        >
          + New File in root
        </button>
      </aside>

      {/* Editor and toolbar */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-center bg-gray-800 px-4 py-2 border-b border-gray-700">
          <div>
            Editing: <strong>{activeFile || "No file selected"}</strong>
          </div>
          <button
            onClick={handleSave}
            className="bg-purple-700 hover:bg-purple-800 px-4 py-1 rounded"
          >
            Save Project
          </button>
        </div>

        <Editor
          height="100%"
          theme="vs-dark"
          defaultLanguage="javascript"
          value={filesContent[activeFile] || ""}
          onMount={(editor) => (editorRef.current = editor)}
          onChange={onEditorChange}
          options={{
            minimap: { enabled: false },
          }}
        />
      </div>
    </div>
  );
}

// Small buttons for adding new files/folders inside each folder node
function AddNodeButtons({
  parentPath,
  onAdd,
}: {
  parentPath: string;
  onAdd: (type: "file" | "folder", parentPath: string) => void;
}) {
  return (
    <div className="ml-auto flex gap-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAdd("file", parentPath);
        }}
        title="Add File"
        className="text-green-400 hover:text-green-600"
      >
        <VscNewFile />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAdd("folder", parentPath);
        }}
        title="Add Folder"
        className="text-blue-400 hover:text-blue-600"
      >
        <VscNewFolder />
      </button>
    </div>
  );
}
