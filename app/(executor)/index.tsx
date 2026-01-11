import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInUp, SlideInDown } from 'react-native-reanimated';

import TaskCard from '@/components/TaskCard';
import VisualTimer from '@/components/VisualTimer';
import DopaminePop from '@/components/DopaminePop';
import UrgentRecharge from '@/components/UrgentRecharge';
import { useTaskStore } from '@/stores/taskStore';
import { useEnergyStore } from '@/stores/energyStore';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';

// Demo task for testing
const DEMO_TASK = {
    id: '1',
    title: '整理书桌',
    creatorId: 'supporter-1',
    executorId: 'executor-1',
    visualTimerMinutes: 2,
    status: 'doing' as const,
    createdAt: new Date(),
    subtasks: [
        { id: 's1', title: '把书桌上的杂物放到一边', estimatedMinutes: 1, order: 1 },
        { id: 's2', title: '用湿布擦拭桌面', estimatedMinutes: 1, order: 2 },
        { id: 's3', title: '整理文具放回笔筒', estimatedMinutes: 1, order: 3 },
        { id: 's4', title: '把书按大小排列整齐', estimatedMinutes: 2, order: 4 },
    ].map((s, i) => ({
        ...s,
        id: `subtask-${i}`,
        parentTaskId: '1',
        creatorId: 'supporter-1',
        executorId: 'executor-1',
        visualTimerMinutes: s.estimatedMinutes,
        status: 'pending' as const,
        createdAt: new Date(),
    })),
};

