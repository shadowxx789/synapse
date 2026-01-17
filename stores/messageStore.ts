/**
 * Message Store - Zustand store for managing encrypted messages with offline support
 *
 * Features:
 * - Real-time message sync with Supabase
 * - Automatic encryption/decryption
 * - Offline message caching
 * - Pending message queue for offline sends
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { encryptedMessageService, DecryptedMessage } from '@/services/messageService';
import { Unsubscribe } from '@/services/backend';
import { DecryptedMessageContent, MessageType } from '@/services/cryptoService';

// ============================================================================
// Types
// ============================================================================

export interface PendingMessage {
    id: string; // Temporary local ID
    coupleId: string;
    senderId: string;
    content: DecryptedMessageContent;
    createdAt: Date;
    retryCount: number;
}

export interface MessageState {
    // Message data
    messages: DecryptedMessage[];
    pendingMessages: PendingMessage[];
    unreadCount: number;

    // Connection state
    isSubscribed: boolean;
    lastSyncAt: Date | null;
    syncError: string | null;

    // Current context
    currentCoupleId: string | null;
    currentUserId: string | null;

    // Actions
    setMessages: (messages: DecryptedMessage[]) => void;
    addMessage: (message: DecryptedMessage) => void;
    addPendingMessage: (message: PendingMessage) => void;
    removePendingMessage: (id: string) => void;
    markMessageAsRead: (messageId: string) => void;
    setUnreadCount: (count: number) => void;
    incrementUnreadCount: () => void;
    resetUnreadCount: () => void;

    // Sync actions
    subscribe: (coupleId: string, userId: string, coupleSecret: string) => Unsubscribe | null;
    unsubscribe: () => void;
    setSyncError: (error: string | null) => void;
    setLastSyncAt: (date: Date) => void;

    // Send actions
    sendTextMessage: (text: string, coupleSecret: string) => Promise<string | null>;
    sendTaskRequest: (taskId: string, taskTitle: string, taskDescription: string | undefined, coupleSecret: string) => Promise<string | null>;
    sendTaskUpdate: (taskId: string, taskTitle: string, text: string, coupleSecret: string) => Promise<string | null>;
    sendEnergyBoost: (energyPoints: number, text: string | undefined, coupleSecret: string) => Promise<string | null>;
    sendMoodShare: (mood: string, text: string | undefined, coupleSecret: string) => Promise<string | null>;

    // Offline support
    processPendingMessages: (coupleSecret: string) => Promise<void>;
    clearCache: () => void;

    // Helpers
    getMessagesByType: (type: MessageType) => DecryptedMessage[];
    getRecentMessages: (limit: number) => DecryptedMessage[];
}

// ============================================================================
// Store
// ============================================================================

// Keep track of active subscription
let activeUnsubscribe: Unsubscribe | null = null;

export const useMessageStore = create<MessageState>()(
    persist(
        (set, get) => ({
            // Initial state
            messages: [],
            pendingMessages: [],
            unreadCount: 0,
            isSubscribed: false,
            lastSyncAt: null,
            syncError: null,
            currentCoupleId: null,
            currentUserId: null,

            // Message actions
            setMessages: (messages) => {
                set({ messages, lastSyncAt: new Date(), syncError: null });
            },

            addMessage: (message) => {
                set((state) => ({
                    messages: [...state.messages, message].sort(
                        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
                    ),
                }));
            },

            addPendingMessage: (message) => {
                set((state) => ({
                    pendingMessages: [...state.pendingMessages, message],
                }));
            },

            removePendingMessage: (id) => {
                set((state) => ({
                    pendingMessages: state.pendingMessages.filter((m) => m.id !== id),
                }));
            },

            markMessageAsRead: async (messageId) => {
                const { currentUserId } = get();
                if (!currentUserId) return;

                try {
                    await encryptedMessageService.markAsRead(messageId, currentUserId);
                    set((state) => ({
                        messages: state.messages.map((m) =>
                            m.id === messageId
                                ? { ...m, readAt: new Date(), readBy: currentUserId }
                                : m
                        ),
                    }));
                } catch (error) {
                    console.error('Failed to mark message as read:', error);
                }
            },

            setUnreadCount: (count) => set({ unreadCount: count }),
            incrementUnreadCount: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
            resetUnreadCount: () => set({ unreadCount: 0 }),

            // Sync actions
            subscribe: (coupleId, userId, coupleSecret) => {
                // Unsubscribe from previous if exists
                if (activeUnsubscribe) {
                    activeUnsubscribe();
                    activeUnsubscribe = null;
                }

                set({
                    currentCoupleId: coupleId,
                    currentUserId: userId,
                    isSubscribed: true,
                    syncError: null,
                });

                try {
                    activeUnsubscribe = encryptedMessageService.subscribeToMessages(
                        coupleId,
                        coupleSecret,
                        (messages) => {
                            const { currentUserId } = get();
                            set({
                                messages,
                                lastSyncAt: new Date(),
                                syncError: null,
                            });

                            // Calculate unread count
                            const unread = messages.filter(
                                (m) => m.senderId !== currentUserId && !m.readAt
                            ).length;
                            set({ unreadCount: unread });
                        },
                        (error) => {
                            set({ syncError: error.message });
                        }
                    );

                    return activeUnsubscribe;
                } catch (error) {
                    set({ syncError: (error as Error).message, isSubscribed: false });
                    return null;
                }
            },

            unsubscribe: () => {
                if (activeUnsubscribe) {
                    activeUnsubscribe();
                    activeUnsubscribe = null;
                }
                set({ isSubscribed: false });
            },

            setSyncError: (error) => set({ syncError: error }),
            setLastSyncAt: (date) => set({ lastSyncAt: date }),

            // Send actions
            sendTextMessage: async (text, coupleSecret) => {
                const { currentCoupleId, currentUserId, addPendingMessage, removePendingMessage } = get();
                if (!currentCoupleId || !currentUserId) return null;

                const pendingId = `pending_${Date.now()}`;
                const pendingMessage: PendingMessage = {
                    id: pendingId,
                    coupleId: currentCoupleId,
                    senderId: currentUserId,
                    content: { type: 'text', text, timestamp: Date.now() },
                    createdAt: new Date(),
                    retryCount: 0,
                };

                // Add to pending queue
                addPendingMessage(pendingMessage);

                try {
                    const messageId = await encryptedMessageService.sendText(
                        currentCoupleId,
                        currentUserId,
                        text,
                        coupleSecret
                    );
                    removePendingMessage(pendingId);
                    return messageId;
                } catch (error) {
                    console.error('Failed to send message, kept in pending queue:', error);
                    return null;
                }
            },

            sendTaskRequest: async (taskId, taskTitle, taskDescription, coupleSecret) => {
                const { currentCoupleId, currentUserId, addPendingMessage, removePendingMessage } = get();
                if (!currentCoupleId || !currentUserId) return null;

                const pendingId = `pending_${Date.now()}`;
                const pendingMessage: PendingMessage = {
                    id: pendingId,
                    coupleId: currentCoupleId,
                    senderId: currentUserId,
                    content: { type: 'task_request', taskId, taskTitle, taskDescription, timestamp: Date.now() },
                    createdAt: new Date(),
                    retryCount: 0,
                };

                addPendingMessage(pendingMessage);

                try {
                    const messageId = await encryptedMessageService.sendTaskRequest(
                        currentCoupleId,
                        currentUserId,
                        taskId,
                        taskTitle,
                        taskDescription,
                        coupleSecret
                    );
                    removePendingMessage(pendingId);
                    return messageId;
                } catch (error) {
                    console.error('Failed to send task request:', error);
                    return null;
                }
            },

            sendTaskUpdate: async (taskId, taskTitle, text, coupleSecret) => {
                const { currentCoupleId, currentUserId, addPendingMessage, removePendingMessage } = get();
                if (!currentCoupleId || !currentUserId) return null;

                const pendingId = `pending_${Date.now()}`;
                const pendingMessage: PendingMessage = {
                    id: pendingId,
                    coupleId: currentCoupleId,
                    senderId: currentUserId,
                    content: { type: 'task_update', taskId, taskTitle, text, timestamp: Date.now() },
                    createdAt: new Date(),
                    retryCount: 0,
                };

                addPendingMessage(pendingMessage);

                try {
                    const messageId = await encryptedMessageService.sendTaskUpdate(
                        currentCoupleId,
                        currentUserId,
                        taskId,
                        taskTitle,
                        text,
                        coupleSecret
                    );
                    removePendingMessage(pendingId);
                    return messageId;
                } catch (error) {
                    console.error('Failed to send task update:', error);
                    return null;
                }
            },

            sendEnergyBoost: async (energyPoints, text, coupleSecret) => {
                const { currentCoupleId, currentUserId, addPendingMessage, removePendingMessage } = get();
                if (!currentCoupleId || !currentUserId) return null;

                const pendingId = `pending_${Date.now()}`;
                const pendingMessage: PendingMessage = {
                    id: pendingId,
                    coupleId: currentCoupleId,
                    senderId: currentUserId,
                    content: { type: 'energy_boost', energyPoints, text, timestamp: Date.now() },
                    createdAt: new Date(),
                    retryCount: 0,
                };

                addPendingMessage(pendingMessage);

                try {
                    const messageId = await encryptedMessageService.sendEnergyBoost(
                        currentCoupleId,
                        currentUserId,
                        energyPoints,
                        text,
                        coupleSecret
                    );
                    removePendingMessage(pendingId);
                    return messageId;
                } catch (error) {
                    console.error('Failed to send energy boost:', error);
                    return null;
                }
            },

            sendMoodShare: async (mood, text, coupleSecret) => {
                const { currentCoupleId, currentUserId, addPendingMessage, removePendingMessage } = get();
                if (!currentCoupleId || !currentUserId) return null;

                const pendingId = `pending_${Date.now()}`;
                const pendingMessage: PendingMessage = {
                    id: pendingId,
                    coupleId: currentCoupleId,
                    senderId: currentUserId,
                    content: { type: 'mood_share', mood, text, timestamp: Date.now() },
                    createdAt: new Date(),
                    retryCount: 0,
                };

                addPendingMessage(pendingMessage);

                try {
                    const messageId = await encryptedMessageService.sendMoodShare(
                        currentCoupleId,
                        currentUserId,
                        mood,
                        text,
                        coupleSecret
                    );
                    removePendingMessage(pendingId);
                    return messageId;
                } catch (error) {
                    console.error('Failed to send mood share:', error);
                    return null;
                }
            },

            // Offline support
            processPendingMessages: async (coupleSecret) => {
                const { pendingMessages, removePendingMessage } = get();
                const maxRetries = 3;

                for (const pending of pendingMessages) {
                    if (pending.retryCount >= maxRetries) {
                        console.warn('Max retries reached for message:', pending.id);
                        removePendingMessage(pending.id);
                        continue;
                    }

                    try {
                        await encryptedMessageService.send({
                            coupleId: pending.coupleId,
                            senderId: pending.senderId,
                            content: pending.content,
                            coupleSecret,
                        });
                        removePendingMessage(pending.id);
                    } catch (error) {
                        console.error('Retry failed for message:', pending.id, error);
                        // Increment retry count
                        set((state) => ({
                            pendingMessages: state.pendingMessages.map((m) =>
                                m.id === pending.id ? { ...m, retryCount: m.retryCount + 1 } : m
                            ),
                        }));
                    }
                }
            },

            clearCache: () => {
                set({
                    messages: [],
                    pendingMessages: [],
                    unreadCount: 0,
                    lastSyncAt: null,
                    syncError: null,
                });
            },

            // Helpers
            getMessagesByType: (type) => {
                return get().messages.filter((m) => m.type === type);
            },

            getRecentMessages: (limit) => {
                const { messages } = get();
                return messages.slice(-limit);
            },
        }),
        {
            name: 'synapse-message-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                // Only persist messages and pending queue for offline access
                messages: state.messages,
                pendingMessages: state.pendingMessages,
                lastSyncAt: state.lastSyncAt,
                currentCoupleId: state.currentCoupleId,
                currentUserId: state.currentUserId,
            }),
            // Custom serialization for Date objects
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // Convert date strings back to Date objects
                    state.messages = state.messages.map((m) => ({
                        ...m,
                        createdAt: new Date(m.createdAt),
                        readAt: m.readAt ? new Date(m.readAt) : undefined,
                    }));
                    state.pendingMessages = state.pendingMessages.map((m) => ({
                        ...m,
                        createdAt: new Date(m.createdAt),
                    }));
                    state.lastSyncAt = state.lastSyncAt ? new Date(state.lastSyncAt) : null;
                }
            },
        }
    )
);
