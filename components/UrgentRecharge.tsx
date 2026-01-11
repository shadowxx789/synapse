import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeIn,
    SlideInUp,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';
import { useEnergyStore } from '@/stores/energyStore';

interface UrgentRechargeProps {
    isVisible: boolean;
    onClose: () => void;
    onAccept: () => void;
    supporterName?: string;
    reward?: {
        title: string;
        icon: string;
    };
}

export default function UrgentRecharge({
    isVisible,
    onClose,
    onAccept,
    supporterName = '支持者',
    reward = { title: '一次按摩', icon: '💆' },
}: UrgentRechargeProps) {
    const { totalPoints } = useEnergyStore();
    const [accepted, setAccepted] = useState(false);

    // Pulsing animation for urgency
    const scale = useSharedValue(1);

    React.useEffect(() => {
        if (isVisible) {
            scale.value = withRepeat(
                withSequence(
                    withTiming(1.05, { duration: 500 }),
                    withTiming(1, { duration: 500 })
                ),
                -1,
                true
            );
        }
    }, [isVisible]);

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handleAccept = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setAccepted(true);
        onAccept();

        setTimeout(() => {
            setAccepted(false);
            onClose();
        }, 2000);
    };

    if (!isVisible) return null;

    return (
        <Modal
            visible={isVisible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Animated.View
                    entering={SlideInUp.springify()}
                    style={styles.container}
                >
                    {accepted ? (
                        <Animated.View
                            entering={FadeIn}
                            style={styles.successContent}
                        >
                            <Text style={styles.successIcon}>✨</Text>
                            <Text style={styles.successTitle}>太棒了！</Text>
                            <Text style={styles.successSubtitle}>
                                你是最好的伴侣 💕
                            </Text>
                        </Animated.View>
                    ) : (
                        <>
                            {/* Urgent header */}
                            <Animated.View style={[styles.urgentBadge, pulseStyle]}>
                                <Text style={styles.urgentText}>⚡ 紧急充能任务</Text>
                            </Animated.View>

                            <Text style={styles.title}>
                                {supporterName} 需要你的支持！
                            </Text>

                            <Text style={styles.description}>
                                {supporterName}一直在默默支持你，现在 TA 的能量已经满额了。
                                是时候给 TA 一些回馈了！
                            </Text>

                            {/* Points display */}
                            <View style={styles.pointsCard}>
                                <Text style={styles.pointsLabel}>TA 积累的能量点</Text>
                                <Text style={styles.pointsValue}>⚡ {totalPoints} 点</Text>
                            </View>

                            {/* Suggested reward */}
                            <View style={styles.rewardSuggestion}>
                                <Text style={styles.suggestionLabel}>建议完成</Text>
                                <View style={styles.rewardCard}>
                                    <Text style={styles.rewardIcon}>{reward.icon}</Text>
                                    <Text style={styles.rewardTitle}>{reward.title}</Text>
                                </View>
                            </View>

                            {/* Actions */}
                            <TouchableOpacity
                                style={styles.acceptButton}
                                onPress={handleAccept}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={[Colors.primary, '#FF8C61']}
                                    style={styles.acceptGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Text style={styles.acceptButtonText}>
                                        💪 我现在就去做！
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.laterButton}
                                onPress={onClose}
                            >
                                <Text style={styles.laterButtonText}>稍后提醒我</Text>
                            </TouchableOpacity>

                            <Text style={styles.note}>
                                💡 及时回应可以增进你们的亲密关系
                            </Text>
                        </>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    container: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        width: '100%',
        maxWidth: 360,
        alignItems: 'center',
    },
    urgentBadge: {
        backgroundColor: Colors.executor.glow,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        marginBottom: Spacing.lg,
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    urgentText: {
        color: Colors.primary,
        fontSize: FontSizes.md,
        fontWeight: '700',
    },
    title: {
        fontSize: FontSizes.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    description: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: FontSizes.sm * 1.5,
        marginBottom: Spacing.lg,
    },
    pointsCard: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        alignItems: 'center',
        width: '100%',
        marginBottom: Spacing.md,
    },
    pointsLabel: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        marginBottom: Spacing.xs,
    },
    pointsValue: {
        fontSize: FontSizes.xxl,
        fontWeight: '700',
        color: Colors.energyGlow,
    },
    rewardSuggestion: {
        width: '100%',
        marginBottom: Spacing.lg,
    },
    suggestionLabel: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    rewardCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 2,
        borderColor: Colors.supporter.primary,
    },
    rewardIcon: {
        fontSize: 32,
        marginRight: Spacing.md,
    },
    rewardTitle: {
        fontSize: FontSizes.lg,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    acceptButton: {
        width: '100%',
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        marginBottom: Spacing.md,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    acceptGradient: {
        paddingVertical: Spacing.lg,
        alignItems: 'center',
    },
    acceptButtonText: {
        color: '#FFF',
        fontSize: FontSizes.lg,
        fontWeight: '700',
    },
    laterButton: {
        paddingVertical: Spacing.md,
    },
    laterButtonText: {
        color: Colors.textMuted,
        fontSize: FontSizes.md,
    },
    note: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        textAlign: 'center',
        marginTop: Spacing.md,
    },
    successContent: {
        alignItems: 'center',
        padding: Spacing.xl,
    },
    successIcon: {
        fontSize: 80,
        marginBottom: Spacing.lg,
    },
    successTitle: {
        fontSize: FontSizes.xxl,
        fontWeight: '700',
        color: Colors.success,
        marginBottom: Spacing.sm,
    },
    successSubtitle: {
        fontSize: FontSizes.lg,
        color: Colors.textSecondary,
    },
});
