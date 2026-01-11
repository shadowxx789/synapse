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
    createdAt: Timestamp;
    updatedAt: Timestamp;
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

    async findByPairingCode(code: string): Promise<FirestoreUser | null> {
        const q = query(
            collection(db, COLLECTIONS.users),
            where('pairingCode', '==', code)
        );
        const snapshot = await getDocs(q);
        return snapshot.empty ? null : (snapshot.docs[0].data() as FirestoreUser);
    },

    generatePairingCode(): string {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    },

    async pairWithPartner(userId: string, partnerCode: string): Promise<boolean> {
        const partner = await this.findByPairingCode(partnerCode);
        if (!partner || partner.id === userId) return false;

        // Create couple relationship
        const coupleId = [userId, partner.id].sort().join('_');

        await Promise.all([
            this.update(userId, { partnerId: partner.id }),
            this.update(partner.id, { partnerId: userId }),
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
        await updateDoc(taskRef, updates);
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
            completedAt: firestoreTask.completedAt?.toDate(),
            subtasks: firestoreTask.subtasks?.map((s) => this.toLocal(s)),
        };
    },

    // Convert local Task to Firestore format
    toFirestore(task: Task): Omit<FirestoreTask, 'createdAt'> {
        return {
            ...task,
            completedAt: task.completedAt ? Timestamp.fromDate(task.completedAt) : undefined,
            subtasks: task.subtasks?.map((s) => ({
                ...this.toFirestore(s),
                createdAt: Timestamp.fromDate(s.createdAt),
            })) as FirestoreTask[],
        };
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

export default app;
