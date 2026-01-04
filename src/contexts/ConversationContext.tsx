import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ConversationMeta, MessageNode, ProjectData } from "@/schemas/schemas";
import { conversationService } from "@/services/ConversationService";

interface ConversationContextType {
  // List of all conversations (metadata only)
  conversations: ConversationMeta[];

  // Currently loaded conversation (full data)
  currentConversation: ProjectData | null;

  // Currently selected node id (for chat display path)
  selectedNodeId: string | null;

  // Selected model for responses
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;

  // Navigation
  selectConversation: (id: string) => Promise<void>;
  selectNode: (id: string) => void;

  // Conversation mutations
  createConversation: (name?: string) => Promise<ProjectData>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, name: string) => Promise<void>;
  refreshConversations: () => Promise<void>;

  // Tree operations
  addMessage: (
    parentId: string | null,
    content: string,
    role: "user" | "assistant" | "system" | "text",
    conversationOverride?: ProjectData,
  ) => Promise<{ node: MessageNode; conversation: ProjectData }>;

  // Get path from root to a specific node
  getPathToNode: (nodeId: string) => MessageNode[];
}

const ConversationContext = createContext<ConversationContextType | undefined>(
  undefined,
);

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Create an empty conversation with a root node
 */
function createEmptyConversation(name: string): ProjectData {
  const now = new Date();
  const rootId = generateUUID();

  const rootNode: MessageNode = {
    id: rootId,
    createdAt: now,
    parentId: null,
    childrenIds: [],
    modelId: null,
    content: null, // Root has no content
    role: null,
  };

  return {
    id: generateUUID(),
    createdAt: now,
    modifiedAt: now,
    name,
    messageNodes: {
      [rootId]: rootNode,
    },
  };
}

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [currentConversation, setCurrentConversation] = useState<
    ProjectData | null
  >(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>("mock-gpt-4");

  const refreshConversations = useCallback(async () => {
    const loaded = await conversationService.getConversations();
    setConversations(loaded);
  }, []);

  // Load conversations on mount
  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  const selectConversation = useCallback(async (id: string) => {
    const conversation = await conversationService.getConversation(id);
    if (conversation) {
      setCurrentConversation(conversation);
      // Find root node (parentId === null)
      const rootNode = Object.values(conversation.messageNodes).find(
        (n) => n.parentId === null,
      );
      if (rootNode && rootNode.childrenIds.length > 0) {
        // Select first child of root (first actual message)
        setSelectedNodeId(rootNode.childrenIds[0]);
      } else if (rootNode) {
        // No messages yet, select root
        setSelectedNodeId(rootNode.id);
      }
    }
  }, []);

  const selectNode = useCallback((id: string) => {
    setSelectedNodeId(id);
  }, []);

  const createConversation = useCallback(
    async (name?: string): Promise<ProjectData> => {
      const conversationName = name ||
        `Conversation ${conversations.length + 1}`;
      const newConversation = createEmptyConversation(conversationName);
      await conversationService.saveConversation(newConversation);
      await refreshConversations();
      setCurrentConversation(newConversation);

      // Select root
      const rootNode = Object.values(newConversation.messageNodes).find(
        (n) => n.parentId === null,
      );
      if (rootNode) {
        setSelectedNodeId(rootNode.id);
      }

      return newConversation;
    },
    [conversations.length, refreshConversations],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      await conversationService.deleteConversation(id);
      await refreshConversations();

      // If we deleted the current conversation, clear it
      if (currentConversation?.id === id) {
        setCurrentConversation(null);
        setSelectedNodeId(null);
      }
    },
    [currentConversation?.id, refreshConversations],
  );

  const renameConversation = useCallback(
    async (id: string, name: string) => {
      const conversation = await conversationService.getConversation(id);
      if (conversation) {
        conversation.name = name;
        conversation.modifiedAt = new Date();
        await conversationService.saveConversation(conversation);
        await refreshConversations();

        if (currentConversation?.id === id) {
          setCurrentConversation(conversation);
        }
      }
    },
    [currentConversation?.id, refreshConversations],
  );

  const addMessage = useCallback(
    async (
      parentId: string | null,
      content: string,
      role: "user" | "assistant" | "system" | "text",
      conversationOverride?: ProjectData,
    ): Promise<{ node: MessageNode; conversation: ProjectData }> => {
      const conversation = conversationOverride || currentConversation;
      if (!conversation) {
        throw new Error("No conversation selected");
      }

      const now = new Date();
      const newNodeId = generateUUID();

      // If no parentId, find root
      let actualParentId = parentId;
      if (!actualParentId) {
        const rootNode = Object.values(conversation.messageNodes).find(
          (n) => n.parentId === null,
        );
        actualParentId = rootNode?.id ?? null;
      }

      const newNode: MessageNode = {
        id: newNodeId,
        createdAt: now,
        parentId: actualParentId,
        childrenIds: [],
        modelId: role === "assistant" ? selectedModelId : null,
        content,
        role,
      };

      // Update parent's childrenIds
      const updatedNodes = { ...conversation.messageNodes };
      updatedNodes[newNodeId] = newNode;

      if (actualParentId && updatedNodes[actualParentId]) {
        updatedNodes[actualParentId] = {
          ...updatedNodes[actualParentId],
          childrenIds: [...updatedNodes[actualParentId].childrenIds, newNodeId],
        };
      }

      const updatedConversation: ProjectData = {
        ...conversation,
        modifiedAt: now,
        messageNodes: updatedNodes,
      };

      await conversationService.saveConversation(updatedConversation);
      setCurrentConversation(updatedConversation);
      setSelectedNodeId(newNodeId);
      await refreshConversations();

      return { node: newNode, conversation: updatedConversation };
    },
    [currentConversation, selectedModelId, refreshConversations],
  );

  const getPathToNode = useCallback(
    (nodeId: string): MessageNode[] => {
      if (!currentConversation) return [];

      const path: MessageNode[] = [];
      let currentId: string | null = nodeId;

      while (currentId) {
        const node: MessageNode | undefined =
          currentConversation.messageNodes[currentId];
        if (!node) break;
        path.unshift(node);
        currentId = node.parentId;
      }

      return path;
    },
    [currentConversation],
  );

  return (
    <ConversationContext.Provider
      value={{
        conversations,
        currentConversation,
        selectedNodeId,
        selectedModelId,
        setSelectedModelId,
        selectConversation,
        selectNode,
        createConversation,
        deleteConversation,
        renameConversation,
        refreshConversations,
        addMessage,
        getPathToNode,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation() {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error(
      "useConversation must be used within a ConversationProvider",
    );
  }
  return context;
}
