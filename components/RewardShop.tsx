import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Modal,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';
import { useRewardStore, Reward } from '@/stores/rewardStore';
import { useEnergyStore } from '@/stores/energyStore';

interface RewardShopProps {
    onRewardRedeemed?: (reward: Reward) => void;
}

export default function RewardShop({ onRewardRedeemed }: RewardShopProps) {
    const { rewards, addReward, redeemReward, getAvailableRewards } = useRewardStore();
    const { totalPoints } = useEnergyStore();
    const [showAddModal, setShowAddModal] = useState(false);
    const [newReward, setNewReward] = useState({
        title: '',
        description: '',
        pointsCost: 50,
        icon: '🎁',
    });

    const availableRewards = getAvailableRewards();

    const handleRedeem = (reward: Reward) => {
        if (totalPoints >= reward.pointsCost) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            redeemReward(reward.id);
            onRewardRedeemed?.(reward);
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    const handleAddReward = () => {
        if (newReward.title.trim()) {
            addReward({
                ...newReward,
                createdBy: 'supporter',
            });
            setNewReward({ title: '', description: '', pointsCost: 50, icon: '🎁' });
            setShowAddModal(false);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    };

    const iconOptions = ['🎮', '🍜', '💆', '😴', '🎬', '🎁', '☕', '🍰', '🌸', '💝'];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>💝 惊喜商店</Text>
                    <Text style={styles.subtitle}>为你的伴侣准备一些温暖</Text>
                </View>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowAddModal(true)}
                >
                    <Text style={styles.addButtonText}>✨</Text>
                </TouchableOpacity>
            </View>

            {/* Energy balance as a gift card */}
            <LinearGradient
                colors={['rgba(255, 215, 0, 0.12)', 'rgba(78, 205, 196, 0.12)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.balanceCard}
            >
                <Text style={styles.balanceLabel}>当前可用</Text>
                <View style={styles.balanceRow}>
                    <Text style={styles.balanceValue}>{totalPoints}</Text>
                    <Text style={styles.balanceUnit}>点能量</Text>
                </View>
                <Text style={styles.balanceHint}>
                    {totalPoints >= 100 ? '🎉 可以兑换惊喜啦！' : `还差 ${100 - totalPoints} 点哦`}
                </Text>
            </LinearGradient>

            {/* Gift cards */}
            <Text style={styles.sectionTitle}>兑换惊喜</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.rewardsScroll}
            >
                {availableRewards.map((reward, index) => {
                    const canAfford = totalPoints >= reward.pointsCost;
                    return (
                        <Animated.View
                            key={reward.id}
                            entering={FadeInUp.delay(index * 100)}
                        >
                            <TouchableOpacity
                                onPress={() => handleRedeem(reward)}
                                disabled={!canAfford}
                                activeOpacity={0.8}
                            >
                                {canAfford ? (
                                    <LinearGradient
                                        colors={['rgba(78, 205, 196, 0.16)', 'rgba(126, 221, 214, 0.2)']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={[styles.rewardCard, styles.rewardCardAffordable]}
                                    >
                                        {/* Gift ribbon effect */}
                                        <View style={styles.giftRibbon} />

                                        <View style={styles.rewardIconContainer}>
                                            <Text style={styles.rewardIcon}>{reward.icon}</Text>
                                        </View>

                                        <Text style={styles.rewardTitle}>{reward.title}</Text>
                                        <Text style={styles.rewardDesc} numberOfLines={2}>
                                            {reward.description}
                                        </Text>

                                        <View style={[
                                            styles.rewardCost,
                                            styles.rewardCostAffordable
                                        ]}>
                                            <Text style={[
                                                styles.rewardCostText,
                                                styles.rewardCostTextAffordable
                                            ]}>
                                                兑换 {reward.pointsCost}⚡
                                            </Text>
                                        </View>
                                    </LinearGradient>
                                ) : (
                                    <View style={[styles.rewardCard, styles.rewardCardDefault, styles.rewardCardDisabled]}>
                                        {/* Gift ribbon effect */}
                                        <View style={styles.giftRibbon} />

                                        <View style={styles.rewardIconContainer}>
                                            <Text style={styles.rewardIcon}>{reward.icon}</Text>
                                        </View>

                                        <Text style={styles.rewardTitle}>{reward.title}</Text>
                                        <Text style={styles.rewardDesc} numberOfLines={2}>
                                            {reward.description}
                                        </Text>

                                        <View style={styles.rewardCost}>
                                            <Text style={styles.rewardCostText}>
                                                {reward.pointsCost}⚡
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </Animated.View>
                    );
                })}
            </ScrollView>

            {/* Add Reward Modal */}
            <Modal
                visible={showAddModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowAddModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <Animated.View
                        entering={FadeIn}
                        style={styles.modalContent}
                    >
                        <Text style={styles.modalTitle}>添加新奖励</Text>

                        {/* Icon selector */}
                        <Text style={styles.inputLabel}>选择图标</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.iconSelector}
                        >
                            {iconOptions.map((icon) => (
                                <TouchableOpacity
                                    key={icon}
                                    style={[
                                        styles.iconOption,
                                        newReward.icon === icon && styles.iconOptionSelected
                                    ]}
                                    onPress={() => setNewReward({ ...newReward, icon })}
                                >
                                    <Text style={styles.iconText}>{icon}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.inputLabel}>奖励名称</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="例如：30分钟游戏时间"
                            placeholderTextColor={Colors.textMuted}
                            value={newReward.title}
                            onChangeText={(title) => setNewReward({ ...newReward, title })}
                        />

                        <Text style={styles.inputLabel}>描述</Text>
                        <TextInput
                            style={[styles.input, styles.inputMultiline]}
                            placeholder="可选：奖励的详细说明"
                            placeholderTextColor={Colors.textMuted}
                            value={newReward.description}
                            onChangeText={(description) => setNewReward({ ...newReward, description })}
                            multiline
                        />

                        <Text style={styles.inputLabel}>所需能量点</Text>
                        <View style={styles.pointsSelector}>
                            {[20, 50, 80, 100].map((points) => (
                                <TouchableOpacity
                                    key={points}
                                    style={[
                                        styles.pointsOption,
                                        newReward.pointsCost === points && styles.pointsOptionSelected
                                    ]}
                                    onPress={() => setNewReward({ ...newReward, pointsCost: points })}
                                >
                                    <Text style={[
                                        styles.pointsOptionText,
                                        newReward.pointsCost === points && styles.pointsOptionTextSelected
                                    ]}>
                                        {points}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowAddModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>取消</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.confirmButton}
                                onPress={handleAddReward}
                            >
                                <LinearGradient
                                    colors={[Colors.supporter.primary, Colors.supporter.accent]}
                                    style={styles.confirmGradient}
                                >
                                    <Text style={styles.confirmButtonText}>添加奖励</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xxl,
        padding: Spacing.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    title: {
        fontSize: FontSizes.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    subtitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.supporter.glow,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButtonText: {
        fontSize: FontSizes.xl,
    },
    balanceCard: {
        borderRadius: BorderRadius.xxl,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.3)',
    },
    balanceLabel: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: Spacing.xs,
    },
    balanceValue: {
        fontSize: FontSizes.xxl,
        fontWeight: '800',
        color: Colors.energyGlow,
    },
    balanceUnit: {
        fontSize: FontSizes.md,
        color: Colors.energyGlow,
        marginLeft: Spacing.xs,
    },
    balanceHint: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: FontSizes.md,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
    },
    rewardsScroll: {
        gap: Spacing.md,
        paddingRight: Spacing.md,
    },
    rewardCard: {
        width: 150,
        borderRadius: BorderRadius.xxl,
        padding: Spacing.md,
        alignItems: 'center',
        position: 'relative',
    },
    rewardCardDefault: {
        backgroundColor: Colors.surfaceElevated,
    },
    rewardCardAffordable: {
        borderWidth: 2,
        borderColor: Colors.supporter.primary,
    },
    rewardCardDisabled: {
        opacity: 0.4,
    },
    giftRibbon: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.energyGlow,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            web: { boxShadow: '0px 2px 4px rgba(255, 215, 0, 0.3)' },
            default: {
                shadowColor: 'rgba(255, 215, 0, 0.3)',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 4,
            },
        }),
    },
    rewardIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    rewardIcon: {
        fontSize: 40,
    },
    rewardTitle: {
        fontSize: FontSizes.md,
        fontWeight: '600',
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: Spacing.xs,
    },
    rewardDesc: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        textAlign: 'center',
        marginBottom: Spacing.sm,
        minHeight: 30,
    },
    rewardCost: {
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
    },
    rewardCostAffordable: {
        backgroundColor: Colors.supporter.primary,
    },
    rewardCostText: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        fontWeight: '600',
    },
    rewardCostTextAffordable: {
        color: '#FFF',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    modalContent: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xxl,
        padding: Spacing.lg,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: FontSizes.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    inputLabel: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
        marginTop: Spacing.sm,
    },
    iconSelector: {
        flexDirection: 'row',
        marginBottom: Spacing.sm,
    },
    iconOption: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
    },
    iconOptionSelected: {
        backgroundColor: Colors.supporter.glow,
        borderWidth: 2,
        borderColor: Colors.supporter.primary,
    },
    iconText: {
        fontSize: 24,
    },
    input: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        color: Colors.textPrimary,
        fontSize: FontSizes.md,
    },
    inputMultiline: {
        minHeight: 60,
        textAlignVertical: 'top',
    },
    pointsSelector: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    pointsOption: {
        flex: 1,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
    },
    pointsOptionSelected: {
        backgroundColor: Colors.supporter.primary,
    },
    pointsOptionText: {
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    pointsOptionTextSelected: {
        color: '#FFF',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.xl,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.surfaceElevated,
    },
    cancelButtonText: {
        color: Colors.textMuted,
        fontSize: FontSizes.md,
        fontWeight: '600',
    },
    confirmButton: {
        flex: 2,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    confirmGradient: {
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#FFF',
        fontSize: FontSizes.md,
        fontWeight: '700',
    },
});
