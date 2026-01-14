/**
 * Toast Component - User-friendly notification system
 *
 * Features:
 * - Multiple toast types (success, error, warning, info)
 * - Auto-dismiss with configurable duration
 * - Swipe to dismiss
 * - Stacking support
 * - Animated entrance/exit
 */

import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Pressable,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    runOnJS,
    FadeIn,
    FadeOut,
    SlideInUp,
    SlideOutUp,
} from 'react-native-reanimated';
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';
import { useToastStore, Toast as ToastType, ToastType as ToastVariant } from '@/stores/toastStore';

// ============================================================================
// Toast Item Component
// ============================================================================

interface ToastItemProps {
    toast: ToastType;
    onDismiss: () => void;
}

const TOAST_ICONS: Record<ToastVariant, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
};

const TOAST_COLORS: Record<ToastVariant, { bg: string; border: string; text: string }> = {
    success: {
        bg: 'rgba(46, 204, 113, 0.15)',
        border: 'rgba(46, 204, 113, 0.3)',
        text: Colors.success,
    },
    error: {
        bg: 'rgba(231, 76, 60, 0.15)',
        border: 'rgba(231, 76, 60, 0.3)',
        text: Colors.error,
    },
    warning: {
        bg: 'rgba(241, 196, 15, 0.15)',
        border: 'rgba(241, 196, 15, 0.3)',
        text: Colors.warning,
    },
    info: {
        bg: 'rgba(78, 205, 196, 0.15)',
        border: 'rgba(78, 205, 196, 0.3)',
        text: Colors.secondary,
    },
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
    const translateX = useSharedValue(0);
    const opacity = useSharedValue(1);

    const colors = TOAST_COLORS[toast.type];
    const icon = TOAST_ICONS[toast.type];

    const handleDismiss = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onDismiss();
    };

    // Swipe gesture for dismissal
    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            translateX.value = event.translationX;
            opacity.value = 1 - Math.abs(event.translationX) / 200;
        })
        .onEnd((event) => {
            if (Math.abs(event.translationX) > 100) {
                translateX.value = withTiming(
                    event.translationX > 0 ? 400 : -400,
                    { duration: 200 },
                    () => runOnJS(handleDismiss)()
                );
            } else {
                translateX.value = withSpring(0);
                opacity.value = withTiming(1);
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
        opacity: opacity.value,
    }));

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View
                entering={SlideInUp.springify().damping(15)}
                exiting={SlideOutUp.duration(200)}
                style={[
                    styles.toastItem,
                    {
                        backgroundColor: colors.bg,
                        borderColor: colors.border,
                    },
                    animatedStyle,
                ]}
            >
                {/* Icon */}
                <View style={[styles.iconContainer, { backgroundColor: colors.text }]}>
                    <Text style={styles.iconText}>{icon}</Text>
                </View>

                {/* Message */}
                <Text style={styles.message} numberOfLines={3}>
                    {toast.message}
                </Text>

                {/* Action button (if provided) */}
                {toast.action && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                            toast.action?.onPress();
                            onDismiss();
                        }}
                    >
                        <Text style={[styles.actionText, { color: colors.text }]}>
                            {toast.action.label}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Dismiss button */}
                <Pressable style={styles.dismissButton} onPress={handleDismiss}>
                    <Text style={styles.dismissText}>×</Text>
                </Pressable>
            </Animated.View>
        </GestureDetector>
    );
}

// ============================================================================
// Toast Container Component
// ============================================================================

export default function ToastContainer() {
    const { toasts, hide } = useToastStore();

    if (toasts.length === 0) {
        return null;
    }

    return (
        <View style={styles.container} pointerEvents="box-none">
            {toasts.map((toast) => (
                <ToastItem
                    key={toast.id}
                    toast={toast}
                    onDismiss={() => hide(toast.id)}
                />
            ))}
        </View>
    );
}

// ============================================================================
// Simple Toast (for environments without gesture handler)
// ============================================================================

export function SimpleToastContainer() {
    const { toasts, hide } = useToastStore();

    if (toasts.length === 0) {
        return null;
    }

    return (
        <View style={styles.container} pointerEvents="box-none">
            {toasts.map((toast) => {
                const colors = TOAST_COLORS[toast.type];
                const icon = TOAST_ICONS[toast.type];

                return (
                    <Animated.View
                        key={toast.id}
                        entering={FadeIn.duration(200)}
                        exiting={FadeOut.duration(200)}
                        style={[
                            styles.toastItem,
                            {
                                backgroundColor: colors.bg,
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: colors.text }]}>
                            <Text style={styles.iconText}>{icon}</Text>
                        </View>
                        <Text style={styles.message} numberOfLines={3}>
                            {toast.message}
                        </Text>
                        <Pressable
                            style={styles.dismissButton}
                            onPress={() => hide(toast.id)}
                        >
                            <Text style={styles.dismissText}>×</Text>
                        </Pressable>
                    </Animated.View>
                );
            })}
        </View>
    );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        alignItems: 'center',
        paddingTop: Platform.select({ ios: 50, android: 40, default: 20 }),
        paddingHorizontal: Spacing.md,
    },
    toastItem: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        maxWidth: 500,
        marginBottom: Spacing.sm,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        ...Platform.select({
            web: {
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
            },
        }),
    },
    iconContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
    },
    iconText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
    message: {
        flex: 1,
        fontSize: FontSizes.sm,
        color: Colors.textPrimary,
        lineHeight: FontSizes.sm * 1.4,
    },
    actionButton: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        marginLeft: Spacing.sm,
    },
    actionText: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
    },
    dismissButton: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: Spacing.xs,
    },
    dismissText: {
        fontSize: 20,
        color: Colors.textMuted,
        fontWeight: '300',
    },
});
