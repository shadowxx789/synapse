import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
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
    withTiming,
} from 'react-native-reanimated';

import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';
import {
    useEnergyPredictionStore,
    EnergyLevel,
    DailyPrediction,
    EnergyFactor,
    PersonalizedInsight,
} from '@/stores/energyPredictionStore';

const LEVEL_CONFIG: Record<EnergyLevel, {
    label: string;
    color: string;
    emoji: string;
    bgColor: string;
}> = {
    high: { label: '高能量', color: Colors.success, emoji: '🚀', bgColor: Colors.success + '20' },
    medium: { label: '中等', color: Colors.secondary, emoji: '⚡', bgColor: Colors.secondary + '20' },
    low: { label: '低能量', color: Colors.warning, emoji: '🔋', bgColor: Colors.warning + '20' },
    fog: { label: '脑雾期', color: Colors.error, emoji: '🌫️', bgColor: Colors.error + '20' },
};

const ENERGY_FACTORS: { key: EnergyFactor; label: string; icon: string }[] = [
    { key: 'good_sleep', label: '睡眠好', icon: '😴' },
    { key: 'poor_sleep', label: '睡眠差', icon: '😩' },
    { key: 'exercise', label: '运动', icon: '🏃' },
    { key: 'caffeine', label: '咖啡因', icon: '☕' },
    { key: 'stress', label: '压力', icon: '😰' },
    { key: 'relaxation', label: '放松', icon: '🧘' },
];

interface EnergyPredictorProps {
    onLevelChange?: (level: EnergyLevel) => void;
}

