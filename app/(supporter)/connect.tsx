/**
 * Supporter Connect Screen - 支持者连线页面
 *
 * 与执行者的"空间"页面对应，让支持者能够：
 * - 看到执行者的连线请求
 * - 加入远程陪伴
 * - 屏幕保持常亮
 * - 显示心跳同步动画
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    StatusBar,
    TouchableOpacity,
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
} from 'react-native-reanimated';

import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';
import { useLocationStore, PartnerActivity } from '@/stores/locationStore';
import { useUserStore } from '@/stores/userStore';
import { useEnergyStore, ACTION_POINTS } from '@/stores/energyStore';

const ACTIVITY_CONFIG: Record<PartnerActivity, { label: string; emoji: string; color: string }> = {
    idle: { label: '空闲', emoji: '😌', color: Colors.textMuted },
    working: { label: '专注中', emoji: '💪', color: Colors.success },
    break: { label: '休息中', emoji: '☕', color: Colors.secondary },
    away: { label: '离开', emoji: '🚶', color: Colors.warning },
};

export default function SupporterConnectScreen() {
    const user = useUserStore((s) => s.user);
    const { addPoints } = useEnergyStore();

    const {
        bodyDoublingActive,
        partnerOnline,
        partnerActivity,
        currentSession,
        bodyDoublingStats,
        supporterJoinSession,
        leaveSession,
        connectToPartner,
        disconnectFromPartner,
    } = useLocationStore();

    const [sessionTimer, setSessionTimer] = useState(0);
    const [hasJoined, setHasJoined] = useState(false);

    // Animated values
    const pulseScale = useSharedValue(1);
    const glowOpacity = useSharedValue(0.3);
    const heartbeatScale = useSharedValue(1);

    // Connect to partner's presence channel on mount
    useEffect(() => {
        if (user?.coupleId) {
            connectToPartner(user.coupleId, user.id, 'supporter');
        }
        return () => {
            disconnectFromPartner();
        };
    }, [user?.coupleId]);

    // Session timer
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (hasJoined && currentSession) {
            interval = setInterval(() => {
                const startTime = new Date(currentSession.startTime).getTime();
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                setSessionTimer(elapsed);
            }, 1000);
        } else {
            setSessionTimer(0);
        }
        return () => clearInterval(interval);
    }, [hasJoined, currentSession]);

    // Keep screen awake when joined (mobile only)
    useEffect(() => {
        if (Platform.OS === 'web') return;

        if (hasJoined) {
            activateKeepAwakeAsync().catch(() => {
                // Ignore errors on activation
            });
        }

        return () => {
            if (hasJoined) {
                try {
                    deactivateKeepAwake();
                } catch {
                    // Ignore errors on deactivation
                }
            }
        };
    }, [hasJoined]);

    // Heartbeat animation when connected
    useEffect(() => {
        if (hasJoined && partnerOnline) {
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
            heartbeatScale.value = withTiming(1);
        }
    }, [hasJoined, partnerOnline]);

    const handleJoinSession = async () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        setHasJoined(true);
        supporterJoinSession();
    };

    const handleLeaveSession = () => {
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // Award points based on session duration
        const minutes = Math.floor(sessionTimer / 60);
        const pointsEarned = Math.floor(minutes / 30) * ACTION_POINTS.body_doubling;
        if (pointsEarned > 0 && user?.id) {
            addPoints({
                userId: user.id,
                actionType: 'body_doubling',
                points: pointsEarned,
                description: `远程陪伴 ${minutes} 分钟`,
            });
        }

        setHasJoined(false);
        leaveSession();
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate potential points
    const potentialPoints = Math.floor((sessionTimer / 60 + 30) / 30) * ACTION_POINTS.body_doubling;

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    const heartbeatStyle = useAnimatedStyle(() => ({
        transform: [{ scale: heartbeatScale.value }],
    }));

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Header */}
                <Animated.View entering={FadeInUp} style={styles.header}>
                    <Text style={styles.title}>💚 远程陪伴</Text>
                    <Text style={styles.subtitle}>让 TA 知道你一直在</Text>
                </Animated.View>

                {/* Connection Status Card */}
                <Animated.View entering={FadeInUp.delay(100)} style={styles.card}>
                    {/* Connection visualization */}
                    <View style={styles.connectionArea}>
                        {/* My indicator */}
                        <View style={styles.personContainer}>
                            <Animated.View
                                style={[
                                    styles.indicatorGlow,
                                    hasJoined && styles.indicatorGlowActive,
                                    glowStyle,
                                ]}
                            />
                            <View
                                style={[
                                    styles.indicator,
                                    hasJoined && styles.indicatorActive,
                                ]}
                            >
                                <Text style={styles.indicatorEmoji}>
                                    {hasJoined ? '💚' : '👤'}
                                </Text>
                            </View>
                            <Text style={styles.personLabel}>我</Text>
                            {hasJoined && (
                                <Text style={styles.onlineStatus}>陪伴中</Text>
                            )}
                        </View>

                        {/* Connection line */}
                        <View style={styles.lineContainer}>
                            <View style={styles.connectionLineBase} />
                            {hasJoined && partnerOnline && (
                                <Animated.View
                                    style={[styles.connectionLineActive]}
                                />
                            )}
                            {hasJoined && partnerOnline && (
                                <Animated.View
                                    entering={FadeIn}
                                    style={[styles.heartbeatPulse, heartbeatStyle]}
                                >
                                    <Text style={styles.heartbeatEmoji}>💚</Text>
                                </Animated.View>
                            )}
                        </View>

                        {/* Partner indicator */}
                        <View style={styles.personContainer}>
                            <Animated.View
                                style={[
                                    styles.indicatorGlow,
                                    partnerOnline && styles.indicatorGlowPartner,
                                    glowStyle,
                                ]}
                            />
                            <Animated.View
                                style={[
                                    styles.indicator,
                                    partnerOnline && styles.indicatorPartnerOnline,
                                    indicatorStyle,
                                ]}
                            >
                                <Text style={styles.indicatorEmoji}>
                                    {partnerOnline ? '🧡' : '👤'}
                                </Text>
                            </Animated.View>
                            <Text style={styles.personLabel}>执行者</Text>
                            <Text
                                style={[
                                    styles.onlineStatus,
                                    !partnerOnline && styles.offlineStatus,
                                ]}
                            >
                                {partnerOnline ? '在线' : '离线'}
                            </Text>
                        </View>
                    </View>

                    {/* Status message */}
                    {bodyDoublingActive && partnerOnline && !hasJoined && (
                        <Animated.View
                            entering={FadeIn}
                            style={styles.inviteMessage}
                        >
                            <Text style={styles.inviteEmoji}>✨</Text>
                            <Text style={styles.inviteText}>
                                执行者正在等待你的陪伴！
                            </Text>
                        </Animated.View>
                    )}

                    {hasJoined && (
                        <Animated.View
                            entering={FadeIn}
                            style={styles.statusMessage}
                        >
                            <Text style={styles.statusEmoji}>
                                {partnerOnline ? '✨' : '⏳'}
                            </Text>
                            <Text style={styles.statusMessageText}>
                                {partnerOnline
                                    ? '你的陪伴让 TA 更专注！'
                                    : '执行者暂时离开，稍等一下...'}
                            </Text>
                        </Animated.View>
                    )}

                    {/* Timer display when joined */}
                    {hasJoined && (
                        <View style={styles.timerContainer}>
                            <Text style={styles.timerLabel}>已陪伴</Text>
                            <Text style={styles.timerValue}>
                                {formatTime(sessionTimer)}
                            </Text>
                        </View>
                    )}

                    {/* Action button */}
                    {bodyDoublingActive && partnerOnline && !hasJoined ? (
                        <TouchableOpacity
                            style={styles.joinButton}
                            onPress={handleJoinSession}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.joinButtonText}>
                                💚 加入陪伴
                            </Text>
                        </TouchableOpacity>
                    ) : hasJoined ? (
                        <TouchableOpacity
                            style={styles.leaveButton}
                            onPress={handleLeaveSession}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.leaveButtonText}>
                                ⏹️ 结束陪伴
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.waitingContainer}>
                            <Text style={styles.waitingText}>
                                {partnerOnline
                                    ? '执行者尚未开启连线'
                                    : '等待执行者上线...'}
                            </Text>
                        </View>
                    )}

                    {/* Points info */}
                    {hasJoined && (
                        <View style={styles.pointsInfo}>
                            <Text style={styles.pointsLabel}>
                                ⚡ 每 30 分钟获得 +{ACTION_POINTS.body_doubling} 能量点
                            </Text>
                            <Text style={styles.pointsValue}>
                                本次可获得约 +{potentialPoints} 点
                            </Text>
                        </View>
                    )}
                </Animated.View>

                {/* Stats Card */}
                <Animated.View entering={FadeInUp.delay(200)} style={styles.card}>
                    <Text style={styles.cardTitle}>📊 陪伴统计</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>
                                {bodyDoublingStats.totalSessions}
                            </Text>
                            <Text style={styles.statLabel}>总次数</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>
                                {bodyDoublingStats.totalMinutes}
                            </Text>
                            <Text style={styles.statLabel}>总分钟</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>
                                {bodyDoublingStats.thisWeekMinutes}
                            </Text>
                            <Text style={styles.statLabel}>本周</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Benefits */}
                <Animated.View entering={FadeInUp.delay(300)} style={styles.card}>
                    <Text style={styles.cardTitle}>💡 陪伴的意义</Text>
                    <Text style={styles.benefitItem}>
                        • ADHD 执行者独自做事时容易分心
                    </Text>
                    <Text style={styles.benefitItem}>
                        • 知道有人在陪伴会更容易保持专注
                    </Text>
                    <Text style={styles.benefitItem}>
                        • 你不需要做任何事，只需"在"就够了
                    </Text>
                    <Text style={styles.benefitItem}>
                        • 每 30 分钟获得 +{ACTION_POINTS.body_doubling} 能量点
                    </Text>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },
    header: {
        marginBottom: Spacing.lg,
    },
    title: {
        fontSize: FontSizes.xxl,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
    },
    cardTitle: {
        fontSize: FontSizes.lg,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
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
        borderColor: Colors.success,
        backgroundColor: Colors.success + '20',
    },
    indicatorPartnerOnline: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '20',
    },
    indicatorGlow: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'transparent',
        top: -10,
    },
    indicatorGlowActive: {
        backgroundColor: Colors.success,
    },
    indicatorGlowPartner: {
        backgroundColor: Colors.primary,
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
    offlineStatus: {
        color: Colors.textMuted,
    },
    lineContainer: {
        flex: 1,
        height: 40,
        marginHorizontal: Spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    connectionLineBase: {
        height: 2,
        width: '100%',
        backgroundColor: Colors.surfaceElevated,
        borderRadius: 1,
    },
    connectionLineActive: {
        position: 'absolute',
        height: 4,
        backgroundColor: Colors.success,
        borderRadius: 2,
        width: '100%',
    },
    heartbeatPulse: {
        position: 'absolute',
    },
    heartbeatEmoji: {
        fontSize: 24,
    },
    inviteMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.success + '20',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    inviteEmoji: {
        fontSize: 20,
        marginRight: Spacing.sm,
    },
    inviteText: {
        fontSize: FontSizes.md,
        color: Colors.success,
        fontWeight: '600',
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
    timerContainer: {
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    timerLabel: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
    },
    timerValue: {
        fontSize: FontSizes.hero,
        fontWeight: '700',
        color: Colors.success,
        fontVariant: ['tabular-nums'],
    },
    joinButton: {
        backgroundColor: Colors.success,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    joinButtonText: {
        color: '#FFF',
        fontSize: FontSizes.lg,
        fontWeight: '700',
    },
    leaveButton: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    leaveButtonText: {
        color: Colors.textPrimary,
        fontSize: FontSizes.md,
        fontWeight: '600',
    },
    waitingContainer: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    waitingText: {
        fontSize: FontSizes.md,
        color: Colors.textMuted,
    },
    pointsInfo: {
        backgroundColor: Colors.energyGlow + '15',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        alignItems: 'center',
    },
    pointsLabel: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
    },
    pointsValue: {
        fontSize: FontSizes.md,
        color: Colors.energyGlow,
        fontWeight: '600',
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: FontSizes.xl,
        fontWeight: '700',
        color: Colors.supporter.primary,
    },
    statLabel: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        marginTop: Spacing.xs,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: Colors.surfaceElevated,
    },
    benefitItem: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
        lineHeight: 20,
    },
});
