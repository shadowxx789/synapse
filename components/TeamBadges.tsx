import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeIn,
    FadeInUp,
    SlideInUp,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
    withSpring,
} from 'react-native-reanimated';

import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';
import { useBadgeStore, Badge } from '@/stores/badgeStore';

interface TeamBadgesProps {
    onBadgeUnlocked?: (badge: Badge) => void;
}

export default function TeamBadges({ onBadgeUnlocked }: TeamBadgesProps) {
    const {
        badges,
        peacefulDays,
        currentStreak,
        totalTasksCompleted,
        checkAndUnlockBadges,
    } = useBadgeStore();

    const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
    const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);
    const [newlyUnlockedBadge, setNewlyUnlockedBadge] = useState<Badge | null>(null);

    // Animation values
    const unlockScale = useSharedValue(0);
    const sparkleRotation = useSharedValue(0);

    const handleBadgePress = (badge: Badge) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedBadge(badge);
    };

    const getProgress = (badge: Badge): number => {
        let current = 0;
        switch (badge.requirementType) {
            case 'peaceful_days':
                current = peacefulDays;
                break;
            case 'tasks_completed':
                current = totalTasksCompleted;
                break;
            case 'streak':
                current = currentStreak;
                break;
        }
        return Math.min(1, current / badge.requirement);
    };

    const getProgressLabel = (badge: Badge): string => {
        let current = 0;
        switch (badge.requirementType) {
            case 'peaceful_days':
                current = peacefulDays;
                break;
            case 'tasks_completed':
                current = totalTasksCompleted;
                break;
            case 'streak':
                current = currentStreak;
                break;
        }
        return `${current} / ${badge.requirement}`;
    };

    const simulateUnlock = () => {
        // Find first locked badge and unlock it for demo
        const lockedBadge = badges.find(b => !b.isUnlocked);
        if (lockedBadge) {
            setNewlyUnlockedBadge(lockedBadge);
            setShowUnlockAnimation(true);

            unlockScale.value = withSpring(1, { damping: 8 });
            sparkleRotation.value = withRepeat(
                withTiming(360, { duration: 3000 }),
                -1,
                false
            );

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const unlockAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: unlockScale.value }],
    }));

    const sparkleStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${sparkleRotation.value}deg` }],
    }));

    const unlockedBadges = badges.filter(b => b.isUnlocked);
    const lockedBadges = badges.filter(b => !b.isUnlocked);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>🏆 团队勋章</Text>
                    <Text style={styles.subtitle}>一起努力解锁共同奖励</Text>
                </View>
                <TouchableOpacity
                    style={styles.demoButton}
                    onPress={simulateUnlock}
                >
                    <Text style={styles.demoButtonText}>✨ 模拟解锁</Text>
                </TouchableOpacity>
            </View>

            {/* Stats Overview */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>🕊️ {peacefulDays}</Text>
                    <Text style={styles.statLabel}>和平天数</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>🔥 {currentStreak}</Text>
                    <Text style={styles.statLabel}>连续完成</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>✅ {totalTasksCompleted}</Text>
                    <Text style={styles.statLabel}>总任务</Text>
                </View>
            </View>

            {/* Unlocked Badges */}
            {unlockedBadges.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🎉 已解锁</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.badgesScroll}
                    >
                        {unlockedBadges.map((badge, index) => (
                            <Animated.View
                                key={badge.id}
                                entering={FadeInUp.delay(index * 100)}
                            >
                                <TouchableOpacity
                                    style={[styles.badgeCard, styles.badgeCardUnlocked]}
                                    onPress={() => handleBadgePress(badge)}
                                >
                                    <Text style={styles.badgeIcon}>{badge.icon}</Text>
                                    <Text style={styles.badgeName}>{badge.name}</Text>
                                    {badge.reward && (
                                        <View style={styles.rewardIndicator}>
                                            <Text style={styles.rewardIcon}>{badge.reward.icon}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Locked Badges */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔒 待解锁</Text>
                <View style={styles.lockedBadgesGrid}>
                    {lockedBadges.map((badge, index) => {
                        const progress = getProgress(badge);
                        return (
                            <Animated.View
                                key={badge.id}
                                entering={FadeInUp.delay(index * 50)}
                            >
                                <TouchableOpacity
                                    style={styles.lockedBadgeCard}
                                    onPress={() => handleBadgePress(badge)}
                                >
                                    <View style={styles.lockedBadgeHeader}>
                                        <Text style={styles.lockedBadgeIcon}>{badge.icon}</Text>
                                        <View style={styles.lockedBadgeInfo}>
                                            <Text style={styles.lockedBadgeName}>{badge.name}</Text>
                                            <Text style={styles.lockedBadgeDesc} numberOfLines={1}>
                                                {badge.description}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.progressContainer}>
                                        <View style={styles.progressBar}>
                                            <View
                                                style={[
                                                    styles.progressFill,
                                                    { width: `${progress * 100}%` }
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.progressText}>
                                            {getProgressLabel(badge)}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}
                </View>
            </View>

            {/* Badge Detail Modal */}
            <Modal
                visible={!!selectedBadge}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedBadge(null)}
            >
                <View style={styles.modalOverlay}>
                    {selectedBadge && (
                        <Animated.View
                            entering={FadeIn}
                            style={styles.detailModal}
                        >
                            <Text style={styles.detailIcon}>{selectedBadge.icon}</Text>
                            <Text style={styles.detailName}>{selectedBadge.name}</Text>
                            <Text style={styles.detailDescription}>
                                {selectedBadge.description}
                            </Text>

                            {selectedBadge.isUnlocked ? (
                                <View style={styles.unlockedStatus}>
                                    <Text style={styles.unlockedStatusText}>
                                        ✅ 已于 {selectedBadge.unlockedAt?.toLocaleDateString()} 解锁
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.progressSection}>
                                    <View style={styles.progressBarLarge}>
                                        <View
                                            style={[
                                                styles.progressFillLarge,
                                                { width: `${getProgress(selectedBadge) * 100}%` }
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.progressTextLarge}>
                                        {getProgressLabel(selectedBadge)}
                                    </Text>
                                </View>
                            )}

                            {selectedBadge.reward && (
                                <View style={styles.rewardSection}>
                                    <Text style={styles.rewardTitle}>🎁 解锁奖励</Text>
                                    <View style={styles.rewardCard}>
                                        <Text style={styles.rewardCardIcon}>
                                            {selectedBadge.reward.icon}
                                        </Text>
                                        <View>
                                            <Text style={styles.rewardCardTitle}>
                                                {selectedBadge.reward.title}
                                            </Text>
                                            <Text style={styles.rewardCardDesc}>
                                                {selectedBadge.reward.description}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            )}

                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setSelectedBadge(null)}
                            >
                                <Text style={styles.closeButtonText}>关闭</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </View>
            </Modal>

            {/* Unlock Animation Modal */}
            <Modal
                visible={showUnlockAnimation}
                transparent
                animationType="fade"
                onRequestClose={() => setShowUnlockAnimation(false)}
            >
                <View style={styles.unlockOverlay}>
                    {newlyUnlockedBadge && (
                        <Animated.View style={[styles.unlockContent, unlockAnimStyle]}>
                            <Animated.View style={[styles.sparkles, sparkleStyle]}>
                                <Text style={styles.sparkle}>✨</Text>
                                <Text style={[styles.sparkle, styles.sparkle2]}>⭐</Text>
                                <Text style={[styles.sparkle, styles.sparkle3]}>💫</Text>
                                <Text style={[styles.sparkle, styles.sparkle4]}>✨</Text>
                            </Animated.View>

                            <Text style={styles.unlockTitle}>🎉 新勋章解锁！</Text>
                            <Text style={styles.unlockBadgeIcon}>
                                {newlyUnlockedBadge.icon}
                            </Text>
                            <Text style={styles.unlockBadgeName}>
                                {newlyUnlockedBadge.name}
                            </Text>

                            {newlyUnlockedBadge.reward && (
                                <View style={styles.unlockReward}>
                                    <Text style={styles.unlockRewardLabel}>🎁 你们获得了</Text>
                                    <Text style={styles.unlockRewardTitle}>
                                        {newlyUnlockedBadge.reward.icon} {newlyUnlockedBadge.reward.title}
                                    </Text>
                                </View>
                            )}

                            <TouchableOpacity
                                style={styles.celebrateButton}
                                onPress={() => {
                                    setShowUnlockAnimation(false);
                                    unlockScale.value = 0;
                                }}
                            >
                                <Text style={styles.celebrateButtonText}>🎊 太棒了！</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </View>
            </Modal>
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
        alignItems: 'flex-start',
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: FontSizes.lg,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    subtitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },
    demoButton: {
        backgroundColor: Colors.primaryGlow,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
    },
    demoButtonText: {
        fontSize: FontSizes.sm,
        color: Colors.primary,
        fontWeight: '600',
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: FontSizes.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
    },
    statLabel: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
    },
    statDivider: {
        width: 1,
        backgroundColor: Colors.surface,
    },
    section: {
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    badgesScroll: {
        gap: Spacing.md,
    },
    badgeCard: {
        width: 90,
        height: 100,
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.sm,
    },
    badgeCardUnlocked: {
        borderWidth: 2,
        borderColor: Colors.success,
        backgroundColor: Colors.success + '10',
    },
    badgeIcon: {
        fontSize: 32,
        marginBottom: Spacing.xs,
    },
    badgeName: {
        fontSize: FontSizes.xs,
        color: Colors.textPrimary,
        textAlign: 'center',
        fontWeight: '600',
    },
    rewardIndicator: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: Colors.surface,
        borderRadius: 10,
        padding: 2,
    },
    rewardIcon: {
        fontSize: 12,
    },
    lockedBadgesGrid: {
        gap: Spacing.sm,
    },
    lockedBadgeCard: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
    },
    lockedBadgeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    lockedBadgeIcon: {
        fontSize: 28,
        marginRight: Spacing.md,
        opacity: 0.5,
    },
    lockedBadgeInfo: {
        flex: 1,
    },
    lockedBadgeName: {
        fontSize: FontSizes.md,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    lockedBadgeDesc: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    progressBar: {
        flex: 1,
        height: 6,
        backgroundColor: Colors.surface,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.primary,
        borderRadius: 3,
    },
    progressText: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        minWidth: 50,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    detailModal: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        width: '100%',
        maxWidth: 320,
        alignItems: 'center',
    },
    detailIcon: {
        fontSize: 64,
        marginBottom: Spacing.md,
    },
    detailName: {
        fontSize: FontSizes.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    detailDescription: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    unlockedStatus: {
        backgroundColor: Colors.success + '20',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        marginBottom: Spacing.md,
    },
    unlockedStatusText: {
        fontSize: FontSizes.sm,
        color: Colors.success,
    },
    progressSection: {
        width: '100%',
        marginBottom: Spacing.lg,
    },
    progressBarLarge: {
        height: 10,
        backgroundColor: Colors.surfaceElevated,
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: Spacing.xs,
    },
    progressFillLarge: {
        height: '100%',
        backgroundColor: Colors.primary,
        borderRadius: 5,
    },
    progressTextLarge: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    rewardSection: {
        width: '100%',
        marginBottom: Spacing.md,
    },
    rewardTitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    rewardCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primaryGlow,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        gap: Spacing.md,
    },
    rewardCardIcon: {
        fontSize: 32,
    },
    rewardCardTitle: {
        fontSize: FontSizes.md,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    rewardCardDesc: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    closeButton: {
        backgroundColor: Colors.surfaceElevated,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        marginTop: Spacing.md,
    },
    closeButtonText: {
        color: Colors.textPrimary,
        fontSize: FontSizes.md,
        fontWeight: '600',
    },
    unlockOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    unlockContent: {
        alignItems: 'center',
    },
    sparkles: {
        position: 'absolute',
        width: 200,
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sparkle: {
        position: 'absolute',
        fontSize: 24,
        top: 0,
    },
    sparkle2: {
        top: 'auto',
        bottom: 0,
        right: 0,
    },
    sparkle3: {
        top: 'auto',
        left: 0,
        bottom: 40,
    },
    sparkle4: {
        right: 0,
        top: 40,
    },
    unlockTitle: {
        fontSize: FontSizes.xl,
        fontWeight: '700',
        color: Colors.success,
        marginBottom: Spacing.lg,
    },
    unlockBadgeIcon: {
        fontSize: 80,
        marginBottom: Spacing.md,
    },
    unlockBadgeName: {
        fontSize: FontSizes.xxl,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.lg,
    },
    unlockReward: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    unlockRewardLabel: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    unlockRewardTitle: {
        fontSize: FontSizes.lg,
        fontWeight: '700',
        color: Colors.primary,
    },
    celebrateButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.xxl,
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.lg,
    },
    celebrateButtonText: {
        color: '#FFF',
        fontSize: FontSizes.lg,
        fontWeight: '700',
    },
});