export default function EnergyPredictor({ onLevelChange }: EnergyPredictorProps) {
    const {
        todaysPrediction,
        currentEnergyLevel,
        lastMedicationTime,
        sleepRecords,
        insights,
        focusStreak,
        addMedication,
        logEnergy,
        getCurrentPrediction,
        generateTodaysPrediction,
        getTaskDensityMultiplier,
        logSleep,
        getWeeklyReport,
        getOptimalTaskWindow,
        generatePersonalizedInsights,
    } = useEnergyPredictionStore();

    const [selectedHour, setSelectedHour] = useState<number | null>(null);
    const [showSleepModal, setShowSleepModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showInsightsModal, setShowInsightsModal] = useState(false);
    const [sleepHours, setSleepHours] = useState(7);
    const [sleepQuality, setSleepQuality] = useState<'good' | 'fair' | 'poor'>('fair');
    const [selectedFactors, setSelectedFactors] = useState<EnergyFactor[]>([]);
    const currentHour = new Date().getHours();

    const weeklyReport = getWeeklyReport();
    const optimalWindow = getOptimalTaskWindow();

    // Generate predictions on mount
    useEffect(() => {
        generateTodaysPrediction();
        generatePersonalizedInsights();

    }, []);

    // Pulsing animation for current hour
    const pulseScale = useSharedValue(1);

    useEffect(() => {
        pulseScale.value = withRepeat(
            withTiming(1.1, { duration: 1000 }),
            -1,
            true
        );
    }, []);

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    const handleTakeMedication = () => {
        Alert.alert(
            '💊 记录服药',
            '确认已服用 ADHD 药物？',
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '确认',
                    onPress: () => {
                        addMedication({
                            name: 'ADHD 药物',
                            dosage: '标准剂量',
                            takenAt: new Date(),
                            effectDuration: 8,
                        });
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        Alert.alert('✅ 已记录', '能量预测已更新');
                    },
                },
            ]
        );
    };

    const handleLogEnergy = (level: EnergyLevel) => {
        logEnergy(level);
        onLevelChange?.(level);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const currentPrediction = getCurrentPrediction();
    const densityMultiplier = getTaskDensityMultiplier();

    const getVisibleHours = () => {
        // Show hours from current hour to 10 hours ahead
        const hours = [];
        for (let i = 0; i < 10; i++) {
            const hour = (currentHour + i) % 24;
            const prediction = todaysPrediction.find(p => p.hour === hour);
            if (prediction) {
                hours.push(prediction);
            }
        }
        return hours;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>🧠 能量预测</Text>
                    <Text style={styles.subtitle}>根据服药记录预测精力状态</Text>
                </View>
                <TouchableOpacity
                    style={styles.medButton}
                    onPress={handleTakeMedication}
                >
                    <Text style={styles.medButtonText}>💊 记录服药</Text>
                </TouchableOpacity>
            </View>

            {/* Current Status */}
            {currentPrediction && (
                <Animated.View
                    entering={FadeIn}
                    style={[
                        styles.currentStatus,
                        { backgroundColor: LEVEL_CONFIG[currentPrediction.predictedLevel].bgColor }
                    ]}
                >
                    <Animated.View style={[styles.currentEmoji, pulseStyle]}>
                        <Text style={styles.emojiText}>
                            {LEVEL_CONFIG[currentPrediction.predictedLevel].emoji}
                        </Text>
                    </Animated.View>
                    <View style={styles.currentInfo}>
                        <Text style={[
                            styles.currentLevel,
                            { color: LEVEL_CONFIG[currentPrediction.predictedLevel].color }
                        ]}>
                            当前：{LEVEL_CONFIG[currentPrediction.predictedLevel].label}
                        </Text>
                        <Text style={styles.currentRecommendation}>
                            {currentPrediction.recommendation}
                        </Text>
                    </View>
                    <View style={styles.confidenceBadge}>
                        <Text style={styles.confidenceText}>
                            {Math.round(currentPrediction.confidence * 100)}%
                        </Text>
                    </View>
                </Animated.View>
            )}

            {/* Task Density Indicator */}
            <View style={styles.densitySection}>
                <Text style={styles.densityLabel}>建议任务密度</Text>
                <View style={styles.densityBar}>
                    <View
                        style={[
                            styles.densityFill,
                            {
                                width: `${densityMultiplier * 80}%`,
                                backgroundColor: densityMultiplier >= 1
                                    ? Colors.success
                                    : densityMultiplier >= 0.7
                                        ? Colors.warning
                                        : Colors.error,
                            }
                        ]}
                    />
                </View>
                <Text style={styles.densityValue}>
                    {Math.round(densityMultiplier * 100)}%
                </Text>
            </View>

            {/* Timeline */}
            <Text style={styles.timelineTitle}>📊 今日能量曲线</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.timelineScroll}
            >
                {getVisibleHours().map((prediction, index) => {
                    const isCurrentHour = prediction.hour === currentHour;
                    const config = LEVEL_CONFIG[prediction.predictedLevel];

                    return (
                        <Animated.View
                            key={prediction.hour}
                            entering={FadeInUp.delay(index * 50)}
                        >
                            <TouchableOpacity
                                style={[
                                    styles.hourCard,
                                    isCurrentHour && styles.hourCardCurrent,
                                    selectedHour === prediction.hour && styles.hourCardSelected,
                                ]}
                                onPress={() => setSelectedHour(
                                    selectedHour === prediction.hour ? null : prediction.hour
                                )}
                            >
                                <Text style={[
                                    styles.hourText,
                                    isCurrentHour && styles.hourTextCurrent
                                ]}>
                                    {prediction.hour}:00
                                </Text>
                                <View style={[
                                    styles.levelIndicator,
                                    { backgroundColor: config.color }
                                ]}>
                                    <Text style={styles.levelEmoji}>{config.emoji}</Text>
                                </View>
                                <Text style={[styles.levelLabel, { color: config.color }]}>
                                    {config.label}
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    );
                })}
            </ScrollView>

            {/* Selected hour detail */}
            {selectedHour !== null && (
                <Animated.View
                    entering={FadeIn}
                    style={styles.detailCard}
                >
                    {(() => {
                        const prediction = todaysPrediction.find(p => p.hour === selectedHour);
                        if (!prediction) return null;
                        const config = LEVEL_CONFIG[prediction.predictedLevel];
                        return (
                            <>
                                <Text style={styles.detailTime}>{selectedHour}:00 预测</Text>
                                <Text style={[styles.detailLevel, { color: config.color }]}>
                                    {config.emoji} {config.label}
                                </Text>
                                <Text style={styles.detailRecommendation}>
                                    {prediction.recommendation}
                                </Text>
                            </>
                        );
                    })()}
                </Animated.View>
            )}

            {/* Manual Energy Log */}
            <View style={styles.manualLog}>
                <Text style={styles.manualLogTitle}>📝 手动记录当前状态</Text>
                <View style={styles.energyButtons}>
                    {(['high', 'medium', 'low', 'fog'] as EnergyLevel[]).map((level) => {
                        const config = LEVEL_CONFIG[level];
                        const isActive = currentEnergyLevel === level;
                        return (
                            <TouchableOpacity
                                key={level}
                                style={[
                                    styles.energyButton,
                                    { borderColor: config.color },
                                    isActive && { backgroundColor: config.bgColor },
                                ]}
                                onPress={() => handleLogEnergy(level)}
                            >
                                <Text style={styles.energyButtonEmoji}>{config.emoji}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Medication status */}
            {lastMedicationTime && (
                <View style={styles.medStatus}>
                    <Text style={styles.medStatusText}>
                        💊 上次服药：{new Date(lastMedicationTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </Text>
                </View>
            )}
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
    medButton: {
        backgroundColor: Colors.primaryGlow,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
    },
    medButtonText: {
        fontSize: FontSizes.sm,
        color: Colors.primary,
        fontWeight: '600',
    },
    currentStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    currentEmoji: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    emojiText: {
        fontSize: 24,
    },
    currentInfo: {
        flex: 1,
    },
    currentLevel: {
        fontSize: FontSizes.md,
        fontWeight: '700',
        marginBottom: Spacing.xs,
    },
    currentRecommendation: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    confidenceBadge: {
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.sm,
    },
    confidenceText: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
    },
    densitySection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.lg,
        gap: Spacing.sm,
    },
    densityLabel: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        width: 90,
    },
    densityBar: {
        flex: 1,
        height: 8,
        backgroundColor: Colors.surfaceElevated,
        borderRadius: 4,
        overflow: 'hidden',
    },
    densityFill: {
        height: '100%',
        borderRadius: 4,
    },
    densityValue: {
        fontSize: FontSizes.sm,
        color: Colors.textPrimary,
        fontWeight: '600',
        width: 40,
        textAlign: 'right',
    },
    timelineTitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    timelineScroll: {
        gap: Spacing.sm,
        paddingBottom: Spacing.sm,
    },
    hourCard: {
        width: 70,
        alignItems: 'center',
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        padding: Spacing.sm,
    },
    hourCardCurrent: {
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    hourCardSelected: {
        backgroundColor: Colors.primaryGlow,
    },
    hourText: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        marginBottom: Spacing.xs,
    },
    hourTextCurrent: {
        color: Colors.primary,
        fontWeight: '600',
    },
    levelIndicator: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    levelEmoji: {
        fontSize: 18,
    },
    levelLabel: {
        fontSize: FontSizes.xs,
        fontWeight: '500',
    },
    detailCard: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginTop: Spacing.sm,
        marginBottom: Spacing.md,
    },
    detailTime: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        marginBottom: Spacing.xs,
    },
    detailLevel: {
        fontSize: FontSizes.lg,
        fontWeight: '700',
        marginBottom: Spacing.xs,
    },
    detailRecommendation: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    manualLog: {
        marginTop: Spacing.md,
    },
    manualLogTitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    energyButtons: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    energyButton: {
        flex: 1,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        borderRadius: BorderRadius.md,
        borderWidth: 2,
        backgroundColor: Colors.surfaceElevated,
    },
    energyButtonEmoji: {
        fontSize: 24,
    },
    medStatus: {
        marginTop: Spacing.md,
        alignItems: 'center',
    },
    medStatusText: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
    },
});
