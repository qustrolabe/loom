/**
 * SQLite-based Conversation Service using Tauri invoke
 */

import {
  deleteConversation,
  getConversation,
  getConversations,
  saveConversation,
} from "@/db/invoke.ts";
import type { ConversationMeta, ProjectData } from "@/schemas/schemas.ts";
import type { IConversationService } from "./ConversationService.ts";

export class SqliteConversationService implements IConversationService {
  async getConversations(): Promise<ConversationMeta[]> {
    return getConversations();
  }

  async getConversation(id: string): Promise<ProjectData | null> {
    return getConversation(id);
  }

  async saveConversation(conversation: ProjectData): Promise<void> {
    return saveConversation(conversation);
  }

  async deleteConversation(id: string): Promise<void> {
    return deleteConversation(id);
  }
}

export const sqliteConversationService = new SqliteConversationService();
