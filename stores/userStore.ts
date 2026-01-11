import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'executor' | 'supporter' | null;

interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    partnerId?: string;
    pairingCode?: string;
}

interface UserState {
    user: User | null;
    isAuthenticated: boolean;
    isOnline: boolean;
    setUser: (user: User | null) => void;
    setRole: (role: UserRole) => void;
    setPartnerId: (partnerId: string) => void;
    setPairingCode: (code: string) => void;
    setOnline: (online: boolean) => void;
    logout: () => void;
}

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            isOnline: true,

            setUser: (user) => set({ user, isAuthenticated: !!user }),

            setRole: (role) => set((state) => ({
                user: state.user ? { ...state.user, role } : null
            })),

            setPartnerId: (partnerId) => set((state) => ({
                user: state.user ? { ...state.user, partnerId } : null
            })),

            setPairingCode: (pairingCode) => set((state) => ({
                user: state.user ? { ...state.user, pairingCode } : null
            })),

            setOnline: (isOnline) => set({ isOnline }),

            logout: () => set({ user: null, isAuthenticated: false }),
        }),
        {
            name: 'synapse-user-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
