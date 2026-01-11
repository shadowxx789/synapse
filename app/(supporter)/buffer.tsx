import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    StatusBar,
    TouchableOpacity,
} from 'react-native';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/Colors';
import ChatBuffer from '@/components/ChatBuffer';
import EnergyPredictor from '@/components/EnergyPredictor';
import TeamBadges from '@/components/TeamBadges';
import { useChatStore } from '@/stores/chatStore';
import { useEnergyPredictionStore } from '@/stores/energyPredictionStore';
import { useBadgeStore } from '@/stores/badgeStore';

type ActiveTab = 'chat' | 'energy' | 'badges';

export default function SmartBufferScreen() {
    const [activeTab, setActiveTab] = useState<ActiveTab>('chat');

    const { peacefulDays, communicationStats, getWeeklyInsight } = useChatStore();
    const { focusStreak, getWeeklyReport } = useEnergyPredictionStore();
    const { getUnredeemedBadges, getNextMilestone } = useBadgeStore();

    const unredeemedBadges = getUnredeemedBadges();
    const nextMilestone = getNextMilestone();
    const weeklyInsight = getWeeklyInsight();
    const energyReport = getWeeklyReport();

    const handleTabChange = (tab: ActiveTab) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveTab(tab);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <Animated.View
                entering={FadeInUp}
                style={styles.header}
            >
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.title}>智慧减震</Text>
                        <Text style={styles.subtitle}>
                            AI 帮你减少沟通摩擦
                        </Text>
                    </View>
                    <View style={styles.streakBadge}>
                        <Text style={styles.streakEmoji}>🕊️</Text>
                        <Text style={styles.streakText}>{peacefulDays}天</Text>
                    </View>
                </View>

                {/* Quick Stats Row */}
                <Animated.View
                    entering={FadeIn.delay(200)}
                    style={styles.statsRow}
                >
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{communicationStats.totalMessages}</Text>
                        <Text style={styles.statLabel}>消息</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{communicationStats.usedSuggestionCount}</Text>
                        <Text style={styles.statLabel}>优化表达</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{focusStreak}</Text>
                        <Text style={styles.statLabel}>专注天数</Text>
                    </View>
                </Animated.View>

                {/* Weekly Insight Banner */}
                {weeklyInsight.trend !== '稳定' && (
                    <Animated.View
                        entering={FadeIn.delay(300)}
                        style={[
                            styles.insightBanner,
                            weeklyInsight.trend === '非常好' && styles.insightBannerSuccess,
                            weeklyInsight.trend === '需要关注' && styles.insightBannerWarning,
                        ]}
                    >
                        <Text style={styles.insightText}>
                            📊 {weeklyInsight.suggestion}
                        </Text>
                    </Animated.View>
                )}

                {/* Unredeemed Badges Alert */}
                {unredeemedBadges.length > 0 && (
                    <TouchableOpacity
                        style={styles.badgeAlert}
                        onPress={() => handleTabChange('badges')}
                    >
                        <Text style={styles.badgeAlertText}>
                            🎁 你有 {unredeemedBadges.length} 个奖励待兑换！
                        </Text>
                    </TouchableOpacity>
                )}
            </Animated.View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'chat' && styles.tabActive]}
                    onPress={() => handleTabChange('chat')}
                >
                    <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>
                        💬 安全沟通
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'energy' && styles.tabActive]}
                    onPress={() => handleTabChange('energy')}
                >
                    <Text style={[styles.tabText, activeTab === 'energy' && styles.tabTextActive]}>
                        🧠 能量预测
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'badges' && styles.tabActive]}
                    onPress={() => handleTabChange('badges')}
                >
                    <Text style={[styles.tabText, activeTab === 'badges' && styles.tabTextActive]}>
                        🏆 团队勋章
                    </Text>
                    {unredeemedBadges.length > 0 && (
                        <View style={styles.badgeIndicator}>
                            <Text style={styles.badgeIndicatorText}>{unredeemedBadges.length}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Tab Content */}
            {activeTab === 'chat' && (
                <View style={styles.chatContainer}>
                    <ChatBuffer />
                </View>
            )}

            {activeTab === 'energy' && (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                >
                    <EnergyPredictor />

                    {/* Energy Weekly Summary Card */}
                    <Animated.View
                        entering={FadeInUp.delay(100)}
                        style={styles.summaryCard}
                    >
                        <Text style={styles.summaryTitle}>📈 本周能量报告</Text>
                        <View style={styles.summaryStats}>
                            <View style={styles.summaryStatItem}>
                                <Text style={styles.summaryValue}>
                                    {Math.round(energyReport.avgEnergy)}%
                                </Text>
                                <Text style={styles.summaryLabel}>平均能量</Text>
                            </View>
                            <View style={styles.summaryStatItem}>
                                <Text style={[
                                    styles.summaryTrend,
                                    energyReport.trend === 'improving' && { color: Colors.success },
                                    energyReport.trend === 'declining' && { color: Colors.warning },
                                ]}>
                                    {energyReport.trend === 'improving' ? '📈 上升' :
                                        energyReport.trend === 'declining' ? '📉 下降' : '➡️ 稳定'}
                                </Text>
                                <Text style={styles.summaryLabel}>趋势</Text>
                            </View>
                        </View>
                        {energyReport.insights.map((insight, index) => (
                            <Text key={index} style={styles.insightItem}>• {insight}</Text>
                        ))}
                    </Animated.View>
                </ScrollView>
            )}

            {activeTab === 'badges' && (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                >
                    <TeamBadges />

                    {/* Next Milestone Card */}
                    {nextMilestone && (
                        <Animated.View
                            entering={FadeInUp.delay(100)}
                            style={styles.milestoneCard}
                        >
                            <Text style={styles.milestoneIcon}>{nextMilestone.icon}</Text>
                            <View style={styles.milestoneInfo}>
                                <Text style={styles.milestoneTitle}>{nextMilestone.title}</Text>
                                <Text style={styles.milestoneDesc}>{nextMilestone.description}</Text>
                                <View style={styles.milestoneProgress}>
                                    <View style={[
                                        styles.milestoneProgressFill,
                                        { width: `${(nextMilestone.current / nextMilestone.target) * 100}%` }
                                    ]} />
                                </View>
                                <Text style={styles.milestoneProgressText}>
                                    {nextMilestone.current} / {nextMilestone.target}
                                </Text>
                            </View>
                        </Animated.View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        padding: Spacing.lg,
        paddingBottom: Spacing.sm,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
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
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.success + '20',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        gap: Spacing.xs,
    },
    streakEmoji: {
        fontSize: 16,
    },
    streakText: {
        fontSize: FontSizes.sm,
        color: Colors.success,
        fontWeight: '600',
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginTop: Spacing.md,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: FontSizes.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    statLabel: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        marginTop: Spacing.xs,
    },
    statDivider: {
        width: 1,
        backgroundColor: Colors.surfaceElevated,
    },
    insightBanner: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginTop: Spacing.md,
        borderLeftWidth: 3,
        borderLeftColor: Colors.secondary,
    },
    insightBannerSuccess: {
        borderLeftColor: Colors.success,
        backgroundColor: Colors.success + '10',
    },
    insightBannerWarning: {
        borderLeftColor: Colors.warning,
        backgroundColor: Colors.warning + '10',
    },
    insightText: {
        fontSize: FontSizes.sm,
        color: Colors.textPrimary,
    },
    badgeAlert: {
        backgroundColor: Colors.energyGlow + '20',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginTop: Spacing.md,
    },
    badgeAlertText: {
        fontSize: FontSizes.sm,
        color: Colors.energyGlow,
        textAlign: 'center',
        fontWeight: '600',
    },
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: Spacing.lg,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xs,
        marginBottom: Spacing.md,
    },
    tab: {
        flex: 1,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
        borderRadius: BorderRadius.md,
        position: 'relative',
    },
    tabActive: {
        backgroundColor: Colors.surfaceElevated,
    },
    tabText: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
    },
    tabTextActive: {
        color: Colors.textPrimary,
        fontWeight: '600',
    },
    badgeIndicator: {
        position: 'absolute',
        top: 4,
        right: 8,
        backgroundColor: Colors.error,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeIndicatorText: {
        fontSize: FontSizes.xs,
        color: '#FFF',
        fontWeight: '700',
    },
    chatContainer: {
        flex: 1,
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },
    summaryCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginTop: Spacing.lg,
    },
    summaryTitle: {
        fontSize: FontSizes.md,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
    },
    summaryStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: Spacing.md,
    },
    summaryStatItem: {
        alignItems: 'center',
    },
    summaryValue: {
        fontSize: FontSizes.xl,
        fontWeight: '700',
        color: Colors.primary,
    },
    summaryLabel: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        marginTop: Spacing.xs,
    },
    summaryTrend: {
        fontSize: FontSizes.md,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    insightItem: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },
    milestoneCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginTop: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
    },
    milestoneIcon: {
        fontSize: 40,
        marginRight: Spacing.md,
    },
    milestoneInfo: {
        flex: 1,
    },
    milestoneTitle: {
        fontSize: FontSizes.md,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    milestoneDesc: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        marginBottom: Spacing.sm,
    },
    milestoneProgress: {
        height: 8,
        backgroundColor: Colors.surfaceElevated,
        borderRadius: 4,
        overflow: 'hidden',
    },
    milestoneProgressFill: {
        height: '100%',
        backgroundColor: Colors.primary,
        borderRadius: 4,
    },
    milestoneProgressText: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },
});
