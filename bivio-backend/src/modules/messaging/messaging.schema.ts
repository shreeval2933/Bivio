import { z } from 'zod';

export const sendMessageSchema = z.object({
  body: z.string().min(1).max(4000),
  attachmentUrls: z.array(z.string().url()).max(10).default([]),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const messageHistoryQuerySchema = z.object({
  cursor: z.string().uuid().optional(), // messageId to page backwards from
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type MessageHistoryQuery = z.infer<typeof messageHistoryQuerySchema>;

export const bulkDeleteNotificationsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});
export type BulkDeleteNotificationsInput = z.infer<typeof bulkDeleteNotificationsSchema>;
