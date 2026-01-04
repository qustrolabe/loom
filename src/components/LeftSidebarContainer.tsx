import { useState } from "react";
import { useLayout } from "@/contexts/LayoutContext.tsx";
import { useConversation } from "@/contexts/ConversationContext.tsx";

import {
  AiOutlineCheck,
  AiOutlineClose,
  AiOutlineDelete,
  AiOutlinePlus,
  AiOutlineSearch,
} from "react-icons/ai";
// import Panel from "./Panel.tsx";

export default function LeftSidebarContainer() {
  const { leftSidebarOpen } = useLayout();
  const {
    conversations,
    currentConversation,
    createConversation,
    selectConversation,
    deleteConversation,
  } = useConversation();

  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter conversations by search query
  const filteredConversations = conversations.filter((conv) =>
    (conv.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewConversation = async () => {
    await createConversation();
  };

  const handleSelectConversation = async (id: string) => {
    await selectConversation(id);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteConversation(id);
    setDeleteConfirmId(null);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(null);
  };

  return (
    <div
      className={`fixed top-0 bottom-0 left-10 z-40 w-64 transition-transform duration-200 ${
        leftSidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="box-border h-full w-full border border-panel-border bg-panel p-2">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="mb-3 border-b border-panel-border pb-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center p-1">
                <h2 className="font-bold text-lg">Conversations</h2>
              </div>
              <button
                type="button"
                onClick={handleNewConversation}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-panel-border bg-panel-2 transition-all hover:brightness-125"
                title="New Conversation"
              >
                <AiOutlinePlus />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <AiOutlineSearch className="absolute top-1/2 left-2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-lg border border-panel-border bg-panel-2 py-1.5 pr-3 pl-8 text-sm"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0
              ? (
                <div className="py-4 text-center text-gray-500 text-sm">
                  {conversations.length === 0
                    ? "No conversations yet"
                    : "No matching conversations"}
                </div>
              )
              : (
                <div className="flex flex-col gap-1">
                  {filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`group flex cursor-pointer items-center justify-between rounded-lg p-2 transition-colors ${
                        currentConversation?.id === conv.id
                          ? "bg-panel-2 border border-panel-border"
                          : "hover:bg-panel-2 border border-transparent"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{conv.name}</div>
                        <div className="text-gray-500 text-xs">
                          {conv.modifiedAt.toLocaleDateString()}
                        </div>
                      </div>

                      {/* Delete button / confirm buttons */}
                      {deleteConfirmId === conv.id
                        ? (
                          <div className="flex flex-row gap-1">
                            <button
                              type="button"
                              onClick={(e) => handleConfirmDelete(e, conv.id)}
                              className="flex h-6 w-6 items-center justify-center rounded-md bg-green-500/20 text-green-500 transition-all hover:bg-green-500/30"
                              title="Confirm delete"
                            >
                              <AiOutlineCheck className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelDelete}
                              className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/20 text-red-500 transition-all hover:bg-red-500/30"
                              title="Cancel"
                            >
                              <AiOutlineClose className="h-4 w-4" />
                            </button>
                          </div>
                        )
                        : (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteClick(e, conv.id)}
                            className="flex h-6 w-6 items-center justify-center rounded-md opacity-0 transition-all hover:bg-red-500/20 hover:text-red-500 group-hover:opacity-100"
                            title="Delete"
                          >
                            <AiOutlineDelete className="h-4 w-4" />
                          </button>
                        )}
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
