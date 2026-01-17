import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import { supabase } from '@/services/supabase';
import { Task, TaskStatus } from '@/stores/taskStore';
import { UserRole } from '@/stores/userStore';
import { ActionType } from '@/stores/energyStore';
import { Reward } from '@/stores/rewardStore';

export interface ProfileRow {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    partner_id: string | null;
    pairing_code: string | null;
    pairing_code_expires_at: string | null;
    couple_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface CoupleRow {
    id: string;
    executor_id: string;
    supporter_id: string;
    encryption_key_hash: string;
    status: 'active' | 'disconnected';
    created_at: string;
}

export interface MessageRow {
    id: string;
    couple_id: string;
    sender_id: string;
    type: string;
    encrypted_content: string;
    iv: string;
    metadata: Record<string, unknown> | null;
    created_at: string;
    read_at: string | null;
    read_by: string | null;
}

export interface TaskRow {
    id: string;
    parent_task_id: string | null;
    title: string;
    description: string | null;
    creator_id: string;
    executor_id: string;
    visual_timer_minutes: number;
    status: TaskStatus;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
}

export interface EnergyActionRow {
    id: string;
    couple_id: string;
    user_id: string;
    action_type: ActionType;
    points: number;
    description: string | null;
    timestamp: string;
}

export interface RewardRow {
    id: string;
    couple_id: string;
    title: string;
    description: string | null;
    points_cost: number;
    icon: string;
    created_by: string;
    is_redeemed: boolean;
    redeemed_at: string | null;
    created_at: string;
}

const toDate = (value: string | null | undefined): Date | undefined => {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
};

const toIso = (value: Date | undefined | null): string | null => {
    if (!value) return null;
    return value.toISOString();
};

// ============================================================================
// User Service
// ============================================================================

export const userService = {
    async create(user: Omit<ProfileRow, 'created_at' | 'updated_at'>): Promise<void> {
        const { error } = await supabase
            .from('profiles')
            .insert(user);

        if (error) {
            throw new Error(error.message);
        }
    },

    async get(userId: string): Promise<ProfileRow | null> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !data) return null;
        return data as ProfileRow;
    },

    async update(userId: string, updates: Partial<ProfileRow>): Promise<void> {
        const { error } = await supabase
            .from('profiles')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) {
            throw new Error(error.message);
        }
    },

    generatePairingCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i += 1) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    },

    async generateAndSavePairingCode(userId: string): Promise<string> {
        const code = this.generatePairingCode();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        await this.update(userId, {
            pairing_code: code,
            pairing_code_expires_at: expiresAt,
        });

        return code;
    },

    async findByPairingCode(code: string): Promise<ProfileRow | null> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('pairing_code', code.toUpperCase())
            .single();

        if (error || !data) return null;

        if (data.pairing_code_expires_at) {
            const expiresAt = new Date(data.pairing_code_expires_at);
            if (expiresAt < new Date()) {
                return null;
            }
        }

        return data as ProfileRow;
    },

    async pairWithPartner(userId: string, partnerCode: string): Promise<boolean> {
        const partner = await this.findByPairingCode(partnerCode);
        if (!partner || partner.id === userId) return false;

        const currentUser = await this.get(userId);
        if (!currentUser) return false;

        const coupleId = [userId, partner.id].sort().join('_');
        const executorId = currentUser.role === 'executor' ? userId : partner.id;
        const supporterId = currentUser.role === 'supporter' ? userId : partner.id;

        const { error: coupleError } = await supabase
            .from('couples')
            .upsert({
                id: coupleId,
                executor_id: executorId,
                supporter_id: supporterId,
                status: 'active',
            }, { onConflict: 'id' });

        if (coupleError) return false;

        await Promise.all([
            this.update(userId, {
                partner_id: partner.id,
                couple_id: coupleId,
                pairing_code: null,
                pairing_code_expires_at: null,
            }),
            this.update(partner.id, {
                partner_id: userId,
                couple_id: coupleId,
                pairing_code: null,
                pairing_code_expires_at: null,
            }),
        ]);

        return true;
    },

    async unpair(userId: string): Promise<boolean> {
        const user = await this.get(userId);
        if (!user || !user.partner_id) return false;

        const partnerId = user.partner_id;
        const coupleId = user.couple_id;

        if (coupleId) {
            await supabase
                .from('couples')
                .update({ status: 'disconnected' })
                .eq('id', coupleId);
        }

        await Promise.all([
            this.update(userId, { partner_id: null, couple_id: null }),
            this.update(partnerId, { partner_id: null, couple_id: null }),
        ]);

        return true;
    },

    subscribe(userId: string, callback: (user: ProfileRow | null) => void) {
        const channel = supabase
            .channel(`profile:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${userId}`,
                },
                (payload: RealtimePostgresChangesPayload<ProfileRow>) => {
                    callback(payload.new as ProfileRow);
                }
            )
            .subscribe();

        this.get(userId).then(callback);

        return () => {
            supabase.removeChannel(channel);
        };
    },
};

