/**
 * Toast Store - Global toast notification state management
 */

import { create } from 'zustand';

// ============================================================================
// Types
// ============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number; // ms, default 3000
    action?: {
        label: string;
        onPress: () => void;
    };
}

interface ToastState {
    toasts: Toast[];
    show: (toast: Omit<Toast, 'id'>) => string;
    hide: (id: string) => void;
    hideAll: () => void;

    // Convenience methods
    success: (message: string, duration?: number) => string;
    error: (message: string, duration?: number) => string;
    warning: (message: string, duration?: number) => string;
    info: (message: string, duration?: number) => string;
}

// ============================================================================
// Store
// ============================================================================

let toastIdCounter = 0;

export const useToastStore = create<ToastState>((set, get) => ({
    toasts: [],

    show: (toast) => {
        const id = `toast_${++toastIdCounter}_${Date.now()}`;
        const newToast: Toast = {
            ...toast,
            id,
            duration: toast.duration ?? 3000,
        };

        set((state) => ({
            toasts: [...state.toasts, newToast],
        }));

        // Auto-hide after duration
        if (newToast.duration && newToast.duration > 0) {
            setTimeout(() => {
                get().hide(id);
            }, newToast.duration);
        }

        return id;
    },

    hide: (id) => {
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        }));
    },

    hideAll: () => {
        set({ toasts: [] });
    },

    // Convenience methods
    success: (message, duration) => {
        return get().show({ type: 'success', message, duration });
    },

    error: (message, duration = 4000) => {
        return get().show({ type: 'error', message, duration });
    },

    warning: (message, duration) => {
        return get().show({ type: 'warning', message, duration });
    },

    info: (message, duration) => {
        return get().show({ type: 'info', message, duration });
    },
}));

// ============================================================================
// Helper Hook
// ============================================================================

/**
 * Convenience hook for showing toasts
 */
export const useToast = () => {
    const { show, hide, hideAll, success, error, warning, info } = useToastStore();

    return {
        show,
        hide,
        hideAll,
        success,
        error,
        warning,
        info,
    };
};
