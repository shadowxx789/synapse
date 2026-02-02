import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'executor' | 'supporter' | null;

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    partnerId?: string;
    pairingCode?: string;
    coupleId?: string;
}

interface UserState {
    user: User | null;
    isAuthenticated: boolean;
    isOnline: boolean;
    coupleSecret: string | null; // AES-GCM encryption key for couple messages
    pendingRole: UserRole; // Role selected during onboarding, used for registration

    // Actions
    setUser: (user: User | null) => void;
    setRole: (role: UserRole) => void;
    setPendingRole: (role: UserRole) => void;
    setPartnerId: (partnerId: string) => void;
    setPairingCode: (code: string) => void;
    setCoupleId: (coupleId: string) => void;
    setCoupleSecret: (secret: string | null) => void;
    setOnline: (online: boolean) => void;
    updateUser: (updates: Partial<User>) => void;
    logout: () => void;

    // Computed helpers
    hasCompletedSetup: () => boolean;
    needsRoleSelection: () => boolean;
    needsPairing: () => boolean;
}

export const useUserStore = create<UserState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isOnline: true,
            coupleSecret: null,
            pendingRole: null,

            setUser: (user) => set({ user, isAuthenticated: !!user }),

            setRole: (role) => set((state) => ({
                user: state.user ? { ...state.user, role } : null
            })),

            setPendingRole: (pendingRole) => set({ pendingRole }),

            setPartnerId: (partnerId) => set((state) => ({
                user: state.user ? { ...state.user, partnerId } : null
            })),

            setPairingCode: (pairingCode) => set((state) => ({
                user: state.user ? { ...state.user, pairingCode } : null
            })),

            setCoupleId: (coupleId) => set((state) => ({
                user: state.user ? { ...state.user, coupleId } : null
            })),

            setCoupleSecret: (coupleSecret) => set({ coupleSecret }),

            setOnline: (isOnline) => set({ isOnline }),

            updateUser: (updates) => set((state) => ({
                user: state.user ? { ...state.user, ...updates } : null
            })),

            logout: () => set({
                user: null,
                isAuthenticated: false,
                coupleSecret: null,
                pendingRole: null,
            }),

            // Helper to check if user has completed all setup steps
            hasCompletedSetup: () => {
                const { user } = get();
                return !!(user && user.role && user.partnerId);
            },

            // Helper to check if user needs to select role
            needsRoleSelection: () => {
                const { user } = get();
                return !!(user && !user.role);
            },

            // Helper to check if user needs to pair with partner
            needsPairing: () => {
                const { user } = get();
                return !!(user && user.role && !user.partnerId);
            },
        }),
        {
            name: 'synapse-user-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
                coupleSecret: state.coupleSecret,
                pendingRole: state.pendingRole,
                // Don't persist isOnline - always start as true
            }),
        }
    )
);