// ============================================================================
// Task Service
// ============================================================================

export const taskService = {
    async create(task: Omit<TaskRow, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
        const { data, error } = await supabase
            .from('tasks')
            .insert(task)
            .select('id')
            .single();

        if (error || !data) {
            throw new Error(error?.message ?? '创建任务失败');
        }

        return data.id;
    },

    async get(taskId: string): Promise<TaskRow | null> {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .single();

        if (error || !data) return null;
        return data as TaskRow;
    },

    async update(taskId: string, updates: Partial<TaskRow>): Promise<void> {
        const { error } = await supabase
            .from('tasks')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', taskId);

        if (error) {
            throw new Error(error.message);
        }
    },

    async delete(taskId: string): Promise<void> {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);

        if (error) {
            throw new Error(error.message);
        }
    },

    async getTasksForUser(userId: string): Promise<TaskRow[]> {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('executor_id', userId)
            .is('parent_task_id', null)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return (data ?? []) as TaskRow[];
    },

    async getSubtasks(parentTaskId: string): Promise<TaskRow[]> {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('parent_task_id', parentTaskId)
            .order('created_at', { ascending: true });

        if (error) {
            throw new Error(error.message);
        }

        return (data ?? []) as TaskRow[];
    },

    async toLocal(taskRow: TaskRow): Promise<Task> {
        const subtasks = await this.getSubtasks(taskRow.id);
        const localSubtasks = await Promise.all(subtasks.map((subtask) => this.toLocal(subtask)));

        return {
            id: taskRow.id,
            parentTaskId: taskRow.parent_task_id ?? undefined,
            title: taskRow.title,
            description: taskRow.description ?? undefined,
            creatorId: taskRow.creator_id,
            executorId: taskRow.executor_id,
            visualTimerMinutes: taskRow.visual_timer_minutes,
            status: taskRow.status,
            createdAt: new Date(taskRow.created_at),
            updatedAt: toDate(taskRow.updated_at),
            completedAt: toDate(taskRow.completed_at),
            subtasks: localSubtasks.length > 0 ? localSubtasks : undefined,
        };
    },

    toDatabase(task: Task): Omit<TaskRow, 'id' | 'created_at' | 'updated_at'> {
        return {
            parent_task_id: task.parentTaskId ?? null,
            title: task.title,
            description: task.description ?? null,
            creator_id: task.creatorId,
            executor_id: task.executorId,
            visual_timer_minutes: task.visualTimerMinutes,
            status: task.status,
            completed_at: toIso(task.completedAt),
        };
    },

    subscribeToUserTasks(userId: string, callback: (tasks: TaskRow[]) => void) {
        const channel = supabase
            .channel(`tasks:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks',
                    filter: `executor_id=eq.${userId}`,
                },
                async () => {
                    const tasks = await this.getTasksForUser(userId);
                    callback(tasks);
                }
            )
            .subscribe();

        this.getTasksForUser(userId).then(callback);

        return () => {
            supabase.removeChannel(channel);
        };
    },
};

// ============================================================================
// Couple Service
// ============================================================================

export const coupleService = {
    async create(couple: Omit<CoupleRow, 'created_at'>): Promise<void> {
        const { error } = await supabase.from('couples').insert(couple);
        if (error) {
            throw new Error(error.message);
        }
    },

    async get(coupleId: string): Promise<CoupleRow | null> {
        const { data, error } = await supabase
            .from('couples')
            .select('*')
            .eq('id', coupleId)
            .single();

        if (error || !data) return null;
        return data as CoupleRow;
    },

    async update(coupleId: string, updates: Partial<CoupleRow>): Promise<void> {
        const { error } = await supabase
            .from('couples')
            .update(updates)
            .eq('id', coupleId);

        if (error) {
            throw new Error(error.message);
        }
    },

    async setEncryptionKeyHash(coupleId: string, keyHash: string): Promise<void> {
        await this.update(coupleId, { encryption_key_hash: keyHash });
    },

    subscribe(coupleId: string, callback: (couple: CoupleRow | null) => void) {
        const channel = supabase
            .channel(`couple:${coupleId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'couples',
                    filter: `id=eq.${coupleId}`,
                },
                (payload: RealtimePostgresChangesPayload<CoupleRow>) => {
                    callback(payload.new as CoupleRow);
                }
            )
            .subscribe();

        this.get(coupleId).then(callback);

        return () => {
            supabase.removeChannel(channel);
        };
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

    async addAction(action: Omit<EnergyActionRow, 'id' | 'timestamp'>): Promise<void> {
        const { error } = await supabase
            .from('energy_actions')
            .insert(action);

        if (error) {
            throw new Error(error.message);
        }
    },

    async getActionsForCouple(coupleId: string): Promise<EnergyActionRow[]> {
        const { data, error } = await supabase
            .from('energy_actions')
            .select('*')
            .eq('couple_id', coupleId);

        if (error) {
            throw new Error(error.message);
        }

        return (data ?? []) as EnergyActionRow[];
    },

    async getTotalPoints(coupleId: string, userId: string): Promise<number> {
        const actions = await this.getActionsForCouple(coupleId);
        return actions
            .filter((action) => action.user_id === userId)
            .reduce((sum, action) => sum + action.points, 0);
    },

    subscribeToActions(coupleId: string, callback: (actions: EnergyActionRow[]) => void) {
        const channel = supabase
            .channel(`energy:${coupleId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'energy_actions',
                    filter: `couple_id=eq.${coupleId}`,
                },
                async () => {
                    const actions = await this.getActionsForCouple(coupleId);
                    callback(actions);
                }
            )
            .subscribe();

        this.getActionsForCouple(coupleId).then(callback);

        return () => {
            supabase.removeChannel(channel);
        };
    },
};

// ============================================================================
// Reward Service
// ============================================================================

export const rewardService = {
    async create(reward: Omit<RewardRow, 'id' | 'created_at' | 'redeemed_at' | 'is_redeemed'>): Promise<string> {
        const { data, error } = await supabase
            .from('rewards')
            .insert(reward)
            .select('id')
            .single();

        if (error || !data) {
            throw new Error(error?.message ?? '创建奖励失败');
        }

        return data.id;
    },

    async update(rewardId: string, updates: Partial<RewardRow>): Promise<void> {
        const { error } = await supabase
            .from('rewards')
            .update(updates)
            .eq('id', rewardId);

        if (error) {
            throw new Error(error.message);
        }
    },

    async delete(rewardId: string): Promise<void> {
        const { error } = await supabase
            .from('rewards')
            .delete()
            .eq('id', rewardId);

        if (error) {
            throw new Error(error.message);
        }
    },

    async getRewardsForCouple(coupleId: string): Promise<RewardRow[]> {
        const { data, error } = await supabase
            .from('rewards')
            .select('*')
            .eq('couple_id', coupleId);

        if (error) {
            throw new Error(error.message);
        }

        return (data ?? []) as RewardRow[];
    },

    async redeem(rewardId: string): Promise<void> {
        await this.update(rewardId, {
            is_redeemed: true,
            redeemed_at: new Date().toISOString(),
        });
    },

    subscribeToRewards(coupleId: string, callback: (rewards: RewardRow[]) => void) {
        const channel = supabase
            .channel(`rewards:${coupleId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'rewards',
                    filter: `couple_id=eq.${coupleId}`,
                },
                async () => {
                    const rewards = await this.getRewardsForCouple(coupleId);
                    callback(rewards);
                }
            )
            .subscribe();

        this.getRewardsForCouple(coupleId).then(callback);

        return () => {
            supabase.removeChannel(channel);
        };
    },

    toLocal(reward: RewardRow): Reward {
        return {
            id: reward.id,
            title: reward.title,
            description: reward.description ?? '',
            pointsCost: reward.points_cost,
            icon: reward.icon,
            createdBy: reward.created_by,
            isRedeemed: reward.is_redeemed,
            redeemedAt: toDate(reward.redeemed_at),
        };
    },
};

