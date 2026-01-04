import { useEffect, useRef, useState } from "react";

import {
  AiOutlineArrowRight,
  AiOutlineBranches,
  AiOutlineFileText,
  AiOutlineMenu,
  AiOutlinePlus,
  AiOutlineReload,
  AiOutlineRobot,
  AiOutlineSend,
  AiOutlineThunderbolt,
} from "react-icons/ai";
import { useConversation } from "@/contexts/ConversationContext.tsx";
import { ModelInfo, modelService } from "@/services/ModelService.ts";
import { ProjectData } from "@/schemas/schemas.ts";

interface ChatContentProps {
  className?: string;
  onToggleChat: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

type ChatMode = "assistant" | "base";

export default function ChatContent({
  className,
  onToggleChat,
  onToggleSidebar,
  isSidebarOpen,
}: ChatContentProps) {
  const {
    currentConversation,
    selectedNodeId,
    selectedModelId,
    setSelectedModelId,
    addMessage,
    getPathToNode,
    selectNode,
    createConversation,
  } = useConversation();

  const [mode, setMode] = useState<ChatMode>("assistant");
  const [inputValue, setInputValue] = useState("");
  const [maxTokens, setMaxTokens] = useState<number>(32);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load models on mount
  useEffect(() => {
    modelService.listModels().then(setModels);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight +
        "px";
    }
  }, [inputValue]);

  // Debug logging
  useEffect(() => {
    console.log("ChatPanel render:", {
      currentConversation: currentConversation?.id,
      selectedNodeId,
      nodeCount: currentConversation
        ? Object.keys(currentConversation.messageNodes).length
        : 0,
    });
  }, [currentConversation, selectedNodeId]);

  // Get messages path from root to selected node
  const messagePath = selectedNodeId && currentConversation
    ? getPathToNode(selectedNodeId)
    : [];
  // Filter out root node (no content) for display
  const displayMessages = messagePath.filter((m) => m.content !== null);

  console.log(
    "displayMessages:",
    displayMessages.length,
    displayMessages.map((m) => m.id.slice(0, 8)),
  );

  const ensureConversation = async () => {
    let conversation = currentConversation;
    if (!conversation) {
      conversation = await createConversation();
    }
    return conversation;
  };

  const getParentId = (conversation: ProjectData) => {
    let parentId = selectedNodeId;
    if (!parentId || !conversation.messageNodes[parentId]) {
      const rootNode = Object.values(conversation.messageNodes).find(
        (n) => n.parentId === null,
      );
      parentId = rootNode?.id ?? null;
    }
    return parentId;
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === "" || isLoading) return;

    const conversation = await ensureConversation();
    setIsLoading(true);
    const userContent = inputValue;
    setInputValue("");

    try {
      const parentId = getParentId(conversation);

      // Add user message
      const { node: userMessage, conversation: updatedConv } = await addMessage(
        parentId,
        userContent,
        "user",
        conversation,
      );

      // Generate AI response
      const response = await modelService.generateResponse(
        [{ role: "user", content: userContent }],
        selectedModelId,
      );

      // Add assistant message
      await addMessage(userMessage.id, response, "assistant", updatedConv);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  };

