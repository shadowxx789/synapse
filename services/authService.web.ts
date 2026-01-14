import { UserRole } from '@/stores/userStore';

// ============================================================================
// Types
// ============================================================================

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

type Unsubscribe = () => void;

const createNotSupportedError = (): Error =>
    new Error('Auth service is not available on web.');

// ============================================================================
// Auth Service (web stub)
// ============================================================================

export const authService = {
    async register(): Promise<AuthUser> {
        return Promise.reject(createNotSupportedError());
    },

    async login(): Promise<AuthUser> {
        return Promise.reject(createNotSupportedError());
    },

    async logout(): Promise<void> {
        return Promise.reject(createNotSupportedError());
    },

    getCurrentUser(): null {
        return null;
    },

    async getCurrentUserProfile(): Promise<AuthUser | null> {
        return Promise.resolve(null);
    },

    onAuthStateChanged(callback: (user: AuthUser | null) => void): Unsubscribe {
        callback(null);
        return () => undefined;
    },

    async sendPasswordReset(): Promise<void> {
        return Promise.reject(createNotSupportedError());
    },

    async updateRole(): Promise<void> {
        return Promise.reject(createNotSupportedError());
    },

    async isEmailRegistered(): Promise<boolean> {
        return Promise.resolve(false);
    },
};

export default authService;
