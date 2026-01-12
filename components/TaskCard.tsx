import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';

interface TaskCardProps {
    title: string;
    stepNumber: number;
    totalSteps: number;
    estimatedMinutes: number;
    onComplete: () => void;
    onSkip?: () => void;
}

const { width } = Dimensions.get('window');

export default function TaskCard({
    title,
    stepNumber,
    totalSteps,
    estimatedMinutes,
    onComplete,
    onSkip,
}: TaskCardProps) {
    const handleComplete = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        onComplete();
    };

    const handleSkip = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onSkip?.();
    };

    // Simplified progress for calm focus - just show completion count
    const remainingSteps = totalSteps - stepNumber;

    return (
        <View style={styles.container}>
            {/* Minimal progress badge - no overwhelming bar */}
            <View style={styles.progressBadge}>
                <Text style={styles.progressBadgeText}>{stepNumber}/{totalSteps}</Text>
                {remainingSteps > 0 && remainingSteps <= 3 && (
                    <Text style={styles.progressHintText}>还有 {remainingSteps} 步!</Text>
                )}
            </View>

            {/* Task Card - Simplified, focused */}
            <View style={styles.card}>
                {/* Time as subtle background element, not prominent */}
                <View style={styles.timeGlow}>
                    <Text style={styles.timeEmoji}>⏱</Text>
                    <Text style={styles.timeNumber}>{estimatedMinutes}</Text>
                </View>

                {/* Large, focused title */}
                <Text style={styles.taskTitle}>{title}</Text>

                {/* Single focus hint, minimal text */}
                <View style={styles.focusIndicator}>
                    <View style={styles.focusDot} />
                    <Text style={styles.focusText}>只做这件事</Text>
                </View>
            </View>

            {/* BIG, prominent complete button - the dopamine hit */}
            <TouchableOpacity
                style={styles.completeButton}
                onPress={handleComplete}
                activeOpacity={0.7}
            >
                <LinearGradient
                    colors={[Colors.primary, '#FF8C61', '#FFB347']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                >
                    <View style={styles.buttonContent}>
                        <Text style={styles.checkMark}>✓</Text>
                        <Text style={styles.buttonText}>完成!</Text>
                    </View>
                </LinearGradient>
            </TouchableOpacity>

            {onSkip && (
                <TouchableOpacity
                    style={styles.skipButton}
                    onPress={handleSkip}
                    activeOpacity={0.7}
                >
                    <Text style={styles.skipText}>先跳过</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    progressBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    progressBadgeText: {
        color: Colors.textSecondary,
        fontSize: FontSizes.sm,
        fontWeight: '600',
    },
    progressHintText: {
        color: Colors.executor.accent,
        fontSize: FontSizes.sm,
        fontWeight: '600',
    },
    card: {
        width: width - Spacing.lg * 2,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xxl,
        padding: Spacing.xxl,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.executor.glow,
        boxShadow: '0px 8px 20px rgba(255, 107, 53, 0.25)',
        elevation: 12,
        position: 'relative',
        minHeight: 280,
        justifyContent: 'center',
    },
    timeGlow: {
        position: 'absolute',
        top: Spacing.md,
        right: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceElevated,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        gap: Spacing.xs,
    },
    timeEmoji: {
        fontSize: FontSizes.md,
    },
    timeNumber: {
        color: Colors.executor.primary,
        fontSize: FontSizes.md,
        fontWeight: '700',
    },
    taskTitle: {
        color: Colors.textPrimary,
        fontSize: FontSizes.xxl,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: FontSizes.xxl * 1.3,
        marginBottom: Spacing.xl,
        paddingHorizontal: Spacing.sm,
    },
    focusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.executor.glow,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
    },
    focusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.primary,
    },
    focusText: {
        color: Colors.executor.primary,
        fontSize: FontSizes.sm,
        fontWeight: '600',
    },
    completeButton: {
        width: width - Spacing.lg * 2,
        marginTop: Spacing.xxl,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        boxShadow: '0px 6px 16px rgba(255, 107, 53, 0.5)',
        elevation: 10,
    },
    buttonGradient: {
        paddingVertical: Spacing.xl,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.md,
    },
    checkMark: {
        fontSize: FontSizes.xl,
        fontWeight: '700',
    },
    buttonText: {
        color: '#FFF',
        fontSize: FontSizes.xl,
        fontWeight: '800',
        letterSpacing: 1,
    },
    skipButton: {
        marginTop: Spacing.lg,
        padding: Spacing.md,
    },
    skipText: {
        color: Colors.textMuted,
        fontSize: FontSizes.md,
        fontWeight: '500',
    },
});