// ============================================================================
// Message Service
// ============================================================================

export const messageService = {
    async create(message: Omit<MessageRow, 'id' | 'created_at' | 'read_at' | 'read_by'>): Promise<string> {
        const { data, error } = await supabase
            .from('messages')
            .insert(message)
            .select('id')
            .single();

        if (error || !data) {
            throw new Error(error?.message ?? '发送消息失败');
        }

        return data.id;
    },

    async get(messageId: string): Promise<MessageRow | null> {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('id', messageId)
            .single();

        if (error || !data) return null;
        return data as MessageRow;
    },

    async markAsRead(messageId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString(), read_by: userId })
            .eq('id', messageId);

        if (error) {
            throw new Error(error.message);
        }
    },

    async getMessagesForCouple(coupleId: string, limit?: number): Promise<MessageRow[]> {
        let query = supabase
            .from('messages')
            .select('*')
            .eq('couple_id', coupleId)
            .order('created_at', { ascending: true });

        if (limit) {
            query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) {
            throw new Error(error.message);
        }

        return (data ?? []) as MessageRow[];
    },

    async getUnreadCount(coupleId: string, userId: string): Promise<number> {
        const { data, error } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: false })
            .eq('couple_id', coupleId)
            .neq('sender_id', userId)
            .is('read_at', null);

        if (error) {
            throw new Error(error.message);
        }

        return data?.length ?? 0;
    },

    subscribeToMessages(coupleId: string, callback: (messages: MessageRow[]) => void) {
        const channel = supabase
            .channel(`messages:${coupleId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                    filter: `couple_id=eq.${coupleId}`,
                },
                async () => {
                    const messages = await this.getMessagesForCouple(coupleId);
                    callback(messages);
                }
            )
            .subscribe();

        this.getMessagesForCouple(coupleId).then(callback);

        return () => {
            supabase.removeChannel(channel);
        };
    },

    async deleteMessage(messageId: string): Promise<void> {
        const { error } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId);

        if (error) {
            throw new Error(error.message);
        }
    },
};