  const handleBaseAddText = async () => {
    if (inputValue.trim() === "" || isLoading) return;

    const conversation = await ensureConversation();
    setIsLoading(true);
    const textContent = inputValue;
    setInputValue("");

    try {
      const parentId = getParentId(conversation);
      await addMessage(parentId, textContent, "text", conversation);
    } catch (error) {
      console.error("Failed to add text:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const executeBaseGenerate = async () => {
    if (isLoading) return;
    const conversation = await ensureConversation();
    setIsLoading(true);

    try {
      let parentId = getParentId(conversation);
      let updatedConv = conversation;

      // Add text if present
      if (inputValue.trim() !== "") {
        const result = await addMessage(
          parentId,
          inputValue,
          "text",
          conversation,
        );
        parentId = result.node.id;
        updatedConv = result.conversation;
        setInputValue("");
      }

      // Build prompt from the updated conversation state
      const pathNodes = [];
      let curr = parentId ? updatedConv.messageNodes[parentId] : null;
      while (curr) {
        if (curr.content !== null) pathNodes.unshift(curr);
        curr = curr.parentId ? updatedConv.messageNodes[curr.parentId] : null;
      }
      const prompt = pathNodes.map((n) => n.content).join("");

      const response = await modelService.generateCompletion(
        prompt,
        selectedModelId,
        { maxTokens },
      );

      await addMessage(parentId, response, "text", updatedConv);
    } catch (e) {
      console.error("Base generate error", e);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  };

  const handleBranchFrom = (nodeId: string) => {
    selectNode(nodeId);
  };

  return (
    <div className={`flex h-full flex-col ${className || ""}`}>
      {/* Top Controls */}
      <div className="flex min-h-[48px] flex-row items-center justify-between border-b border-panel-border p-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("assistant")}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-bold transition-colors ${
              mode === "assistant"
                ? "bg-panel-selected text-accent"
                : "text-foreground-muted hover:bg-panel-2"
            }`}
          >
            <AiOutlineRobot /> Assistant
          </button>
          <button
            type="button"
            onClick={() => setMode("base")}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-bold transition-colors ${
              mode === "base"
                ? "bg-panel-selected text-accent"
                : "text-foreground-muted hover:bg-panel-2"
            }`}
          >
            <AiOutlineFileText /> Base
          </button>
        </div>
        <div className="flex gap-2">
          {/* Model Picker */}
          <select
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            className="h-8 max-w-[150px] rounded-lg border border-panel-border bg-panel px-2 text-sm"
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => modelService.listModels().then(setModels)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-panel text-foreground-muted transition-colors hover:bg-panel-2"
            title="Refresh Models"
          >
            <AiOutlineReload />
          </button>

          <button
            type="button"
            onClick={onToggleSidebar}
            className={`flex h-8 w-8 items-center justify-center rounded-lg bg-panel transition-colors hover:bg-panel-2 ${
              isSidebarOpen
                ? "bg-panel-selected text-accent"
                : "text-foreground-muted"
            }`}
            title="Toggle Sidebar"
          >
            <AiOutlineMenu />
          </button>
          <button
            type="button"
            onClick={onToggleChat}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-panel text-foreground-muted transition-colors hover:bg-panel-2"
            title="Close Chat"
          >
            <AiOutlineArrowRight />
          </button>
        </div>
      </div>

      {/* Messages / Content container */}
      <div className="flex flex-1 flex-col gap-2 overflow-auto p-4">
        {!currentConversation && (
          <div className="py-8 text-center text-gray-500">
            Start a new conversation by typing...
          </div>
        )}

        {mode === "assistant"
          ? (
            // Assistant Mode View
            <>
              {displayMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${
                    msg.role === "user"
                      ? "text-left bg-panel-2"
                      : "text-left border-panel-border border bg-panel"
                  } group relative rounded-xl p-3`}
                >
                  <div className="mb-1 text-gray-500 text-xs uppercase opacity-70">
                    {msg.role}
                  </div>
                  <div className="wrap-break-word whitespace-pre-wrap">
                    {msg.content}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBranchFrom(msg.id)}
                    className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-md border border-panel-border bg-panel-2 opacity-0 transition-opacity hover:bg-panel group-hover:opacity-100"
                    title="Branch from here"
                  >
                    <AiOutlineBranches className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </>
          )
          : (
            // Base Mode View
            <div className="rounded-sm bg-panel p-4 shadow-sm min-h-[50%] font-mono text-sm whitespace-pre-wrap break-words leading-relaxed">
              {displayMessages.map((msg) => (
                <span
                  key={msg.id}
                  onClick={() => handleBranchFrom(msg.id)} // Click to select context
                  className={`cursor-pointer transition-colors hover:bg-panel-2 ${
                    selectedNodeId === msg.id
                      ? "bg-panel-selected text-accent"
                      : ""
                  }`}
                  title="Click to branch from here"
                >
                  {msg.content}
                </span>
              ))}
              {displayMessages.length === 0 && (
                <span className="text-gray-500 italic block">No text yet.</span>
              )}
            </div>
          )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-panel-border border-t bg-panel p-4">
        <div className="rounded-xl border border-panel-border bg-panel-2 p-2">
          <div className="flex flex-col gap-2">
            {/* Text Input */}
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                // Special handling for assistant mode to prevent default on Enter
                if (mode === "assistant" && e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
                // Base mode: let Enter be Enter (newline), but Ctrl+Enter could trigger add?
                if (
                  mode === "base" && e.key === "Enter" &&
                  (e.ctrlKey || e.metaKey)
                ) {
                  e.preventDefault();
                  handleBaseAddText();
                }
              }}
              className="chat-textarea max-h-48 w-full resize-none bg-transparent p-2 focus:outline-none font-mono text-sm"
              placeholder={mode === "assistant"
                ? "Type a message..."
                : "Type text to add..."}
              disabled={isLoading}
            />

            {/* Input Toolbar */}
            <div className="flex flex-row items-center justify-between">
              <div className="text-gray-500 text-xs flex items-center gap-2">
                {selectedNodeId && currentConversation
                  ? <span>Node: {selectedNodeId.slice(0, 8)}...</span>
                  : "No conversation"}
                {mode === "base" && (
                  <div className="flex items-center gap-1 ml-4 border-l border-panel-border pl-2">
                    <span>Max Tokens:</span>
                    <input
                      type="number"
                      value={maxTokens}
                      onChange={(e) =>
                        setMaxTokens(parseInt(e.target.value) || 100)}
                      className="w-16 rounded border border-panel-border bg-panel px-1 py-0.5 text-xs"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {mode === "base" && (
                  <>
                    <button
                      type="button"
                      onClick={handleBaseAddText}
                      disabled={isLoading || inputValue.trim() === ""}
                      className="flex h-8 items-center gap-1 rounded-md bg-panel border border-panel-border px-3 text-xs transition-colors hover:bg-panel-2 disabled:opacity-50"
                      title="Add text without generating"
                    >
                      <AiOutlinePlus /> Add Text
                    </button>
                    <button
                      type="button"
                      onClick={executeBaseGenerate}
                      disabled={isLoading}
                      className="flex h-8 items-center gap-1 rounded-md bg-accent text-white px-3 text-xs transition-colors hover:opacity-90 disabled:opacity-50"
                      title="Add text (if any) and Generate"
                    >
                      <AiOutlineThunderbolt /> Generate
                    </button>
                  </>
                )}

                {mode === "assistant" && (
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={isLoading || inputValue.trim() === ""}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-400 transition-colors hover:bg-neutral-500 disabled:opacity-50"
                    title="Send message"
                  >
                    <AiOutlineSend />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
