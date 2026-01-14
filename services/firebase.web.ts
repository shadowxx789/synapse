import { ActionType } from '@/stores/energyStore';
import { Reward } from '@/stores/rewardStore';
import { Task, TaskStatus } from '@/stores/taskStore';
import { UserRole } from '@/stores/userStore';

export type Unsubscribe = () => void;

export interface Timestamp {
    toDate: () => Date;
    toMillis: () => number;
}

const createNotSupportedError = (): Error =>
    new Error('Firebase services are not available on web.');

const createTimestamp = (date: Date): Timestamp => ({
    toDate: () => date,
    toMillis: () => date.getTime(),
});

const TimestampHelper = {
    fromDate: (date: Date): Timestamp => createTimestamp(date),
    now: (): Timestamp => createTimestamp(new Date()),
};

// ============================================================================
// Types for Firestore documents
// ============================================================================

export interface FirestoreUser {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    partnerId?: string;
    pairingCode?: string;
    pairingCodeExpiresAt?: Timestamp;
    coupleId?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface FirestoreCouple {
    id: string;
    executorId: string;
    supporterId: string;
    encryptionKeyHash: string;
    createdAt: Timestamp;
    status: 'active' | 'disconnected';
}

export type MessageType =
    | 'text'
    | 'task_request'
    | 'task_update'
    | 'energy_boost'
    | 'energy_request'
    | 'mood_share'
    | 'system';

export interface FirestoreMessage {
    id: string;
    coupleId: string;
    senderId: string;
    type: MessageType;
    encryptedContent: string;
    iv: string;
    metadata?: {
        messageType: MessageType;
        hasAttachment: boolean;
    };
    createdAt: Timestamp;
    readAt?: Timestamp;
    readBy?: string;
}

export interface FirestoreTask {
    id: string;
    parentTaskId?: string;
    title: string;
    description?: string;
    creatorId: string;
    executorId: string;
    visualTimerMinutes: number;
    status: TaskStatus;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
    completedAt?: Timestamp;
    subtasks?: FirestoreTask[];
}

export interface FirestoreEnergyAction {
    id: string;
    coupleId: string;
    userId: string;
    actionType: ActionType;
    points: number;
    timestamp: Timestamp;
    description?: string;
}

export interface FirestoreReward {
    id: string;
    coupleId: string;
    title: string;
    description: string;
    pointsCost: number;
    icon: string;
    createdBy: string;
    isRedeemed: boolean;
    redeemedAt?: Timestamp;
    createdAt: Timestamp;
}

export const db = null;
export const auth = null;

// ============================================================================
// User Service (web stub)
// ============================================================================

export const userService = {
    async create(): Promise<void> {
        return Promise.reject(createNotSupportedError());
    },

    async get(): Promise<FirestoreUser | null> {
        return Promise.resolve(null);
    },

    async update(): Promise<void> {
        return Promise.reject(createNotSupportedError());
    },

    generatePairingCode(): string {
        return '';
    },

    async generateAndSavePairingCode(): Promise<string> {
        return Promise.reject(createNotSupportedError());
    },

    async findByPairingCode(): Promise<FirestoreUser | null> {
        return Promise.resolve(null);
    },

    async pairWithPartner(): Promise<boolean> {
        return Promise.reject(createNotSupportedError());
    },

    async unpair(): Promise<boolean> {
        return Promise.reject(createNotSupportedError());
    },

    subscribe(): Unsubscribe {
        return () => undefined;
    },
};

// ============================================================================
// Task Service (web stub)
// ============================================================================

export const taskService = {
    async create(): Promise<string> {
        return Promise.reject(createNotSupportedError());
    },

    async get(): Promise<FirestoreTask | null> {
        return Promise.resolve(null);
    },

    async update(): Promise<void> {
        return Promise.reject(createNotSupportedError());
    },

    async delete(): Promise<void> {
        return Promise.reject(createNotSupportedError());
    },

    async getTasksForUser(): Promise<FirestoreTask[]> {
        return Promise.resolve([]);
    },

    async getTasksCreatedBy(): Promise<FirestoreTask[]> {
        return Promise.resolve([]);
    },

    subscribeToUserTasks(): Unsubscribe {
        return () => undefined;
    },

    toLocal(): Task {
        throw createNotSupportedError();
    },

    toFirestore(): Omit<FirestoreTask, 'createdAt'> {
        throw createNotSupportedError();
    },
};

// ============================================================================
// Couple Service (web stub)
// ============================================================================

export const coupleService = {
    async create(): Promise<void> {
        return Promise.reject(createNotSupportedError());
    },

    async get(): Promise<FirestoreCouple | null> {
        return Promise.resolve(null);
    },

    async update(): Promise<void> {
        return Promise.reject(createNotSupportedError());
    },

    async setEncryptionKeyHash(): Promise<void> {
        return Promise.reject(createNotSupportedError());
    },

    subscribe(): Unsubscribe {
        return () => undefined;
    },

    getCoupleId(userId1: string, userId2: string): string {
        return [userId1, userId2].sort().join('_');
    },
};

// ============================================================================
// Energy Service (web stub)
// ============================================================================

export const energyService = {
    getCoupleId(userId1: string, userId2: string): string {
        return [userId1, userId2].sort().join('_');
    },

    async addAction(): Promise<void> {
        return Promise.reject(createNotSupportedError());
    },

    async getActionsForCouple(): Promise<FirestoreEnergyAction[]> {
        return Promise.resolve([]);
    },

    async getTotalPoints(): Promise<number> {
        return Promise.resolve(0);
    },

    subscribeToActions(): Unsubscribe {
        return () => undefined;
    },
};

// ============================================================================
// Reward Service (web stub)
// ============================================================================

export const rewardService = {
    async create(): Promise<string> {
        return Promise.reject(createNotSupportedError());
    },

    async update(): Promise<void> {
        return Promise.reject(createNotSupportedError());
    },

    async delete(): Promise<void> {
        return Promise.reject(createNotSupportedError());
    },

    async getRewardsForCouple(): Promise<FirestoreReward[]> {
        return Promise.resolve([]);
    },

    async redeem(): Promise<void> {
        return Promise.reject(createNotSupportedError());
    },

    subscribeToRewards(): Unsubscribe {
        return () => undefined;
    },

    toLocal(): Reward {
        throw createNotSupportedError();
    },
};

// ============================================================================
// Message Service (web stub)
// ============================================================================

export const messageService = {
    async create(): Promise<string> {
        return Promise.reject(createNotSupportedError());
    },

    async get(): Promise<FirestoreMessage | null> {
        return Promise.resolve(null);
    },

    async markAsRead(): Promise<void> {
        return Promise.reject(createNotSupportedError());
    },

    async getMessagesForCouple(): Promise<FirestoreMessage[]> {
        return Promise.resolve([]);
    },

    async getUnreadCount(): Promise<number> {
        return Promise.resolve(0);
    },

    subscribeToMessages(): Unsubscribe {
        return () => undefined;
    },

    async deleteMessage(): Promise<void> {
        return Promise.reject(createNotSupportedError());
    },
};

export default null;

export { TimestampHelper as Timestamp };
