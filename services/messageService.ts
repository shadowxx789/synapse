/**
 * Message Service - High-level API for sending and receiving encrypted messages
 *
 * This service wraps the backend messageService and cryptoService
 * to provide a simple interface for sending/receiving encrypted messages.
 */

import { messageService as baseMessageService, MessageType, Unsubscribe } from '@/services/backend';
import { cryptoService, DecryptedMessageContent } from '@/services/cryptoService';
import { withRetryAndTimeout, isRetryableError } from '@/services/errorService';

// ============================================================================
// Types
// ============================================================================

interface MessageMetadata {
    messageType: MessageType;
    hasAttachment: boolean;
}

interface TimestampLike {
    toDate: () => Date;
}

interface BackendMessage {
    id: string;
    coupleId?: string;
    couple_id?: string;
    senderId?: string;
    sender_id?: string;
    type: MessageType | string;
    encryptedContent?: string;
    encrypted_content?: string;
    iv: string;
    metadata?: MessageMetadata | null;
    createdAt?: string | TimestampLike;
    created_at?: string;
    readAt?: string | TimestampLike | null;
    read_at?: string | null;
    readBy?: string | null;
    read_by?: string | null;
}

interface NormalizedMessage {
    id: string;
    coupleId: string;
    senderId: string;
    type: MessageType;
    encryptedContent: string;
    iv: string;
    metadata?: MessageMetadata | null;
    createdAt: Date;
    readAt?: Date;
    readBy?: string;
}

export interface DecryptedMessage {
    id: string;
    coupleId: string;
    senderId: string;
    type: MessageType;
    content: DecryptedMessageContent;
    createdAt: Date;
    readAt?: Date;
    readBy?: string;
}

export interface SendMessageParams {
    coupleId: string;
    senderId: string;
    content: DecryptedMessageContent;
    coupleSecret: string;
}

interface BackendMessageService {
    create: (message: {
        id: string;
        coupleId: string;
        senderId: string;
        type: MessageType;
        encryptedContent: string;
        iv: string;
        metadata?: MessageMetadata;
    }) => Promise<string>;
    getMessagesForCouple: (coupleId: string, limit?: number) => Promise<BackendMessage[]>;
    subscribeToMessages: (coupleId: string, callback: (messages: BackendMessage[]) => void) => Unsubscribe;
    markAsRead: (messageId: string, userId: string) => Promise<void>;
    getUnreadCount: (coupleId: string, userId: string) => Promise<number>;
    deleteMessage: (messageId: string) => Promise<void>;
}

const backendMessageService = baseMessageService as BackendMessageService;

const isTimestampLike = (value: unknown): value is TimestampLike => {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as { toDate?: unknown };
    return typeof candidate.toDate === 'function';
};

const toDate = (value: string | TimestampLike | null | undefined): Date => {
    if (!value) return new Date();
    if (typeof value === 'string') return new Date(value);
    if (isTimestampLike(value)) return value.toDate();
    return new Date();
};

const normalizeMessage = (message: BackendMessage): NormalizedMessage => {
    const createdAtRaw = message.createdAt ?? message.created_at;
    const readAtRaw = message.readAt ?? message.read_at;

    const messageType = message.type as MessageType;

    return {
        id: message.id,
        coupleId: message.coupleId ?? message.couple_id ?? '',
        senderId: message.senderId ?? message.sender_id ?? '',
        type: messageType,
        encryptedContent: message.encryptedContent ?? message.encrypted_content ?? '',
        iv: message.iv,
        metadata: message.metadata ?? null,
        createdAt: toDate(createdAtRaw),
        readAt: readAtRaw ? toDate(readAtRaw) : undefined,
        readBy: message.readBy ?? message.read_by ?? undefined,
    };
};

// ============================================================================
// Message Service (High-level API)
// ============================================================================

