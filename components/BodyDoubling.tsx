import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Modal,
    Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
    withSpring,
    FadeIn,
    FadeInUp,
    SlideInDown,
} from 'react-native-reanimated';

import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';
import { useLocationStore, PartnerActivity } from '@/stores/locationStore';
import { useUserStore } from '@/stores/userStore';
import { useBadgeStore } from '@/stores/badgeStore';

const { width } = Dimensions.get('window');

interface BodyDoublingProps {
    partnerName?: string;
    onToggle?: (active: boolean) => void;
}

const ACTIVITY_CONFIG: Record<PartnerActivity, { label: string; emoji: string; color: string }> = {
    idle: { label: '空闲', emoji: '😌', color: Colors.textMuted },
    working: { label: '专注中', emoji: '💪', color: Colors.success },
    break: { label: '休息中', emoji: '☕', color: Colors.secondary },
    away: { label: '离开', emoji: '🚶', color: Colors.warning },
};

export default function BodyDoubling({
    partnerName = '支持者',
    onToggle,
}: BodyDoublingProps) {
    const user = useUserStore((s) => s.user);
    const {
        bodyDoublingActive,
        partnerOnline,
        partnerActivity,
        currentSession,
        bodyDoublingStats,
        supporterMessage,
        toggleBodyDoubling,
        setPartnerOnline,
        updatePartnerActivity,
        endSession,
        connectToPartner,
        disconnectFromPartner,
    } = useLocationStore();

    const { addBodyDoublingMinutes } = useBadgeStore();

    const [showStatsModal, setShowStatsModal] = useState(false);
    const [showEndSessionModal, setShowEndSessionModal] = useState(false);
    const [focusRating, setFocusRating] = useState(3);
    const [sessionTimer, setSessionTimer] = useState(0);

    // Animated values
    const pulseScale = useSharedValue(1);
    const glowOpacity = useSharedValue(0.3);
    const connectionLine = useSharedValue(0);
    const heartbeatScale = useSharedValue(1);

    // Connect to partner's presence channel on mount
    useEffect(() => {
        if (user?.coupleId && user?.id) {
            connectToPartner(user.coupleId, user.id, 'executor');
        }
        return () => {
            disconnectFromPartner();
        };
    }, [user?.coupleId, user?.id]);

    // Keep screen awake when body doubling is active (mobile only)
    useEffect(() => {
        if (Platform.OS === 'web') return;

        if (bodyDoublingActive) {
            activateKeepAwakeAsync().catch(() => {
                // Ignore errors on activation
            });
        }

        return () => {
            if (bodyDoublingActive) {
                try {
                    deactivateKeepAwake();
                } catch {
                    // Ignore errors on deactivation
                }
            }
        };
    }, [bodyDoublingActive]);

    // Session timer
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (bodyDoublingActive && currentSession) {
            interval = setInterval(() => {
                const startTime = new Date(currentSession.startTime).getTime();
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                setSessionTimer(elapsed);
            }, 1000);
        } else {
            setSessionTimer(0);
        }
        return () => clearInterval(interval);
    }, [bodyDoublingActive, currentSession]);

    // Pulse animation when partner is online
    useEffect(() => {
        if (partnerOnline && bodyDoublingActive) {
            pulseScale.value = withRepeat(
                withSequence(
                    withTiming(1.1, { duration: 1000 }),
                    withTiming(1, { duration: 1000 })
                ),
                -1,
                true
            );
            glowOpacity.value = withRepeat(
                withSequence(
                    withTiming(0.6, { duration: 1000 }),
                    withTiming(0.3, { duration: 1000 })
                ),
                -1,
                true
            );
            connectionLine.value = withSpring(1);

            // Heartbeat animation
            heartbeatScale.value = withRepeat(
                withSequence(
                    withTiming(1.2, { duration: 200 }),
                    withTiming(1, { duration: 200 }),
                    withTiming(1.15, { duration: 150 }),
                    withTiming(1, { duration: 500 })
                ),
                -1,
                true
            );
        } else {
            pulseScale.value = withTiming(1);
            glowOpacity.value = withTiming(0.3);
            connectionLine.value = withTiming(0);
            heartbeatScale.value = withTiming(1);
        }
    }, [partnerOnline, bodyDoublingActive]);

    const handleToggle = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        if (bodyDoublingActive) {
            // Show end session modal before stopping
            setShowEndSessionModal(true);
        } else {
            toggleBodyDoubling();
            onToggle?.(true);
        }
    };

    const handleEndSession = () => {
        const minutes = Math.floor(sessionTimer / 60);
        if (minutes > 0) {
            addBodyDoublingMinutes(minutes);
        }
        endSession(focusRating);
        setShowEndSessionModal(false);
        onToggle?.(false);
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    const lineStyle = useAnimatedStyle(() => ({
        transform: [{ scaleX: connectionLine.value }],
        opacity: connectionLine.value,
    }));

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>👥 远程陪同</Text>
                <View style={[
                    styles.statusBadge,
                    bodyDoublingActive && styles.statusBadgeActive
                ]}>
                    <Text style={[
                        styles.statusText,
                        bodyDoublingActive && styles.statusTextActive
                    ]}>
                        {bodyDoublingActive ? '连线中' : '已关闭'}
                    </Text>
                </View>
            </View>

            <Text style={styles.subtitle}>
                开启连线，感受 TA 一直在陪伴你
            </Text>

            {/* Connection visualization */}
            <View style={styles.connectionArea}>
                {/* Your indicator */}
                <View style={styles.personContainer}>
                    <Animated.View style={[styles.indicatorGlow, glowStyle]} />
                    <View style={[
                        styles.indicator,
                        bodyDoublingActive && styles.indicatorActive
                    ]}>
                        <Text style={styles.indicatorEmoji}>👤</Text>
                    </View>
                    <Text style={styles.personLabel}>我</Text>
                </View>

                {/* Connection line */}
                <View style={styles.lineContainer}>
                    <Animated.View style={[styles.connectionLineBase]} />
                    <Animated.View style={[styles.connectionLineActive, lineStyle]} />
                    {partnerOnline && bodyDoublingActive && (
                        <Animated.View
                            entering={FadeIn}
                            style={styles.connectionPulse}
                        />
                    )}
                </View>

                {/* Partner indicator */}
                <View style={styles.personContainer}>
                    <Animated.View
                        style={[
                            styles.indicatorGlow,
                            partnerOnline && styles.indicatorGlowPartner,
                            glowStyle
                        ]}
                    />
                    <Animated.View style={[
                        styles.indicator,
                        partnerOnline && bodyDoublingActive && styles.indicatorPartnerActive,
                        indicatorStyle,
                    ]}>
                        <Text style={styles.indicatorEmoji}>
                            {partnerOnline && bodyDoublingActive ? '💚' : '👤'}
                        </Text>
                    </Animated.View>
                    <Text style={styles.personLabel}>{partnerName}</Text>
                    {partnerOnline && bodyDoublingActive && (
                        <Text style={styles.onlineStatus}>在线</Text>
                    )}
                </View>
            </View>

            {/* Status message */}
            {bodyDoublingActive && (
                <Animated.View
                    entering={FadeIn}
                    style={styles.statusMessage}
                >
                    <Text style={styles.statusEmoji}>
                        {partnerOnline ? '✨' : '⏳'}
                    </Text>
                    <Text style={styles.statusMessageText}>
                        {partnerOnline
                            ? `${partnerName}正在陪伴你，你不是一个人！`
                            : `正在等待${partnerName}上线...`
                        }
                    </Text>
                </Animated.View>
            )}

            {/* Toggle button */}
            <TouchableOpacity
                style={[
                    styles.toggleButton,
                    bodyDoublingActive && styles.toggleButtonActive
                ]}
                onPress={handleToggle}
                activeOpacity={0.8}
            >
                <Text style={styles.toggleButtonText}>
                    {bodyDoublingActive ? '⏹️ 结束连线' : '▶️ 开始连线'}
                </Text>
            </TouchableOpacity>

            {/* Benefits */}
            <View style={styles.benefits}>
                <Text style={styles.benefitsTitle}>💡 远程陪同的好处</Text>
                <Text style={styles.benefitItem}>• 减少 ADHD 执行时的孤独感</Text>
                <Text style={styles.benefitItem}>• 知道有人在关注会更容易专注</Text>
                <Text style={styles.benefitItem}>• 支持者获得 +15 能量点/30分钟</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    title: {
        fontSize: FontSizes.lg,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    statusBadge: {
        backgroundColor: Colors.surfaceElevated,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
    },
    statusBadgeActive: {
        backgroundColor: Colors.success + '30',
    },
    statusText: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
    },
    statusTextActive: {
        color: Colors.success,
        fontWeight: '600',
    },
    subtitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.lg,
    },
    connectionArea: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.lg,
        marginBottom: Spacing.md,
    },
    personContainer: {
        alignItems: 'center',
        width: 80,
    },
    indicator: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: Colors.textMuted,
        zIndex: 1,
    },
    indicatorActive: {
        borderColor: Colors.primary,
    },
    indicatorPartnerActive: {
        borderColor: Colors.success,
        backgroundColor: Colors.success + '20',
    },
    indicatorGlow: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.primary,
        top: -10,
    },
    indicatorGlowPartner: {
        backgroundColor: Colors.success,
    },
    indicatorEmoji: {
        fontSize: 28,
    },
    personLabel: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginTop: Spacing.sm,
    },
    onlineStatus: {
        fontSize: FontSizes.xs,
        color: Colors.success,
        fontWeight: '600',
    },
    lineContainer: {
        flex: 1,
        height: 4,
        marginHorizontal: Spacing.md,
        justifyContent: 'center',
    },
    connectionLineBase: {
        height: 2,
        backgroundColor: Colors.surfaceElevated,
        borderRadius: 1,
    },
    connectionLineActive: {
        position: 'absolute',
        height: 4,
        backgroundColor: Colors.success,
        borderRadius: 2,
        width: '100%',
        left: 0,
    },
    connectionPulse: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.success,
        left: '50%',
        marginLeft: -6,
    },
    statusMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    statusEmoji: {
        fontSize: 20,
        marginRight: Spacing.sm,
    },
    statusMessageText: {
        fontSize: FontSizes.md,
        color: Colors.textPrimary,
    },
    toggleButton: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    toggleButtonActive: {
        backgroundColor: Colors.surfaceElevated,
    },
    toggleButtonText: {
        color: '#FFF',
        fontSize: FontSizes.md,
        fontWeight: '700',
    },
    benefits: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
    },
    benefitsTitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    benefitItem: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        marginBottom: Spacing.xs,
    },
});
