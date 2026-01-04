/**
 * Type-safe Tauri invoke wrapper
 * Provides typed interface for all database commands
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  ConversationMeta,
  MessageNode,
  ProjectData,
} from "@/schemas/schemas";

// ============================================================================
// Error Types
// ============================================================================

export class DatabaseError extends Error {
  constructor(
    public command: string,
    public cause: unknown,
  ) {
    super(`Database command '${command}' failed: ${cause}`);
    this.name = "DatabaseError";
  }
}

// ============================================================================
// Backend Response Types (match Rust structs)
// ============================================================================

interface ConversationResponse {
  id: string;
  created_at: number;
  modified_at: number;
  name: string;
}

interface MessageNodeResponse {
  id: string;
  created_at: number;
  parent_id: string | null;
  children_ids: string[];
  model_id: string | null;
  content: string | null;
  role: string | null;
}

interface ConversationWithNodesResponse {
  id: string;
  created_at: number;
  modified_at: number;
  name: string;
  message_nodes: MessageNodeResponse[];
}

interface MessageNodeInput {
  id: string;
  created_at: number;
  parent_id: string | null;
  model_id: string | null;
  content: string | null;
  role: string | null;
}

interface ConversationInput {
  id: string;
  created_at: number;
  modified_at: number;
  name: string;
  message_nodes: Record<string, MessageNodeInput>;
}

// ============================================================================
// Command Definitions
// ============================================================================

type Commands = {
  get_conversations: {
    args: Record<string, never>;
    result: ConversationResponse[];
  };
  get_conversation: {
    args: { id: string };
    result: ConversationWithNodesResponse | null;
  };
  save_conversation: {
    args: { conversation: ConversationInput };
    result: null;
  };
  delete_conversation: { args: { id: string }; result: null };
  get_table_names: { args: Record<string, never>; result: string[] };
  get_table_rows: {
    args: { table: string };
    result: Record<string, unknown>[];
  };
  get_table_info: { args: { table: string }; result: TableColumn[] };
};

export interface TableColumn {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  pk: number;
}

// ============================================================================
// Generic Invoke Function
// ============================================================================

async function invokeCommand<K extends keyof Commands>(
  command: K,
  args: Commands[K]["args"],
): Promise<Commands[K]["result"]> {
  console.log(`[invoke] ${command}`, args);
  try {
    const result = await invoke<Commands[K]["result"]>(command, args);
    console.log(`[invoke] ${command} success`);
    return result;
  } catch (error) {
    console.error(`[invoke] ${command} error:`, error);
    throw new DatabaseError(command, error);
  }
}

// ============================================================================
// Conversion Helpers
// ============================================================================

function timestampToDate(ts: number): Date {
  return new Date(ts);
}

function dateToTimestamp(d: Date): number {
  return d.getTime();
}

function convertConversationMeta(resp: ConversationResponse): ConversationMeta {
  return {
    id: resp.id as `${string}-${string}-${string}-${string}-${string}`,
    createdAt: timestampToDate(resp.created_at),
    modifiedAt: timestampToDate(resp.modified_at),
    name: resp.name,
  };
}

function convertConversationWithNodes(
  resp: ConversationWithNodesResponse,
): ProjectData {
  const messageNodes: Record<string, MessageNode> = {};

  for (const node of resp.message_nodes) {
    messageNodes[node.id] = {
      id: node.id as `${string}-${string}-${string}-${string}-${string}`,
      createdAt: timestampToDate(node.created_at),
      parentId: node.parent_id as
        | `${string}-${string}-${string}-${string}-${string}`
        | null,
      childrenIds: node
        .children_ids as `${string}-${string}-${string}-${string}-${string}`[],
      modelId: node.model_id,
      content: node.content,
      role: node.role as "user" | "assistant" | "system" | null,
    };
  }

  return {
    id: resp.id as `${string}-${string}-${string}-${string}-${string}`,
    createdAt: timestampToDate(resp.created_at),
    modifiedAt: timestampToDate(resp.modified_at),
    name: resp.name,
    messageNodes,
  };
}

function convertProjectDataToInput(data: ProjectData): ConversationInput {
  const messageNodes: Record<string, MessageNodeInput> = {};

  for (const [id, node] of Object.entries(data.messageNodes)) {
    messageNodes[id] = {
      id: node.id,
      created_at: dateToTimestamp(node.createdAt),
      parent_id: node.parentId,
      model_id: node.modelId,
      content: node.content,
      role: node.role,
    };
  }

  return {
    id: data.id,
    created_at: dateToTimestamp(data.createdAt),
    modified_at: dateToTimestamp(data.modifiedAt),
    name: data.name,
    message_nodes: messageNodes,
  };
}

// ============================================================================
// Public API
// ============================================================================

export async function getConversations(): Promise<ConversationMeta[]> {
  const result = await invokeCommand("get_conversations", {});
  return result.map(convertConversationMeta);
}

export async function getConversation(id: string): Promise<ProjectData | null> {
  const result = await invokeCommand("get_conversation", { id });
  return result ? convertConversationWithNodes(result) : null;
}

export async function saveConversation(
  conversation: ProjectData,
): Promise<void> {
  const input = convertProjectDataToInput(conversation);
  await invokeCommand("save_conversation", { conversation: input });
}

export async function deleteConversation(id: string): Promise<void> {
  await invokeCommand("delete_conversation", { id });
}

// Debug functions
export async function getTableNames(): Promise<string[]> {
  return await invokeCommand("get_table_names", {});
}

export async function getTableRows(
  table: string,
): Promise<Record<string, unknown>[]> {
  return await invokeCommand("get_table_rows", { table });
}

export async function getTableInfo(table: string): Promise<TableColumn[]> {
  return await invokeCommand("get_table_info", { table });
}
