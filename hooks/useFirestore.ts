import { useEffect, useState, useCallback, useRef } from 'react';
import { Unsubscribe } from 'firebase/firestore';

import {
    userService,
    taskService,
    energyService,
    rewardService,
    FirestoreUser,
    FirestoreTask,
    FirestoreEnergyAction,
    FirestoreReward,
} from '@/services/firebase';
import { Task } from '@/stores/taskStore';
import { Reward } from '@/stores/rewardStore';
import { ActionType } from '@/stores/energyStore';

// ============================================================================
// Hook: useFirestoreUser
// Real-time subscription to user document
// ============================================================================

export function useFirestoreUser(userId: string | null) {
    const [user, setUser] = useState<FirestoreUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!userId) {
            setUser(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsubscribe = userService.subscribe(userId, (userData) => {
            setUser(userData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    return { user, loading, error };
}

// ============================================================================
// Hook: useFirestoreTasks
// Real-time subscription to user's tasks
// ============================================================================

export function useFirestoreTasks(userId: string | null) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!userId) {
            setTasks([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsubscribe = taskService.subscribeToUserTasks(userId, (firestoreTasks) => {
            const localTasks = firestoreTasks.map((t) => taskService.toLocal(t));
            setTasks(localTasks);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    const createTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt'>) => {
        const firestoreTask = taskService.toFirestore({
            ...task,
            id: '', // Will be set by Firebase
            createdAt: new Date(),
        });
        return taskService.create(firestoreTask);
    }, []);

    const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
        await taskService.update(taskId, updates as Partial<FirestoreTask>);
    }, []);

    const deleteTask = useCallback(async (taskId: string) => {
        await taskService.delete(taskId);
    }, []);

    return { tasks, loading, error, createTask, updateTask, deleteTask };
}

// ============================================================================
// Hook: useFirestoreEnergy
// Real-time subscription to couple's energy actions
// ============================================================================

export function useFirestoreEnergy(coupleId: string | null, userId: string | null) {
    const [actions, setActions] = useState<FirestoreEnergyAction[]>([]);
    const [totalPoints, setTotalPoints] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!coupleId) {
            setActions([]);
            setTotalPoints(0);
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsubscribe = energyService.subscribeToActions(coupleId, (energyActions) => {
            setActions(energyActions);
            // Calculate total points for the current user
            if (userId) {
                const points = energyActions
                    .filter((a) => a.userId === userId)
                    .reduce((sum, a) => sum + a.points, 0);
                setTotalPoints(points);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [coupleId, userId]);

    const addPoints = useCallback(
        async (actionType: ActionType, points: number, description?: string) => {
            if (!coupleId || !userId) return;

            await energyService.addAction({
                id: '', // Will be set by Firebase
                coupleId,
                userId,
                actionType,
                points,
                description,
            });
        },
        [coupleId, userId]
    );

    return { actions, totalPoints, loading, addPoints };
}

// ============================================================================
// Hook: useFirestoreRewards
// Real-time subscription to couple's rewards
// ============================================================================

export function useFirestoreRewards(coupleId: string | null) {
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!coupleId) {
            setRewards([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsubscribe = rewardService.subscribeToRewards(coupleId, (firestoreRewards) => {
            const localRewards = firestoreRewards.map((r) => rewardService.toLocal(r));
            setRewards(localRewards);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [coupleId]);

    const createReward = useCallback(
        async (reward: Omit<Reward, 'id' | 'isRedeemed'>) => {
            if (!coupleId) return;

            await rewardService.create({
                ...reward,
                id: '', // Will be set by Firebase
                coupleId,
                isRedeemed: false,
            });
        },
        [coupleId]
    );

    const redeemReward = useCallback(async (rewardId: string) => {
        await rewardService.redeem(rewardId);
    }, []);

    const deleteReward = useCallback(async (rewardId: string) => {
        await rewardService.delete(rewardId);
    }, []);

    const availableRewards = rewards.filter((r) => !r.isRedeemed);

    return { rewards, availableRewards, loading, createReward, redeemReward, deleteReward };
}

// ============================================================================
// Hook: usePartnerPairing
// Partner pairing functionality
// ============================================================================

export function usePartnerPairing(userId: string | null) {
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Generate a new pairing code
    const generateCode = useCallback(async () => {
        if (!userId) return null;

        setLoading(true);
        try {
            const code = userService.generatePairingCode();
            await userService.update(userId, { pairingCode: code });
            setPairingCode(code);
            return code;
        } catch (e) {
            setError('生成配对码失败');
            return null;
        } finally {
            setLoading(false);
        }
    }, [userId]);

    // Pair with a partner using their code
    const pairWithCode = useCallback(
        async (code: string) => {
            if (!userId) return false;

            setLoading(true);
            setError(null);
            try {
                const success = await userService.pairWithPartner(userId, code);
                if (!success) {
                    setError('配对码无效或已过期');
                }
                return success;
            } catch (e) {
                setError('配对失败，请重试');
                return false;
            } finally {
                setLoading(false);
            }
        },
        [userId]
    );

    return { pairingCode, loading, error, generateCode, pairWithCode };
}

// ============================================================================
// Hook: useCoupleId
// Derive couple ID from user and partner
// ============================================================================

export function useCoupleId(userId: string | null, partnerId: string | null): string | null {
    if (!userId || !partnerId) return null;
    return energyService.getCoupleId(userId, partnerId);
}
