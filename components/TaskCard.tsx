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
const MAX_CARD_WIDTH = 400;

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

    const remainingSteps = totalSteps - stepNumber;
    const cardWidth = Math.min(width - Spacing.lg * 2, MAX_CARD_WIDTH);

    return (
        <View style={styles.container}>
            {/* Compact card with title and progress */}
            <View style={[styles.card, { width: cardWidth }]}>
                {/* Progress and time in header row */}
                <View style={styles.cardHeader}>
                    <View style={styles.progressBadge}>
                        <Text style={styles.progressText}>{stepNumber}/{totalSteps}</Text>
                        {remainingSteps > 0 && remainingSteps <= 3 && (
                            <Text style={styles.progressHint}> · 还有{remainingSteps}步</Text>
                        )}
                    </View>
                    <View style={styles.timeBadge}>
                        <Text style={styles.timeText}>⏱ {estimatedMinutes}分钟</Text>
                    </View>
                </View>

                {/* Task title */}
                <Text style={styles.taskTitle} numberOfLines={2}>{title}</Text>

                {/* Focus hint */}
                <View style={styles.focusHint}>
                    <View style={styles.focusDot} />
                    <Text style={styles.focusText}>只做这件事</Text>
                </View>
            </View>

            {/* Action buttons row */}
            <View style={[styles.actionsRow, { width: cardWidth }]}>
                {onSkip && (
                    <TouchableOpacity
                        style={styles.skipButton}
                        onPress={handleSkip}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.skipText}>跳过</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[styles.completeButton, !onSkip && styles.completeButtonFull]}
                    onPress={handleComplete}
                    activeOpacity={0.7}
                >
                    <LinearGradient
                        colors={[Colors.primary, '#FF8C61']}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.completeText}>✓ 完成!</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.lg,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 2,
        borderColor: Colors.executor.glow,
        ...Platform.select({
            web: { boxShadow: '0px 4px 12px rgba(255, 107, 53, 0.15)' },
            default: {
                shadowColor: Colors.executor.primary,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.15,
                shadowRadius: 6,
                elevation: 6,
            },
        }),
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    progressBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressText: {
        color: Colors.textSecondary,
        fontSize: FontSizes.sm,
        fontWeight: '600',
    },
    progressHint: {
        color: Colors.executor.accent,
        fontSize: FontSizes.sm,
        fontWeight: '600',
    },
    timeBadge: {
        backgroundColor: Colors.surfaceElevated,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
    },
    timeText: {
        color: Colors.executor.primary,
        fontSize: FontSizes.xs,
        fontWeight: '600',
    },
    taskTitle: {
        color: Colors.textPrimary,
        fontSize: FontSizes.xl,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: FontSizes.xl * 1.3,
        marginBottom: Spacing.sm,
    },
    focusHint: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
    },
    focusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.primary,
    },
    focusText: {
        color: Colors.executor.accent,
        fontSize: FontSizes.xs,
        fontWeight: '500',
    },
    actionsRow: {
        flexDirection: 'row',
        marginTop: Spacing.sm,
        gap: Spacing.sm,
    },
    skipButton: {
        flex: 1,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.md,
    },
    skipText: {
        color: Colors.textMuted,
        fontSize: FontSizes.md,
        fontWeight: '600',
    },
    completeButton: {
        flex: 2,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        ...Platform.select({
            web: { boxShadow: '0px 4px 12px rgba(255, 107, 53, 0.4)' },
            default: {
                shadowColor: Colors.executor.primary,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.4,
                shadowRadius: 6,
                elevation: 6,
            },
        }),
    },
    completeButtonFull: {
        flex: 1,
    },
    buttonGradient: {
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    completeText: {
        color: '#FFF',
        fontSize: FontSizes.lg,
        fontWeight: '700',
    },
});
