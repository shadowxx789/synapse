import { initializeApp, getApps } from 'firebase/app';
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    onSnapshot,
    Timestamp,
    serverTimestamp,
    Unsubscribe,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

import { Task, TaskStatus } from '@/stores/taskStore';
import { UserRole } from '@/stores/userStore';
import { ActionType } from '@/stores/energyStore';
import { Reward } from '@/stores/rewardStore';

export type { Unsubscribe };

// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

// Initialize Firebase (avoid re-initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);

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

// ============================================================================
// Collection references
// ============================================================================

const COLLECTIONS = {
    users: 'users',
    couples: 'couples',
    tasks: 'tasks',
    energyActions: 'energyActions',
    rewards: 'rewards',
    messages: 'messages',
} as const;

// ============================================================================
// User Service
// ============================================================================

export const userService = {
    async create(user: Omit<FirestoreUser, 'createdAt' | 'updatedAt'>): Promise<void> {
        const userRef = doc(db, COLLECTIONS.users, user.id);
        await setDoc(userRef, {
            ...user,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    },

    async get(userId: string): Promise<FirestoreUser | null> {
        const userRef = doc(db, COLLECTIONS.users, userId);
        const snapshot = await getDoc(userRef);
        return snapshot.exists() ? (snapshot.data() as FirestoreUser) : null;
    },

    async update(userId: string, updates: Partial<FirestoreUser>): Promise<void> {
        const userRef = doc(db, COLLECTIONS.users, userId);
        await updateDoc(userRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });
    },

    generatePairingCode(): string {
        // Generate 6-character alphanumeric code (uppercase)
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars: I, O, 0, 1
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    },

    async generateAndSavePairingCode(userId: string): Promise<string> {
        const code = this.generatePairingCode();
        const expiresAt = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)); // 24 hours

        await this.update(userId, {
            pairingCode: code,
            pairingCodeExpiresAt: expiresAt,
        });

        return code;
    },

    async findByPairingCode(code: string): Promise<FirestoreUser | null> {
        const q = query(
            collection(db, COLLECTIONS.users),
            where('pairingCode', '==', code.toUpperCase())
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) return null;

        const user = snapshot.docs[0].data() as FirestoreUser;

        // Check if code has expired
        if (user.pairingCodeExpiresAt && user.pairingCodeExpiresAt.toDate() < new Date()) {
            return null; // Code expired
        }

        return user;
    },

    async pairWithPartner(userId: string, partnerCode: string): Promise<boolean> {
        const partner = await this.findByPairingCode(partnerCode);
        if (!partner || partner.id === userId) return false;

        // Get current user to determine roles
        const currentUser = await this.get(userId);
        if (!currentUser) return false;

        // Create couple relationship
        const coupleId = [userId, partner.id].sort().join('_');

        // Determine executor and supporter
        const executorId = currentUser.role === 'executor' ? userId : partner.id;
        const supporterId = currentUser.role === 'supporter' ? userId : partner.id;

        // Create couple document
        await coupleService.create({
            id: coupleId,
            executorId,
            supporterId,
            encryptionKeyHash: '', // Will be set when encryption is initialized
            status: 'active',
        });

        // Update both users
        await Promise.all([
            this.update(userId, {
                partnerId: partner.id,
                coupleId: coupleId,
                pairingCode: undefined, // Clear pairing code after successful pair
                pairingCodeExpiresAt: undefined,
            }),
            this.update(partner.id, {
                partnerId: userId,
                coupleId: coupleId,
                pairingCode: undefined,
                pairingCodeExpiresAt: undefined,
            }),
        ]);

        return true;
    },

    async unpair(userId: string): Promise<boolean> {
        const user = await this.get(userId);
        if (!user || !user.partnerId) return false;

        const partnerId = user.partnerId;
        const coupleId = user.coupleId;

        // Update couple status to disconnected
        if (coupleId) {
            await coupleService.update(coupleId, { status: 'disconnected' });
        }

        // Clear partner references
        await Promise.all([
            this.update(userId, {
                partnerId: undefined,
                coupleId: undefined,
            }),
            this.update(partnerId, {
                partnerId: undefined,
                coupleId: undefined,
            }),
        ]);

        return true;
    },

    subscribe(userId: string, callback: (user: FirestoreUser | null) => void): Unsubscribe {
        const userRef = doc(db, COLLECTIONS.users, userId);
        return onSnapshot(userRef, (snapshot) => {
            callback(snapshot.exists() ? (snapshot.data() as FirestoreUser) : null);
        });
    },
};

