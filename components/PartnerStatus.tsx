/**
 * PartnerStatus Component - Displays partner's connection status
 *
 * Shows:
 * - Partner's name and avatar
 * - Online/offline status
 * - Last active time
 * - Quick action buttons
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';
import { useUserStore } from '@/stores/userStore';
import { useMessageStore } from '@/stores/messageStore';

// ============================================================================
// Types
// ============================================================================

export interface PartnerStatusProps {
    partnerName?: string;
    partnerRole?: 'executor' | 'supporter';
    isOnline?: boolean;
    lastActiveAt?: Date;
    onPress?: () => void;
    onSendMessage?: () => void;
    onSendEnergy?: () => void;
    compact?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;

    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

const getRoleEmoji = (role: 'executor' | 'supporter' | undefined): string => {
    return role === 'executor' ? '🏎️' : '🧭';
};

const getRoleLabel = (role: 'executor' | 'supporter' | undefined): string => {
    return role === 'executor' ? '执行者' : '支持者';
};

// ============================================================================
// Component
// ============================================================================

export default function PartnerStatus({
    partnerName,
    partnerRole,
    isOnline = false,
    lastActiveAt,
    onPress,
    onSendMessage,
    onSendEnergy,
    compact = false,
}: PartnerStatusProps) {
    const { user } = useUserStore();
    const { unreadCount } = useMessageStore();

    const handlePress = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.();
    };

    const handleSendMessage = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onSendMessage?.();
    };

    const handleSendEnergy = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        onSendEnergy?.();
    };

    // Not paired state
    if (!user?.partnerId) {
        return (
            <Animated.View entering={FadeIn} style={styles.notPairedContainer}>
                <View style={styles.notPairedContent}>
                    <Text style={styles.notPairedEmoji}>🔗</Text>
                    <View style={styles.notPairedTextContainer}>
                        <Text style={styles.notPairedTitle}>还没有配对</Text>
                        <Text style={styles.notPairedSubtitle}>
                            在设置中连接你的伴侣
                        </Text>
                    </View>
                </View>
            </Animated.View>
        );
    }

    // Compact version (for headers, etc.)
    if (compact) {
        return (
            <TouchableOpacity
                style={styles.compactContainer}
                onPress={handlePress}
                activeOpacity={0.7}
            >
                <View style={styles.compactAvatar}>
                    <Text style={styles.compactAvatarText}>
                        {getRoleEmoji(partnerRole)}
                    </Text>
                    <View
                        style={[
                            styles.statusDot,
                            isOnline ? styles.statusOnline : styles.statusOffline,
                        ]}
                    />
                </View>
                <Text style={styles.compactName} numberOfLines={1}>
                    {partnerName || '伴侣'}
                </Text>
                {unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    }

    // Full version
    return (
        <Animated.View entering={FadeInDown} style={styles.container}>
            <TouchableOpacity
                style={styles.mainContent}
                onPress={handlePress}
                activeOpacity={0.8}
            >
                {/* Avatar */}
                <View
                    style={[
                        styles.avatar,
                        partnerRole === 'executor'
                            ? styles.avatarExecutor
                            : styles.avatarSupporter,
                    ]}
                >
                    <Text style={styles.avatarText}>
                        {getRoleEmoji(partnerRole)}
                    </Text>
                    <View
                        style={[
                            styles.statusIndicator,
                            isOnline ? styles.statusOnline : styles.statusOffline,
                        ]}
                    />
                </View>

                {/* Info */}
                <View style={styles.infoContainer}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{partnerName || '伴侣'}</Text>
                        <Text
                            style={[
                                styles.roleLabel,
                                partnerRole === 'executor'
                                    ? styles.roleLabelExecutor
                                    : styles.roleLabelSupporter,
                            ]}
                        >
                            {getRoleLabel(partnerRole)}
                        </Text>
                    </View>
                    <Text style={styles.statusText}>
                        {isOnline ? (
                            <Text style={styles.onlineText}>在线</Text>
                        ) : lastActiveAt ? (
                            `${getRelativeTime(lastActiveAt)}活跃`
                        ) : (
                            '离线'
                        )}
                    </Text>
                </View>

                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <View style={styles.unreadBadgeLarge}>
                        <Text style={styles.unreadBadgeTextLarge}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* Quick Actions */}
            <View style={styles.actionsContainer}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleSendMessage}
                    activeOpacity={0.7}
                >
                    <Text style={styles.actionIcon}>💬</Text>
                    <Text style={styles.actionLabel}>消息</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonPrimary]}
                    onPress={handleSendEnergy}
                    activeOpacity={0.7}
                >
                    <Text style={styles.actionIcon}>⚡</Text>
                    <Text style={styles.actionLabelPrimary}>能量</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
    // Not paired state
    notPairedContainer: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.surfaceElevated,
        borderStyle: 'dashed',
    },
    notPairedContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    notPairedEmoji: {
        fontSize: 32,
        marginRight: Spacing.md,
    },
    notPairedTextContainer: {
        flex: 1,
    },
    notPairedTitle: {
        fontSize: FontSizes.md,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    notPairedSubtitle: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        marginTop: Spacing.xs,
    },

    // Compact version
    compactContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.full,
    },
    compactAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
    },
    compactAvatarText: {
        fontSize: 16,
    },
    compactName: {
        fontSize: FontSizes.sm,
        fontWeight: '500',
        color: Colors.textPrimary,
        maxWidth: 80,
    },

    // Full version
    container: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
    },
    mainContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    avatarExecutor: {
        backgroundColor: Colors.executor.glow,
    },
    avatarSupporter: {
        backgroundColor: Colors.supporter.glow,
    },
    avatarText: {
        fontSize: 28,
    },
    statusIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: Colors.surface,
    },
    statusDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: Colors.surface,
    },
    statusOnline: {
        backgroundColor: Colors.success,
    },
    statusOffline: {
        backgroundColor: Colors.textMuted,
    },
    infoContainer: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    name: {
        fontSize: FontSizes.lg,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    roleLabel: {
        fontSize: FontSizes.xs,
        fontWeight: '500',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
    },
    roleLabelExecutor: {
        backgroundColor: Colors.executor.glow,
        color: Colors.executor.primary,
    },
    roleLabelSupporter: {
        backgroundColor: Colors.supporter.glow,
        color: Colors.supporter.primary,
    },
    statusText: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        marginTop: Spacing.xs,
    },
    onlineText: {
        color: Colors.success,
    },

    // Unread badges
    unreadBadge: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.full,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        marginLeft: Spacing.sm,
    },
    unreadBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFF',
    },
    unreadBadgeLarge: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.full,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadBadgeTextLarge: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFF',
    },

    // Actions
    actionsContainer: {
        flexDirection: 'row',
        marginTop: Spacing.lg,
        gap: Spacing.md,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        gap: Spacing.sm,
    },
    actionButtonPrimary: {
        backgroundColor: Colors.primaryGlow,
    },
    actionIcon: {
        fontSize: 18,
    },
    actionLabel: {
        fontSize: FontSizes.sm,
        fontWeight: '500',
        color: Colors.textSecondary,
    },
    actionLabelPrimary: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.primary,
    },
});
