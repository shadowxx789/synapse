import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged as firebaseOnAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile,
    User as FirebaseUser,
    Unsubscribe,
} from 'firebase/auth';
import { auth, db, userService } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UserRole } from '@/stores/userStore';
import { withRetry, getErrorMessage, isRetryableError } from '@/services/errorService';

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

// ============================================================================
// Auth Service
// ============================================================================

export const authService = {
    /**
     * Register a new user with email and password
     */
    async register(
        email: string,
        password: string,
        name: string
    ): Promise<AuthUser> {
        return withRetry(async () => {
            try {
                // Create Firebase Auth user
                const credential = await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

                // Update display name
                await updateProfile(credential.user, { displayName: name });

                // Create Firestore user document
                await userService.create({
                    id: credential.user.uid,
                    email: email.toLowerCase(),
                    name,
                    role: null, // Role will be selected after registration
                });

                return {
                    id: credential.user.uid,
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

    /**
     * Sign in with email and password
     */
    async login(email: string, password: string): Promise<AuthUser> {
        return withRetry(async () => {
            try {
                const credential = await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

                // Fetch user data from Firestore
                const userData = await userService.get(credential.user.uid);

                if (!userData) {
                    // User exists in Auth but not in Firestore - create document
                    await userService.create({
                        id: credential.user.uid,
                        email: email.toLowerCase(),
                        name: credential.user.displayName || '用户',
                        role: null,
                    });

                    return {
                        id: credential.user.uid,
                        email: email.toLowerCase(),
                        name: credential.user.displayName || '用户',
                        role: null,
                    };
                }

                return {
                    id: userData.id,
                    email: userData.email,
                    name: userData.name,
                    role: userData.role,
                    partnerId: userData.partnerId,
                    pairingCode: userData.pairingCode,
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

    /**
     * Sign out the current user
     */
    async logout(): Promise<void> {
        return withRetry(async () => {
            try {
                await signOut(auth);
            } catch (error) {
                throw new Error(getErrorMessage(error));
            }
        }, {
            maxRetries: 2,
            initialDelayMs: 500,
            retryCondition: isRetryableError,
        });
    },

    /**
     * Get the current authenticated user
     */
    getCurrentUser(): FirebaseUser | null {
        return auth.currentUser;
    },

    /**
     * Get current user's full profile from Firestore
     */
    async getCurrentUserProfile(): Promise<AuthUser | null> {
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) return null;

        return withRetry(async () => {
            const userData = await userService.get(firebaseUser.uid);
            if (!userData) return null;

            return {
                id: userData.id,
                email: userData.email,
                name: userData.name,
                role: userData.role,
                partnerId: userData.partnerId,
                pairingCode: userData.pairingCode,
            };
        }, {
            maxRetries: 2,
            initialDelayMs: 1000,
            retryCondition: isRetryableError,
        });
    },

    /**
     * Listen to authentication state changes
     */
    onAuthStateChanged(
        callback: (user: AuthUser | null) => void
    ): Unsubscribe {
        return firebaseOnAuthStateChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                callback(null);
                return;
            }

            try {
                const userData = await withRetry(
                    () => userService.get(firebaseUser.uid),
                    {
                        maxRetries: 2,
                        initialDelayMs: 1000,
                        retryCondition: isRetryableError,
                    }
                );

                if (userData) {
                    callback({
                        id: userData.id,
                        email: userData.email,
                        name: userData.name,
                        role: userData.role,
                        partnerId: userData.partnerId,
                        pairingCode: userData.pairingCode,
                    });
                } else {
                    // User in Auth but not in Firestore
                    callback({
                        id: firebaseUser.uid,
                        email: firebaseUser.email || '',
                        name: firebaseUser.displayName || '用户',
                        role: null,
                    });
                }
            } catch {
                // Firestore fetch failed, return basic info
                callback({
                    id: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    name: firebaseUser.displayName || '用户',
                    role: null,
                });
            }
        });
    },

    /**
     * Send password reset email
     */
    async sendPasswordReset(email: string): Promise<void> {
        return withRetry(async () => {
            try {
                await sendPasswordResetEmail(auth, email);
            } catch (error) {
                throw new Error(getErrorMessage(error));
            }
        }, {
            maxRetries: 2,
            initialDelayMs: 1000,
            retryCondition: isRetryableError,
        });
    },

    /**
     * Update user's role
     */
    async updateRole(userId: string, role: UserRole): Promise<void> {
        return withRetry(async () => {
            await userService.update(userId, { role });
        }, {
            maxRetries: 2,
            initialDelayMs: 1000,
            retryCondition: isRetryableError,
        });
    },

    /**
     * Check if email is already registered
     */
    async isEmailRegistered(email: string): Promise<boolean> {
        return withRetry(async () => {
            try {
                const usersRef = doc(db, 'users', email.toLowerCase());
                const snapshot = await getDoc(usersRef);
                return snapshot.exists();
            } catch (error) {
                // Return false on error for safety
                return false;
            }
        }, {
            maxRetries: 2,
            initialDelayMs: 500,
            retryCondition: isRetryableError,
        });
    },
};

export default authService;
