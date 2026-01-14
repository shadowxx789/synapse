/**
 * Message Service - High-level API for sending and receiving encrypted messages
 *
 * This service wraps the low-level Firebase messageService and cryptoService
 * to provide a simple interface for sending/receiving encrypted messages.
 */

import {
    messageService as firebaseMessageService,
    FirestoreMessage,
    MessageType,
    Unsubscribe,
} from './firebase';
import { cryptoService, DecryptedMessageContent } from './cryptoService';
import { withRetryAndTimeout, getErrorMessage, isRetryableError } from './errorService';

// ============================================================================
// Types
// ============================================================================

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

            // Create the Firestore message
            const messageId = await firebaseMessageService.create({
                id: '', // Will be set by Firestore
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
        message: FirestoreMessage,
        coupleSecret: string
    ): Promise<DecryptedMessage> {
        const content = await cryptoService.decrypt(
            message.encryptedContent,
            message.iv,
            coupleSecret
        );

        return {
            id: message.id,
            coupleId: message.coupleId,
            senderId: message.senderId,
            type: message.type,
            content,
            createdAt: message.createdAt?.toDate() || new Date(),
            readAt: message.readAt?.toDate(),
            readBy: message.readBy,
        };
    },

    /**
     * Decrypt multiple messages
     */
    async decryptMessages(
        messages: FirestoreMessage[],
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
            const messages = await firebaseMessageService.getMessagesForCouple(
                coupleId,
                limit
            );
            return this.decryptMessages(messages, coupleSecret);
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
        return firebaseMessageService.subscribeToMessages(
            coupleId,
            async (messages) => {
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
            await firebaseMessageService.markAsRead(messageId, userId);
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
            return firebaseMessageService.getUnreadCount(coupleId, userId);
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
            await firebaseMessageService.deleteMessage(messageId);
        }, 5000, {
            maxRetries: 2,
            initialDelayMs: 500,
            retryCondition: isRetryableError,
        });
    },
};

export default encryptedMessageService;
