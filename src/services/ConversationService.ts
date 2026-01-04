import { z } from "zod";
import {
    ProjectData,
    ProjectDataSchema,
    ConversationMeta,
    ConversationMetaSchema,
} from "@/schemas/schemas";
import { SqliteConversationService } from "./SqliteConversationService";

export interface IConversationService {
    // Conversation CRUD
    getConversations(): Promise<ConversationMeta[]>;
    getConversation(id: string): Promise<ProjectData | null>;
    saveConversation(conversation: ProjectData): Promise<void>;
    deleteConversation(id: string): Promise<void>;
}

const STORAGE_KEY_CONVERSATIONS = "loom_conversations";
const STORAGE_KEY_CONVERSATION_PREFIX = "loom_conversation_";

/**
 * Revive date strings from JSON to Date objects
 */
function reviveDates<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === "string") {
        // Check if it looks like an ISO date string
        if (/^\d{4}-\d{2}-\d{2}T/.test(obj)) {
            return new Date(obj) as unknown as T;
        }
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(reviveDates) as unknown as T;
    }
    if (typeof obj === "object") {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
            result[key] = reviveDates(value);
        }
        return result as T;
    }
    return obj;
}

export class LocalStorageConversationService implements IConversationService {
    async getConversations(): Promise<ConversationMeta[]> {
        const data = localStorage.getItem(STORAGE_KEY_CONVERSATIONS);
        if (!data) return [];
        try {
            const parsed = JSON.parse(data);
            const revived = reviveDates(parsed);
            return z.array(ConversationMetaSchema).parse(revived);
        } catch (e) {
            console.error("Failed to parse conversations from local storage", e);
            return [];
        }
    }

    async getConversation(id: string): Promise<ProjectData | null> {
        const data = localStorage.getItem(STORAGE_KEY_CONVERSATION_PREFIX + id);
        if (!data) return null;
        try {
            const parsed = JSON.parse(data);
            const revived = reviveDates(parsed);
            return ProjectDataSchema.parse(revived);
        } catch (e) {
            console.error(`Failed to parse conversation ${id} from local storage`, e);
            return null;
        }
    }

    async saveConversation(conversation: ProjectData): Promise<void> {
        // Save full conversation data
        localStorage.setItem(
            STORAGE_KEY_CONVERSATION_PREFIX + conversation.id,
            JSON.stringify(conversation)
        );

        // Update metadata list
        const metas = await this.getConversations();
        const meta: ConversationMeta = {
            id: conversation.id,
            createdAt: conversation.createdAt,
            modifiedAt: conversation.modifiedAt,
            name: conversation.name,
        };

        const index = metas.findIndex((m) => m.id === conversation.id);
        if (index >= 0) {
            metas[index] = meta;
        } else {
            metas.push(meta);
        }

        // Sort by modifiedAt desc
        metas.sort((a, b) => {
            const da = a.modifiedAt ? new Date(a.modifiedAt).getTime() : 0;
            const db = b.modifiedAt ? new Date(b.modifiedAt).getTime() : 0;
            return db - da;
        });

        localStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(metas));
    }

    async deleteConversation(id: string): Promise<void> {
        // Remove full data
        localStorage.removeItem(STORAGE_KEY_CONVERSATION_PREFIX + id);

        // Remove from metadata list
        const metas = await this.getConversations();
        const filtered = metas.filter((m) => m.id !== id);
        localStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(filtered));
    }
}

export const conversationService = new SqliteConversationService();

// Legacy localStorage implementation kept for reference
// export const localStorageConversationService = new LocalStorageConversationService();