// ============================================================================
// Task Service
// ============================================================================

export const taskService = {
    async create(task: Omit<FirestoreTask, 'createdAt'>): Promise<string> {
        const taskRef = doc(collection(db, COLLECTIONS.tasks));
        const taskWithId = { ...task, id: taskRef.id };
        await setDoc(taskRef, {
            ...taskWithId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return taskRef.id;
    },

    async get(taskId: string): Promise<FirestoreTask | null> {
        const taskRef = doc(db, COLLECTIONS.tasks, taskId);
        const snapshot = await getDoc(taskRef);
        return snapshot.exists() ? (snapshot.data() as FirestoreTask) : null;
    },

    async update(taskId: string, updates: Partial<FirestoreTask>): Promise<void> {
        const taskRef = doc(db, COLLECTIONS.tasks, taskId);
        await updateDoc(taskRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });
    },

    async delete(taskId: string): Promise<void> {
        const taskRef = doc(db, COLLECTIONS.tasks, taskId);
        await deleteDoc(taskRef);
    },

    async getTasksForUser(userId: string): Promise<FirestoreTask[]> {
        const q = query(
            collection(db, COLLECTIONS.tasks),
            where('executorId', '==', userId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => doc.data() as FirestoreTask);
    },

    async getTasksCreatedBy(userId: string): Promise<FirestoreTask[]> {
        const q = query(
            collection(db, COLLECTIONS.tasks),
            where('creatorId', '==', userId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => doc.data() as FirestoreTask);
    },

    subscribeToUserTasks(
        userId: string,
        callback: (tasks: FirestoreTask[]) => void
    ): Unsubscribe {
        const q = query(
            collection(db, COLLECTIONS.tasks),
            where('executorId', '==', userId)
        );
        return onSnapshot(q, (snapshot) => {
            const tasks = snapshot.docs.map((doc) => doc.data() as FirestoreTask);
            callback(tasks);
        });
    },

    // Convert Firestore task to local Task format
    toLocal(firestoreTask: FirestoreTask): Task {
        return {
            ...firestoreTask,
            createdAt: firestoreTask.createdAt?.toDate() || new Date(),
            updatedAt: firestoreTask.updatedAt?.toDate() || firestoreTask.createdAt?.toDate() || new Date(),
            completedAt: firestoreTask.completedAt?.toDate(),
            subtasks: firestoreTask.subtasks?.map((s) => this.toLocal(s)),
        };
    },

    // Convert local Task to Firestore format
    toFirestore(task: Task): Omit<FirestoreTask, 'createdAt'> {
        const { createdAt, completedAt, updatedAt, subtasks, ...rest } = task;
        return {
            ...rest,
            completedAt: completedAt ? Timestamp.fromDate(completedAt) : undefined,
            updatedAt: updatedAt ? Timestamp.fromDate(updatedAt) : undefined,
            subtasks: subtasks?.map((s) => ({
                ...this.toFirestore(s),
                createdAt: Timestamp.fromDate(s.createdAt),
                updatedAt: s.updatedAt
                    ? Timestamp.fromDate(s.updatedAt)
                    : Timestamp.fromDate(s.createdAt),
            })) as FirestoreTask[],
        };
    },
};

// ============================================================================
// Couple Service
// ============================================================================

export const coupleService = {
    async create(couple: Omit<FirestoreCouple, 'createdAt'>): Promise<void> {
        const coupleRef = doc(db, COLLECTIONS.couples, couple.id);
        await setDoc(coupleRef, {
            ...couple,
            createdAt: serverTimestamp(),
        });
    },

    async get(coupleId: string): Promise<FirestoreCouple | null> {
        const coupleRef = doc(db, COLLECTIONS.couples, coupleId);
        const snapshot = await getDoc(coupleRef);
        return snapshot.exists() ? (snapshot.data() as FirestoreCouple) : null;
    },

    async update(coupleId: string, updates: Partial<FirestoreCouple>): Promise<void> {
        const coupleRef = doc(db, COLLECTIONS.couples, coupleId);
        await updateDoc(coupleRef, updates);
    },

    async setEncryptionKeyHash(coupleId: string, keyHash: string): Promise<void> {
        await this.update(coupleId, { encryptionKeyHash: keyHash });
    },

    subscribe(coupleId: string, callback: (couple: FirestoreCouple | null) => void): Unsubscribe {
        const coupleRef = doc(db, COLLECTIONS.couples, coupleId);
        return onSnapshot(coupleRef, (snapshot) => {
            callback(snapshot.exists() ? (snapshot.data() as FirestoreCouple) : null);
        });
    },

    getCoupleId(userId1: string, userId2: string): string {
        return [userId1, userId2].sort().join('_');
    },
};

// ============================================================================
// Energy Service
// ============================================================================

export const energyService = {
    getCoupleId(userId1: string, userId2: string): string {
        return [userId1, userId2].sort().join('_');
    },

    async addAction(action: Omit<FirestoreEnergyAction, 'timestamp'>): Promise<void> {
        const actionRef = doc(collection(db, COLLECTIONS.energyActions));
        await setDoc(actionRef, {
            ...action,
            id: actionRef.id,
            timestamp: serverTimestamp(),
        });
    },

    async getActionsForCouple(coupleId: string): Promise<FirestoreEnergyAction[]> {
        const q = query(
            collection(db, COLLECTIONS.energyActions),
            where('coupleId', '==', coupleId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => doc.data() as FirestoreEnergyAction);
    },

    async getTotalPoints(coupleId: string, userId: string): Promise<number> {
        const actions = await this.getActionsForCouple(coupleId);
        return actions
            .filter((a) => a.userId === userId)
            .reduce((sum, a) => sum + a.points, 0);
    },

    subscribeToActions(
        coupleId: string,
        callback: (actions: FirestoreEnergyAction[]) => void
    ): Unsubscribe {
        const q = query(
            collection(db, COLLECTIONS.energyActions),
            where('coupleId', '==', coupleId)
        );
        return onSnapshot(q, (snapshot) => {
            const actions = snapshot.docs.map((doc) => doc.data() as FirestoreEnergyAction);
            callback(actions);
        });
    },
};

// ============================================================================
// Reward Service
// ============================================================================

export const rewardService = {
    async create(reward: Omit<FirestoreReward, 'createdAt'>): Promise<string> {
        const rewardRef = doc(collection(db, COLLECTIONS.rewards));
        await setDoc(rewardRef, {
            ...reward,
            id: rewardRef.id,
            createdAt: serverTimestamp(),
        });
        return rewardRef.id;
    },

    async update(rewardId: string, updates: Partial<FirestoreReward>): Promise<void> {
        const rewardRef = doc(db, COLLECTIONS.rewards, rewardId);
        await updateDoc(rewardRef, updates);
    },

    async delete(rewardId: string): Promise<void> {
        const rewardRef = doc(db, COLLECTIONS.rewards, rewardId);
        await deleteDoc(rewardRef);
    },

    async getRewardsForCouple(coupleId: string): Promise<FirestoreReward[]> {
        const q = query(
            collection(db, COLLECTIONS.rewards),
            where('coupleId', '==', coupleId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => doc.data() as FirestoreReward);
    },

    async redeem(rewardId: string): Promise<void> {
        await this.update(rewardId, {
            isRedeemed: true,
            redeemedAt: Timestamp.now(),
        });
    },

    subscribeToRewards(
        coupleId: string,
        callback: (rewards: FirestoreReward[]) => void
    ): Unsubscribe {
        const q = query(
            collection(db, COLLECTIONS.rewards),
            where('coupleId', '==', coupleId)
        );
        return onSnapshot(q, (snapshot) => {
            const rewards = snapshot.docs.map((doc) => doc.data() as FirestoreReward);
            callback(rewards);
        });
    },

    // Convert Firestore reward to local Reward format
    toLocal(firestoreReward: FirestoreReward): Reward {
        return {
            id: firestoreReward.id,
            title: firestoreReward.title,
            description: firestoreReward.description,
            pointsCost: firestoreReward.pointsCost,
            icon: firestoreReward.icon,
            createdBy: firestoreReward.createdBy,
            isRedeemed: firestoreReward.isRedeemed,
            redeemedAt: firestoreReward.redeemedAt?.toDate(),
        };
    },
};

// ============================================================================
// Message Service (Encrypted Messages)
// ============================================================================

export const messageService = {
    async create(message: Omit<FirestoreMessage, 'createdAt'>): Promise<string> {
        const messageRef = doc(collection(db, COLLECTIONS.messages));
        const messageWithId = { ...message, id: messageRef.id };
        await setDoc(messageRef, {
            ...messageWithId,
            createdAt: serverTimestamp(),
        });
        return messageRef.id;
    },

    async get(messageId: string): Promise<FirestoreMessage | null> {
        const messageRef = doc(db, COLLECTIONS.messages, messageId);
        const snapshot = await getDoc(messageRef);
        return snapshot.exists() ? (snapshot.data() as FirestoreMessage) : null;
    },

    async markAsRead(messageId: string, userId: string): Promise<void> {
        const messageRef = doc(db, COLLECTIONS.messages, messageId);
        await updateDoc(messageRef, {
            readAt: serverTimestamp(),
            readBy: userId,
        });
    },

    async getMessagesForCouple(
        coupleId: string,
        limit?: number
    ): Promise<FirestoreMessage[]> {
        let q = query(
            collection(db, COLLECTIONS.messages),
            where('coupleId', '==', coupleId)
        );

        const snapshot = await getDocs(q);
        const messages = snapshot.docs.map((doc) => doc.data() as FirestoreMessage);

        // Sort by createdAt descending
        messages.sort((a, b) => {
            const aTime = a.createdAt?.toMillis() || 0;
            const bTime = b.createdAt?.toMillis() || 0;
            return bTime - aTime;
        });

        return limit ? messages.slice(0, limit) : messages;
    },

    async getUnreadCount(coupleId: string, userId: string): Promise<number> {
        const q = query(
            collection(db, COLLECTIONS.messages),
            where('coupleId', '==', coupleId),
            where('senderId', '!=', userId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.filter((doc) => {
            const data = doc.data() as FirestoreMessage;
            return !data.readAt;
        }).length;
    },

    subscribeToMessages(
        coupleId: string,
        callback: (messages: FirestoreMessage[]) => void
    ): Unsubscribe {
        const q = query(
            collection(db, COLLECTIONS.messages),
            where('coupleId', '==', coupleId)
        );
        return onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map((doc) => doc.data() as FirestoreMessage);
            // Sort by createdAt ascending (oldest first)
            messages.sort((a, b) => {
                const aTime = a.createdAt?.toMillis() || 0;
                const bTime = b.createdAt?.toMillis() || 0;
                return aTime - bTime;
            });
            callback(messages);
        });
    },

    async deleteMessage(messageId: string): Promise<void> {
        const messageRef = doc(db, COLLECTIONS.messages, messageId);
        await deleteDoc(messageRef);
    },
};

export default app;