export default function ExecutorHomeScreen() {
    const router = useRouter();
    const {
        currentTask,
        currentSubtaskIndex,
        setCurrentTask,
        completeCurrentSubtask,
        nextSubtask,
    } = useTaskStore();
    const { totalPoints } = useEnergyStore();

    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const [showCelebration, setShowCelebration] = useState(false);
    const [allComplete, setAllComplete] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [showUrgentRecharge, setShowUrgentRecharge] = useState(false);
    const [completedCount, setCompletedCount] = useState(0);
    const [totalTimeSpent, setTotalTimeSpent] = useState(0);

    // Load demo task on mount
    useFocusEffect(
        useCallback(() => {
            setCurrentTask(DEMO_TASK);
            setAllComplete(false);
            setCompletedCount(0);
            return () => { };
        }, [])
    );

    // Check if supporter needs recharge
    useEffect(() => {
        if (totalPoints >= 100 && !showUrgentRecharge && !allComplete) {
            // Show urgent recharge after a delay
            const timer = setTimeout(() => {
                setShowUrgentRecharge(true);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [totalPoints, allComplete]);

    // Get current subtask
    const subtasks = currentTask?.subtasks || [];
    const currentSubtask = subtasks[currentSubtaskIndex];

    // Initialize timer when subtask changes
    useEffect(() => {
        if (currentSubtask) {
            setRemainingSeconds(currentSubtask.visualTimerMinutes * 60);
            setIsPaused(false);
        }
    }, [currentSubtask?.id]);

    // Timer countdown
    useEffect(() => {
        if (remainingSeconds <= 0 || !currentSubtask || isPaused) return;

        const interval = setInterval(() => {
            setRemainingSeconds((prev) => {
                const newVal = Math.max(0, prev - 1);
                if (newVal < prev) {
                    setTotalTimeSpent((t) => t + 1);
                }
                return newVal;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [remainingSeconds, currentSubtask, isPaused]);

    const handleComplete = () => {
        setShowCelebration(true);
        setCompletedCount((c) => c + 1);
    };

    const handleCelebrationComplete = () => {
        setShowCelebration(false);

        if (currentSubtaskIndex >= subtasks.length - 1) {
            setAllComplete(true);
        } else {
            completeCurrentSubtask();
        }
    };

    const handleSkip = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        nextSubtask();
    };

    const handlePauseToggle = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsPaused(!isPaused);
    };

    const handleNeedHelp = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            '🆘 需要帮助',
            '选择你需要的帮助类型',
            [
                { text: '📍 找不到东西', onPress: () => sendHelpRequest('find_item') },
                { text: '🤯 任务太难了', onPress: () => sendHelpRequest('too_hard') },
                { text: '😔 没有动力', onPress: () => sendHelpRequest('no_motivation') },
                { text: '取消', style: 'cancel' },
            ]
        );
    };

    const sendHelpRequest = (type: string) => {
        const messages: Record<string, string> = {
            find_item: '执行者需要帮忙找东西！',
            too_hard: '执行者觉得当前任务太难，需要进一步拆解',
            no_motivation: '执行者需要一些鼓励和支持',
        };
        Alert.alert('✅ 已发送', `支持者会收到通知：\n\n"${messages[type]}"`, [
            { text: '好的' },
        ]);
    };

    const handleRestart = () => {
        setAllComplete(false);
        setCurrentTask(DEMO_TASK);
        setCompletedCount(0);
        setTotalTimeSpent(0);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}分${secs}秒`;
    };

    if (!currentTask || !currentSubtask) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" />
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>📭</Text>
                    <Text style={styles.emptyTitle}>暂无任务</Text>
                    <Text style={styles.emptySubtitle}>
                        等待支持者分配新任务...
                    </Text>
                    <TouchableOpacity
                        style={styles.demoButton}
                        onPress={() => setCurrentTask(DEMO_TASK)}
                    >
                        <Text style={styles.demoButtonText}>加载示例任务</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (allComplete) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" />
                <Animated.View
                    entering={FadeIn}
                    style={styles.completeState}
                >
                    <Text style={styles.completeIcon}>🎉</Text>
                    <Text style={styles.completeTitle}>太棒了！</Text>
                    <Text style={styles.completeSubtitle}>
                        你完成了「{currentTask.title}」的所有步骤！
                    </Text>

                    {/* Stats */}
                    <Animated.View
                        entering={SlideInDown.delay(300)}
                        style={styles.statsCard}
                    >
                        <View style={styles.statRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{completedCount}</Text>
                                <Text style={styles.statLabel}>完成步骤</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{formatTime(totalTimeSpent)}</Text>
                                <Text style={styles.statLabel}>总用时</Text>
                            </View>
                        </View>
                    </Animated.View>

                    {/* Encouragement message */}
                    <Animated.View
                        entering={FadeInUp.delay(500)}
                        style={styles.encouragementCard}
                    >
                        <Text style={styles.encouragementEmoji}>💪</Text>
                        <Text style={styles.encouragementText}>
                            每完成一个任务，你都在变得更好！
                        </Text>
                    </Animated.View>

                    <TouchableOpacity
                        style={styles.restartButton}
                        onPress={handleRestart}
                    >
                        <LinearGradient
                            colors={[Colors.primary, '#FF8C61']}
                            style={styles.restartGradient}
                        >
                            <Text style={styles.restartText}>🔄 再来一个任务</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Ultra-minimal header - just show parent task */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => {
                    Alert.alert('📋 当前任务', currentTask.title, [{ text: '继续专注' }]);
                }}>
                    <Text style={styles.parentTask}>
                        {currentTask.title}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.quickHelp}
                    onPress={handleNeedHelp}
                >
                    <Text style={styles.helpIcon}>?</Text>
                </TouchableOpacity>
            </View>

            {/* Visual Timer - Central, focused */}
            <View style={styles.timerSection}>
                <VisualTimer
                    totalMinutes={currentSubtask.visualTimerMinutes}
                    remainingSeconds={remainingSeconds}
                    onTimeUp={() => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    }}
                    onWarning={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    }}
                />

                {/* Pause indicator - minimal */}
                {isPaused && (
                    <View style={styles.pausedBadge}>
                        <Text style={styles.pausedText}>⏸ 已暂停</Text>
                    </View>
                )}
            </View>

            {/* Single pause/play button - remove clutter */}
            <View style={styles.controlSection}>
                <TouchableOpacity
                    style={styles.pauseButton}
                    onPress={handlePauseToggle}
                    activeOpacity={0.7}
                >
                    <Text style={styles.pauseIcon}>{isPaused ? '▶' : '⏸'}</Text>
                </TouchableOpacity>
            </View>

            {/* Task Card - The main focus */}
            <TaskCard
                title={currentSubtask.title}
                stepNumber={currentSubtaskIndex + 1}
                totalSteps={subtasks.length}
                estimatedMinutes={currentSubtask.visualTimerMinutes}
                onComplete={handleComplete}
                onSkip={handleSkip}
            />

            {/* Celebration Overlay */}
            <DopaminePop
                trigger={showCelebration}
                onComplete={handleCelebrationComplete}
            />

            {/* Urgent Recharge Modal */}
            <UrgentRecharge
                isVisible={showUrgentRecharge}
                onClose={() => setShowUrgentRecharge(false)}
                onAccept={() => {
                    setShowUrgentRecharge(false);
                }}
                supporterName="支持者"
                reward={{ title: '一次按摩', icon: '💆' }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
    },
    parentTask: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        flex: 1,
        paddingVertical: Spacing.xs,
    },
    quickHelp: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
    },
    helpIcon: {
        fontSize: FontSizes.md,
        color: Colors.executor.primary,
        fontWeight: '700',
    },
    timerSection: {
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    pausedBadge: {
        position: 'absolute',
        top: '55%',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
    },
    pausedText: {
        color: Colors.textPrimary,
        fontSize: FontSizes.md,
        fontWeight: '600',
    },
    controlSection: {
        alignItems: 'center',
        paddingVertical: Spacing.xs,
    },
    pauseButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.surface,
        borderWidth: 2,
        borderColor: Colors.executor.glow,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pauseIcon: {
        fontSize: FontSizes.lg,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: Spacing.lg,
    },
    emptyTitle: {
        fontSize: FontSizes.xl,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    emptySubtitle: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.xl,
    },
    demoButton: {
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
    },
    demoButtonText: {
        color: Colors.primary,
        fontSize: FontSizes.md,
        fontWeight: '600',
    },
    completeState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    completeIcon: {
        fontSize: 80,
        marginBottom: Spacing.lg,
    },
    completeTitle: {
        fontSize: FontSizes.xxl,
        fontWeight: '700',
        color: Colors.success,
        marginBottom: Spacing.sm,
    },
    completeSubtitle: {
        fontSize: FontSizes.lg,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.xl,
    },
    statsCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        width: '100%',
        marginBottom: Spacing.lg,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: FontSizes.xl,
        fontWeight: '700',
        color: Colors.primary,
        marginBottom: Spacing.xs,
    },
    statLabel: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
    },
    statDivider: {
        width: 1,
        backgroundColor: Colors.surfaceElevated,
    },
    encouragementCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.executor.glow,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.xl,
    },
    encouragementEmoji: {
        fontSize: 24,
        marginRight: Spacing.sm,
    },
    encouragementText: {
        fontSize: FontSizes.md,
        color: Colors.textPrimary,
        flex: 1,
    },
    restartButton: {
        width: '100%',
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    restartGradient: {
        paddingVertical: Spacing.lg,
        alignItems: 'center',
    },
    restartText: {
        color: '#FFF',
        fontSize: FontSizes.lg,
        fontWeight: '700',
    },
});
