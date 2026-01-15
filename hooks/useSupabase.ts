import { useCallback, useEffect, useState } from 'react';

import {
    EnergyActionRow,
    ProfileRow,
    RewardRow,
    TaskRow,
    energyService,
    rewardService,
    taskService,
    userService,
} from '@/services/supabaseDatabase';
import { ActionType } from '@/stores/energyStore';
import { Reward } from '@/stores/rewardStore';
import { Task } from '@/stores/taskStore';

const toIso = (value: Date | undefined): string | undefined => {
    if (!value) return undefined;
    return value.toISOString();
};

const mapTaskUpdates = (updates: Partial<Task>): Partial<TaskRow> => {
    const completedAt = toIso(updates.completedAt);
    return {
        ...(updates.title !== undefined ? { title: updates.title } : {}),
        ...(updates.description !== undefined ? { description: updates.description } : {}),
        ...(updates.visualTimerMinutes !== undefined
            ? { visual_timer_minutes: updates.visualTimerMinutes }
            : {}),
        ...(updates.status !== undefined ? { status: updates.status } : {}),
        ...(completedAt ? { completed_at: completedAt } : {}),
    };
};

// ============================================================================
// Hook: useSupabaseUser
// ============================================================================

export function useSupabaseUser(userId: string | null) {
    const [user, setUser] = useState<ProfileRow | null>(null);
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
// Hook: useSupabaseTasks
// ============================================================================

export function useSupabaseTasks(userId: string | null) {
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
        const unsubscribe = taskService.subscribeToUserTasks(userId, async (taskRows) => {
            try {
                const localTasks = await Promise.all(taskRows.map((taskRow) => taskService.toLocal(taskRow)));
                setTasks(localTasks);
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [userId]);

    const createTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt'>) => {
        const taskRow = taskService.toDatabase({
            ...task,
            id: '',
            createdAt: new Date(),
        });
        return taskService.create(taskRow);
    }, []);

    const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
        await taskService.update(taskId, mapTaskUpdates(updates));
    }, []);

    const deleteTask = useCallback(async (taskId: string) => {
        await taskService.delete(taskId);
    }, []);

    return { tasks, loading, error, createTask, updateTask, deleteTask };
}

// ============================================================================
// Hook: useSupabaseEnergy
// ============================================================================

export function useSupabaseEnergy(coupleId: string | null, userId: string | null) {
    const [actions, setActions] = useState<EnergyActionRow[]>([]);
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
            if (userId) {
                const points = energyActions
                    .filter((action) => action.user_id === userId)
                    .reduce((sum, action) => sum + action.points, 0);
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
                couple_id: coupleId,
                user_id: userId,
                action_type: actionType,
                points,
                description: description ?? null,
            });
        },
        [coupleId, userId]
    );

    return { actions, totalPoints, loading, addPoints };
}

// ============================================================================
// Hook: useSupabaseRewards
// ============================================================================

export function useSupabaseRewards(coupleId: string | null) {
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!coupleId) {
            setRewards([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsubscribe = rewardService.subscribeToRewards(coupleId, (rewardRows) => {
            const localRewards = rewardRows.map((reward) => rewardService.toLocal(reward as RewardRow));
            setRewards(localRewards);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [coupleId]);

    const createReward = useCallback(
        async (reward: Omit<Reward, 'id' | 'isRedeemed'>) => {
            if (!coupleId) return;

            await rewardService.create({
                couple_id: coupleId,
                title: reward.title,
                description: reward.description ?? null,
                points_cost: reward.pointsCost,
                icon: reward.icon,
                created_by: reward.createdBy,
            });
        },
        [coupleId]
    );

    const redeemReward = useCallback(async (rewardId: string) => {
        await rewardService.redeem(rewardId);
    }, []);

    const availableRewards = rewards.filter((reward) => !reward.isRedeemed);

    return { rewards, availableRewards, loading, createReward, redeemReward };
}

// ============================================================================
// Hook: usePartnerPairing
// ============================================================================

export function usePartnerPairing(userId: string | null) {
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateCode = useCallback(async () => {
        if (!userId) return null;

        setLoading(true);
        try {
            const code = userService.generatePairingCode();
            await userService.update(userId, { pairing_code: code });
            setPairingCode(code);
            return code;
        } catch {
            setError('生成配对码失败');
            return null;
        } finally {
            setLoading(false);
        }
    }, [userId]);

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
            } catch {
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
// ============================================================================

export function useCoupleId(userId: string | null, partnerId: string | null): string | null {
    if (!userId || !partnerId) return null;
    return energyService.getCoupleId(userId, partnerId);
}