export const encryptedMessageService = {
    /**
     * Send an encrypted message
     */
    async send(params: SendMessageParams): Promise<string> {
        const { coupleId, senderId, content, coupleSecret } = params;

        return withRetryAndTimeout(async () => {
            // Encrypt the message content
            const { encryptedContent, iv } = await cryptoService.encrypt(
                content,
                coupleSecret
            );

            // Create the message
            const messageId = await backendMessageService.create({
                id: '',
                coupleId,
                senderId,
                type: content.type,
                encryptedContent,
                iv,
                metadata: {
                    messageType: content.type,
                    hasAttachment: false,
                },
            });

            return messageId;
        }, 15000, {
            maxRetries: 3,
            initialDelayMs: 1000,
            retryCondition: isRetryableError,
        });
    },

    /**
     * Send a text message
     */
    async sendText(
        coupleId: string,
        senderId: string,
        text: string,
        coupleSecret: string
    ): Promise<string> {
        return this.send({
            coupleId,
            senderId,
            content: {
                type: 'text',
                text,
                timestamp: Date.now(),
            },
            coupleSecret,
        });
    },

    /**
     * Send a task request message
     */
    async sendTaskRequest(
        coupleId: string,
        senderId: string,
        taskId: string,
        taskTitle: string,
        taskDescription: string | undefined,
        coupleSecret: string
    ): Promise<string> {
        return this.send({
            coupleId,
            senderId,
            content: {
                type: 'task_request',
                taskId,
                taskTitle,
                taskDescription,
                timestamp: Date.now(),
            },
            coupleSecret,
        });
    },

    /**
     * Send a task update message
     */
    async sendTaskUpdate(
        coupleId: string,
        senderId: string,
        taskId: string,
        taskTitle: string,
        text: string,
        coupleSecret: string
    ): Promise<string> {
        return this.send({
            coupleId,
            senderId,
            content: {
                type: 'task_update',
                taskId,
                taskTitle,
                text,
                timestamp: Date.now(),
            },
            coupleSecret,
        });
    },

    /**
     * Send an energy boost message
     */
    async sendEnergyBoost(
        coupleId: string,
        senderId: string,
        energyPoints: number,
        text: string | undefined,
        coupleSecret: string
    ): Promise<string> {
        return this.send({
            coupleId,
            senderId,
            content: {
                type: 'energy_boost',
                energyPoints,
                text,
                timestamp: Date.now(),
            },
            coupleSecret,
        });
    },

    /**
     * Send a mood share message
     */
    async sendMoodShare(
        coupleId: string,
        senderId: string,
        mood: string,
        text: string | undefined,
        coupleSecret: string
    ): Promise<string> {
        return this.send({
            coupleId,
            senderId,
            content: {
                type: 'mood_share',
                mood,
                text,
                timestamp: Date.now(),
            },
            coupleSecret,
        });
    },

    /**
     * Decrypt a single message
     */
    async decryptMessage(
        message: BackendMessage,
        coupleSecret: string
    ): Promise<DecryptedMessage> {
        const normalized = normalizeMessage(message);
        const content = await cryptoService.decrypt(
            normalized.encryptedContent,
            normalized.iv,
            coupleSecret
        );

        return {
            id: normalized.id,
            coupleId: normalized.coupleId,
            senderId: normalized.senderId,
            type: normalized.type,
            content,
            createdAt: normalized.createdAt,
            readAt: normalized.readAt,
            readBy: normalized.readBy,
        };
    },

    /**
     * Decrypt multiple messages
     */
    async decryptMessages(
        messages: BackendMessage[],
        coupleSecret: string
    ): Promise<DecryptedMessage[]> {
        const decrypted = await Promise.all(
            messages.map((msg) => this.decryptMessage(msg, coupleSecret))
        );
        return decrypted;
    },

    /**
     * Get and decrypt messages for a couple
     */
    async getMessages(
        coupleId: string,
        coupleSecret: string,
        limit?: number
    ): Promise<DecryptedMessage[]> {
        return withRetryAndTimeout(async () => {
            const messages = await backendMessageService.getMessagesForCouple(
                coupleId,
                limit
            );
            return this.decryptMessages(messages as BackendMessage[], coupleSecret);
        }, 10000, {
            maxRetries: 2,
            initialDelayMs: 500,
            retryCondition: isRetryableError,
        });
    },

    /**
     * Subscribe to messages with automatic decryption
     */
    subscribeToMessages(
        coupleId: string,
        coupleSecret: string,
        callback: (messages: DecryptedMessage[]) => void,
        onError?: (error: Error) => void
    ): Unsubscribe {
        return backendMessageService.subscribeToMessages(
            coupleId,
            async (messages: BackendMessage[]) => {
                try {
                    const decrypted = await this.decryptMessages(messages, coupleSecret);
                    callback(decrypted);
                } catch (error) {
                    console.error('Failed to decrypt messages:', error);
                    onError?.(error as Error);
                }
            }
        );
    },

    /**
     * Mark a message as read
     */
    async markAsRead(messageId: string, userId: string): Promise<void> {
        return withRetryAndTimeout(async () => {
            await backendMessageService.markAsRead(messageId, userId);
        }, 8000, {
            maxRetries: 2,
            initialDelayMs: 500,
            retryCondition: isRetryableError,
        });
    },

    /**
     * Get unread message count
     */
    async getUnreadCount(coupleId: string, userId: string): Promise<number> {
        return withRetryAndTimeout(async () => {
            return backendMessageService.getUnreadCount(coupleId, userId);
        }, 5000, {
            maxRetries: 2,
            initialDelayMs: 500,
            retryCondition: isRetryableError,
        });
    },

    /**
     * Delete a message
     */
    async deleteMessage(messageId: string): Promise<void> {
        return withRetryAndTimeout(async () => {
            await backendMessageService.deleteMessage(messageId);
        }, 5000, {
            maxRetries: 2,
            initialDelayMs: 500,
            retryCondition: isRetryableError,
        });
    },
};

export default encryptedMessageService;
