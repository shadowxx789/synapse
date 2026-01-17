import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';

interface VisualTimerProps {
    totalMinutes: number;
    remainingSeconds: number;
    onTimeUp?: () => void;
    onWarning?: () => void;
}

const { width } = Dimensions.get('window');
const MAX_TIMER_SIZE = 280;
const TIMER_SIZE = Math.min(width * 0.65, MAX_TIMER_SIZE);
const SAND_GRAIN_COUNT = 20;

export default function VisualTimer({
    totalMinutes,
    remainingSeconds,
    onTimeUp,
    onWarning,
}: VisualTimerProps) {
    const progressAnim = useRef(new Animated.Value(1)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const sandFallAnim = useRef(new Animated.Value(0)).current;
    const hasWarned = useRef(false);
    const previousSeconds = useRef(remainingSeconds);

    const totalSeconds = totalMinutes * 60;
    const progress = remainingSeconds / totalSeconds;

    // Get warm colors based on progress for ADHD-friendly urgency
    const getColor = () => {
        if (progress > 0.5) return '#FFD700'; // Gold - plenty of time
        if (progress > 0.25) return '#FFA500'; // Orange - getting closer
        return '#FF6B35'; // Orange-Red - urgent
    };

    const getGlowColor = () => {
        if (progress > 0.5) return 'rgba(255, 215, 0, 0.3)';
        if (progress > 0.25) return 'rgba(255, 165, 0, 0.4)';
        return 'rgba(255, 107, 53, 0.5)';
    };

    useEffect(() => {
        // Smooth progress animation
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 800,
            useNativeDriver: false,
        }).start();

        // Sand falling effect when time decreases
        if (remainingSeconds < previousSeconds.current && remainingSeconds > 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Animated.sequence([
                Animated.timing(sandFallAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(sandFallAnim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                }),
            ]).start();
        }
        previousSeconds.current = remainingSeconds;

        // Warning at 25% - stronger feedback
        if (progress <= 0.25 && !hasWarned.current) {
            hasWarned.current = true;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            onWarning?.();

            // Urgent pulsing
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.08,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }

        // Time's up
        if (remainingSeconds <= 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onTimeUp?.();
        }
    }, [remainingSeconds, progress]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const currentColor = getColor();
    const currentGlow = getGlowColor();

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.timerWrapper, { transform: [{ scale: pulseAnim }] }]}>
                {/* Outer glow ring */}
                <View style={[styles.glowRing, { borderColor: currentGlow }]} />

                {/* Timer circle with sand-like fill */}
                <View style={[styles.timerCircle, { borderColor: currentColor }]}>
                    {/* Sand fill from bottom - more visceral */}
                    <Animated.View
                        style={[
                            styles.sandFill,
                            {
                                backgroundColor: currentColor,
                                height: progressAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['5%', '100%'],
                                }),
                            }
                        ]}
                    >
                        {/* Sand grain particles for visual texture */}
                        {[...Array(SAND_GRAIN_COUNT)].map((_, i) => (
                            <Animated.View
                                key={i}
                                style={[
                                    styles.sandGrain,
                                    {
                                        left: `${(i % 5) * 20}%`,
                                        bottom: sandFallAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['100%', '0%'],
                                        }),
                                        opacity: progressAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, 1],
                                        }),
                                    }
                                ]}
                            />
                        ))}
                    </Animated.View>

                    {/* Time display - minimal and clear */}
                    <View style={styles.timeOverlay}>
                        <Text style={[styles.timeText, { color: progress > 0.3 ? Colors.textPrimary : '#FFF' }]}>
                            {formatTime(remainingSeconds)}
                        </Text>
                        {/* Minimal label - only show when time is low */}
                        {progress < 0.5 && (
                            <Text style={[styles.labelText, { color: progress > 0.25 ? Colors.textSecondary : 'rgba(255,255,255,0.9)' }]}>
                                {progress <= 0.25 ? '⏰ 加快' : '继续'}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Minimal progress indicator - just 3 dots */}
                <View style={styles.dotsContainer}>
                    {[0, 1, 2].map((i) => {
                        const threshold = (i + 1) * 0.33;
                        return (
                            <View
                                key={i}
                                style={[
                                    styles.dot,
                                    {
                                        backgroundColor: progress > threshold
                                            ? currentColor
                                            : Colors.surfaceElevated,
                                        opacity: progress > threshold ? 1 : 0.5,
                                    }
                                ]}
                            />
                        );
                    })}
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.sm,
    },
    timerWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    glowRing: {
        position: 'absolute',
        width: TIMER_SIZE + 20,
        height: TIMER_SIZE + 20,
        borderRadius: (TIMER_SIZE + 20) / 2,
        borderWidth: 3,
    },
    timerCircle: {
        width: TIMER_SIZE,
        height: TIMER_SIZE,
        borderRadius: TIMER_SIZE / 2,
        borderWidth: 5,
        overflow: 'hidden',
        backgroundColor: Colors.surface,
        ...Platform.select({
            web: { boxShadow: '0px 0px 20px rgba(255, 107, 53, 0.3)' },
            default: {
                shadowColor: 'rgba(255, 107, 53, 0.3)',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 8,
            },
        }),
    },
    sandFill: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: TIMER_SIZE / 2,
        borderTopRightRadius: TIMER_SIZE / 2,
    },
    sandGrain: {
        position: 'absolute',
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: 'rgba(255,255,255,0.6)',
    },
    timeOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeText: {
        fontSize: 48,
        fontWeight: '800',
        letterSpacing: 1,
    },
    labelText: {
        fontSize: FontSizes.sm,
        marginTop: Spacing.xs,
        fontWeight: '600',
    },
    dotsContainer: {
        flexDirection: 'row',
        marginTop: Spacing.lg,
        gap: Spacing.sm,
    },
    dot: {
        width: 16,
        height: 16,
        borderRadius: 8,
    },
});
