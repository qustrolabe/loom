import { z } from "zod";

export const UUID = z.uuid().meta({
  description: "A universally unique identifier (UUID)",
});

export const MessageNodeSchema = z.object({
  id: UUID,

  createdAt: z.date(),

  parentId: UUID.nullable(),
  childrenIds: z.array(UUID),

  modelId: z.string().nullable(),
  content: z.string().nullable(),
  role: z.enum(["user", "assistant", "system", "text"]).nullable(),
});

export type MessageNode = z.infer<typeof MessageNodeSchema>;

export const ProjectDataSchema = z.object({
  id: UUID,
  createdAt: z.date(),
  modifiedAt: z.date(),
  name: z.string().min(1),

  messageNodes: z.record(UUID, MessageNodeSchema),
});

export type ProjectData = z.infer<typeof ProjectDataSchema>;

export const ConversationMetaSchema = z.object({
  id: UUID,
  createdAt: z.date(),
  modifiedAt: z.date(),
  name: z.string(),
});

export type ConversationMeta = z.infer<typeof ConversationMetaSchema>;
