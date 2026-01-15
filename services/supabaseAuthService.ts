import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { supabase } from '@/services/supabase';
import { UserRole } from '@/stores/userStore';
import { getErrorMessage, isRetryableError, withRetry } from '@/services/errorService';

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    partnerId?: string;
    pairingCode?: string;
    coupleId?: string;
}

export interface AuthError {
    code: string;
    message: string;
}

interface ProfileRow {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    partner_id: string | null;
    pairing_code: string | null;
    couple_id: string | null;
}

const mapProfileToAuthUser = (profile: ProfileRow): AuthUser => ({
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    partnerId: profile.partner_id ?? undefined,
    pairingCode: profile.pairing_code ?? undefined,
    coupleId: profile.couple_id ?? undefined,
});

export const supabaseAuthService = {
    async register(email: string, password: string, name: string): Promise<AuthUser> {
        return withRetry(async () => {
            try {
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { name } },
                });

                if (signUpError) {
                    throw new Error(signUpError.message);
                }

                if (!signUpData.user) {
                    throw new Error('注册失败');
                }

                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert({
                        id: signUpData.user.id,
                        email: email.toLowerCase(),
                        name,
                        role: null,
                    });

                if (profileError) {
                    throw new Error(profileError.message);
                }

                return {
                    id: signUpData.user.id,
                    email: email.toLowerCase(),
                    name,
                    role: null,
                };
            } catch (error) {
                throw new Error(getErrorMessage(error));
            }
        }, {
            maxRetries: 3,
            initialDelayMs: 1000,
            retryCondition: isRetryableError,
        });
    },

    async login(email: string, password: string): Promise<AuthUser> {
        return withRetry(async () => {
            try {
                const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (loginError) {
                    throw new Error(loginError.message);
                }

                if (!loginData.user) {
                    throw new Error('登录失败');
                }

                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, email, name, role, partner_id, pairing_code, couple_id')
                    .eq('id', loginData.user.id)
                    .single();

                if (profileError || !profile) {
                    return {
                        id: loginData.user.id,
                        email: loginData.user.email ?? email.toLowerCase(),
                        name: loginData.user.user_metadata?.name ?? '用户',
                        role: null,
                    };
                }

                return mapProfileToAuthUser(profile as ProfileRow);
            } catch (error) {
                throw new Error(getErrorMessage(error));
            }
        }, {
            maxRetries: 3,
            initialDelayMs: 1000,
            retryCondition: isRetryableError,
        });
    },

    async logout(): Promise<void> {
        return withRetry(async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
                throw new Error(error.message);
            }
        }, {
            maxRetries: 2,
            initialDelayMs: 500,
            retryCondition: isRetryableError,
        });
    },

    getCurrentUser(): null {
        return null;
    },

    async getCurrentUserProfile(): Promise<AuthUser | null> {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (!user) return null;

        return withRetry(async () => {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('id, email, name, role, partner_id, pairing_code, couple_id')
                .eq('id', user.id)
                .single();

            if (error || !profile) return null;
            return mapProfileToAuthUser(profile as ProfileRow);
        }, {
            maxRetries: 2,
            initialDelayMs: 1000,
            retryCondition: isRetryableError,
        });
    },

    onAuthStateChanged(callback: (user: AuthUser | null) => void) {
        const { data: listener } = supabase.auth.onAuthStateChange(
            async (_event: AuthChangeEvent, session: Session | null) => {
                const supaUser = session?.user;
                if (!supaUser) {
                    callback(null);
                    return;
                }

                try {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id, email, name, role, partner_id, pairing_code, couple_id')
                        .eq('id', supaUser.id)
                        .single();

                    if (profile) {
                        callback(mapProfileToAuthUser(profile as ProfileRow));
                    } else {
                        callback({
                            id: supaUser.id,
                            email: supaUser.email ?? '',
                            name: supaUser.user_metadata?.name ?? '用户',
                            role: null,
                        });
                    }
                } catch {
                    callback({
                        id: supaUser.id,
                        email: supaUser.email ?? '',
                        name: supaUser.user_metadata?.name ?? '用户',
                        role: null,
                    });
                }
            }
        );

        return () => {
            listener.subscription.unsubscribe();
        };
    },

    async sendPasswordReset(email: string): Promise<void> {
        return withRetry(async () => {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) {
                throw new Error(error.message);
            }
        }, {
            maxRetries: 2,
            initialDelayMs: 1000,
            retryCondition: isRetryableError,
        });
    },

    async updateRole(userId: string, role: UserRole): Promise<void> {
        return withRetry(async () => {
            const { error } = await supabase
                .from('profiles')
                .update({ role, updated_at: new Date().toISOString() })
                .eq('id', userId);

            if (error) {
                throw new Error(error.message);
            }
        }, {
            maxRetries: 2,
            initialDelayMs: 1000,
            retryCondition: isRetryableError,
        });
    },

    async isEmailRegistered(email: string): Promise<boolean> {
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email.toLowerCase())
            .maybeSingle();

        if (error) return false;
        return Boolean(data);
    },
};

export default supabaseAuthService;
