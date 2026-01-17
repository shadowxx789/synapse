import { UserRole } from '@/stores/userStore';
import { supabaseAuthService } from '@/services/supabaseAuthService';
import { isSupabaseConfigured } from '@/services/supabase';
import {
    coupleService as supabaseCoupleService,
    energyService as supabaseEnergyService,
    messageService as supabaseMessageService,
    rewardService as supabaseRewardService,
    taskService as supabaseTaskService,
    userService as supabaseUserService,
} from '@/services/supabaseDatabase';

export type Unsubscribe = () => void;

export interface AuthError {
    code: string;
    message: string;
}

export type MessageType =
    | 'text'
    | 'task_request'
    | 'task_update'
    | 'energy_boost'
    | 'energy_request'
    | 'mood_share'
    | 'system';

interface MessageCreateInput {
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
}

const supabaseMessageAdapter = {
    async create(message: MessageCreateInput): Promise<string> {
        return supabaseMessageService.create({
            couple_id: message.coupleId,
            sender_id: message.senderId,
            type: message.type,
            encrypted_content: message.encryptedContent,
            iv: message.iv,
            metadata: message.metadata ?? null,
        });
    },
    get: supabaseMessageService.get,
    getMessagesForCouple: supabaseMessageService.getMessagesForCouple,
    subscribeToMessages: supabaseMessageService.subscribeToMessages,
    markAsRead: supabaseMessageService.markAsRead,
    getUnreadCount: supabaseMessageService.getUnreadCount,
    deleteMessage: supabaseMessageService.deleteMessage,
};

const supabaseUserAdapter = {
    ...supabaseUserService,
    async update(userId: string, updates: {
        role?: UserRole;
        partnerId?: string | null;
        pairingCode?: string | null;
        pairingCodeExpiresAt?: string | null;
        coupleId?: string | null;
    }) {
        const mappedUpdates = {
            role: updates.role,
            partner_id: updates.partnerId ?? undefined,
            pairing_code: updates.pairingCode ?? undefined,
            pairing_code_expires_at: updates.pairingCodeExpiresAt ?? undefined,
            couple_id: updates.coupleId ?? undefined,
        };
        return supabaseUserService.update(userId, mappedUpdates);
    },
};

export const authService = supabaseAuthService;
export const userService = supabaseUserAdapter;
export const taskService = supabaseTaskService;
export const coupleService = supabaseCoupleService;
export const energyService = supabaseEnergyService;
export const rewardService = supabaseRewardService;
export const messageService = supabaseMessageAdapter;
export const isSupabaseEnabled = isSupabaseConfigured;
