import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    TouchableOpacity,
    Alert,
    ScrollView,
    Platform,
    useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInUp, SlideInDown } from 'react-native-reanimated';

import TaskCard from '@/components/TaskCard';
import VisualTimer from '@/components/VisualTimer';
import DopaminePop from '@/components/DopaminePop';
import UrgentRecharge from '@/components/UrgentRecharge';
import AISettings from '@/components/AISettings';
import { useTaskStore, Task } from '@/stores/taskStore';
import { useEnergyStore } from '@/stores/energyStore';
import { useAISettingsStore } from '@/stores/aiSettingsStore';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';

const MAX_CONTENT_WIDTH = 480;

// Demo tasks for testing
const DEMO_TASKS: Task[] = [
    {
        id: '1',
        title: '整理书桌',
        description: '把书桌整理干净，让工作环境更舒适',
        creatorId: 'supporter-1',
        executorId: 'executor-1',
        visualTimerMinutes: 5,
        status: 'pending',
        createdAt: new Date(),
        subtasks: [
            { id: 's1', title: '把书桌上的杂物放到一边', estimatedMinutes: 1, order: 1 },
            { id: 's2', title: '用湿布擦拭桌面', estimatedMinutes: 1, order: 2 },
            { id: 's3', title: '整理文具放回笔筒', estimatedMinutes: 1, order: 3 },
            { id: 's4', title: '把书按大小排列整齐', estimatedMinutes: 2, order: 4 },
        ].map((s, i) => ({
            ...s,
            id: `subtask-1-${i}`,
            parentTaskId: '1',
            creatorId: 'supporter-1',
            executorId: 'executor-1',
            visualTimerMinutes: s.estimatedMinutes,
            status: 'pending' as const,
            createdAt: new Date(),
        })),
    },
    {
        id: '2',
        title: '洗碗',
        description: '把水池里的碗洗干净',
        creatorId: 'supporter-1',
        executorId: 'executor-1',
        visualTimerMinutes: 10,
        status: 'pending',
        createdAt: new Date(),
        subtasks: [
            { id: 's1', title: '把碗泡在水里', estimatedMinutes: 2, order: 1 },
            { id: 's2', title: '用洗洁精清洗', estimatedMinutes: 5, order: 2 },
            { id: 's3', title: '冲洗干净放到架子上', estimatedMinutes: 3, order: 3 },
        ].map((s, i) => ({
            ...s,
            id: `subtask-2-${i}`,
            parentTaskId: '2',
            creatorId: 'supporter-1',
            executorId: 'executor-1',
            visualTimerMinutes: s.estimatedMinutes,
            status: 'pending' as const,
            createdAt: new Date(),
        })),
    },
    {
        id: '3',
        title: '运动15分钟',
        description: '做一些简单的运动，保持身体健康',
        creatorId: 'supporter-1',
        executorId: 'executor-1',
        visualTimerMinutes: 15,
        status: 'pending',
        createdAt: new Date(),
        subtasks: [
            { id: 's1', title: '热身拉伸', estimatedMinutes: 3, order: 1 },
            { id: 's2', title: '做20个深蹲', estimatedMinutes: 4, order: 2 },
            { id: 's3', title: '做10个俯卧撑', estimatedMinutes: 4, order: 3 },
            { id: 's4', title: '放松拉伸', estimatedMinutes: 4, order: 4 },
        ].map((s, i) => ({
            ...s,
            id: `subtask-3-${i}`,
            parentTaskId: '3',
            creatorId: 'supporter-1',
            executorId: 'executor-1',
            visualTimerMinutes: s.estimatedMinutes,
            status: 'pending' as const,
            createdAt: new Date(),
        })),
    },
];

type ViewMode = 'list' | 'setup' | 'execution';

export default function ExecutorHomeScreen() {
    const router = useRouter();
    const { width: windowWidth } = useWindowDimensions();
    const contentWidth = Math.min(windowWidth, MAX_CONTENT_WIDTH);

    const {
        tasks,
        currentTask,
        currentSubtaskIndex,
        setTasks,
        setCurrentTask,
        completeCurrentSubtask,
        nextSubtask,
        removeTask,
    } = useTaskStore();
    const { totalPoints } = useEnergyStore();

    // View mode: list -> setup -> execution
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [customMinutes, setCustomMinutes] = useState(5);

    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const [showCelebration, setShowCelebration] = useState(false);
    const [allComplete, setAllComplete] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [showUrgentRecharge, setShowUrgentRecharge] = useState(false);
    const [completedCount, setCompletedCount] = useState(0);
    const [totalTimeSpent, setTotalTimeSpent] = useState(0);
    const [showAISettings, setShowAISettings] = useState(false);

    const { apiKey: aiApiKey } = useAISettingsStore();

    // Load demo tasks on mount
    useFocusEffect(
        useCallback(() => {
            if (tasks.length === 0) {
                setTasks(DEMO_TASKS);
            }
            return () => { };
        }, [])
    );

    // Check if supporter needs recharge
    useEffect(() => {
        if (totalPoints >= 100 && !showUrgentRecharge && !allComplete && viewMode === 'execution') {
            const timer = setTimeout(() => {
                setShowUrgentRecharge(true);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [totalPoints, allComplete, viewMode]);

    // Get current subtask
    const subtasks = currentTask?.subtasks || [];
    const currentSubtask = subtasks[currentSubtaskIndex];

    // Initialize timer when subtask changes
    useEffect(() => {
        if (currentSubtask && viewMode === 'execution') {
            setRemainingSeconds(currentSubtask.visualTimerMinutes * 60);
            setIsPaused(false);
        }
    }, [currentSubtask?.id, viewMode, currentSubtask?.visualTimerMinutes]);

    // Timer countdown
    useEffect(() => {
        if (remainingSeconds <= 0 || !currentSubtask || isPaused || viewMode !== 'execution') return;

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
    }, [remainingSeconds, currentSubtask, isPaused, viewMode]);

    const handleTaskSelect = (task: Task) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        setSelectedTask(task);
        setCustomMinutes(task.visualTimerMinutes);
        setViewMode('setup');
    };

    const handleStartTask = () => {
        if (!selectedTask) return;

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // Update task with custom time and update all subtasks proportionally
        const originalTotalTime = selectedTask.visualTimerMinutes;
        const timeRatio = customMinutes / originalTotalTime;

        const updatedTask: Task = {
            ...selectedTask,
            status: 'doing',
            visualTimerMinutes: customMinutes,
            // Update each subtask's time proportionally
            subtasks: selectedTask.subtasks?.map((subtask) => ({
                ...subtask,
                visualTimerMinutes: Math.max(1, Math.round(subtask.visualTimerMinutes * timeRatio)),
            })),
        };

        setCurrentTask(updatedTask);
        setAllComplete(false);
        setCompletedCount(0);
        setTotalTimeSpent(0);
        setViewMode('execution');
    };

    const handleBackToList = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setViewMode('list');
        setSelectedTask(null);
        setCurrentTask(null);
    };

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
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        nextSubtask();
    };

    const handlePauseToggle = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        setIsPaused(!isPaused);
    };

    const handleNeedHelp = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        Alert.alert(
            '需要帮助',
            '选择你需要的帮助类型',
            [
                { text: '找不到东西', onPress: () => sendHelpRequest('find_item') },
                { text: '任务太难了', onPress: () => sendHelpRequest('too_hard') },
                { text: '没有动力', onPress: () => sendHelpRequest('no_motivation') },
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
        Alert.alert('已发送', `支持者会收到通知：\n\n"${messages[type]}"`, [
            { text: '好的' },
        ]);
    };

    const handleRestart = () => {
        setAllComplete(false);
        setViewMode('list');
        setSelectedTask(null);
        setCurrentTask(null);
        setCompletedCount(0);
        setTotalTimeSpent(0);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}分${secs}秒`;
    };

    const adjustTime = (delta: number) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setCustomMinutes((prev) => Math.max(1, Math.min(60, prev + delta)));
    };

    const handleDeleteTask = (taskId: string, taskTitle: string) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        Alert.alert(
            '删除任务',
            `确定要删除「${taskTitle}」吗？`,
            [
                {
                    text: '取消',
                    style: 'cancel',
                },
                {
                    text: '删除',
                    style: 'destructive',
                    onPress: () => {
                        removeTask(taskId);
                        if (Platform.OS !== 'web') {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                    },
                },
            ]
        );
    };

    // Task List View
    if (viewMode === 'list') {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" />
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[styles.content, { width: contentWidth }]}>
                        <View style={styles.listHeader}>
                            <Text style={styles.listTitle}>待办任务</Text>
                            <TouchableOpacity
                                style={[styles.settingsButton, !aiApiKey && styles.settingsButtonWarning]}
                                onPress={() => setShowAISettings(true)}
                            >
                                <Text style={styles.settingsIcon}>⚙️</Text>
                            </TouchableOpacity>
                        </View>

                        {tasks.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyIcon}>📭</Text>
                                <Text style={styles.emptyTitle}>暂无任务</Text>
                                <Text style={styles.emptySubtitle}>
                                    等待支持者分配新任务...
                                </Text>
                                <TouchableOpacity
                                    style={styles.demoButton}
                                    onPress={() => setTasks(DEMO_TASKS)}
                                >
                                    <Text style={styles.demoButtonText}>加载示例任务</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.taskList}>
                                {tasks.map((task, index) => (
                                    <Animated.View
                                        key={task.id}
                                        entering={FadeInUp.delay(index * 100)}
                                    >
                                        <View style={styles.taskItemWrapper}>
                                            <TouchableOpacity
                                                style={styles.taskItem}
                                                onPress={() => handleTaskSelect(task)}
                                                activeOpacity={0.8}
                                            >
                                                <View style={styles.taskItemLeft}>
                                                    <Text style={styles.taskItemIcon}>📋</Text>
                                                </View>
                                                <View style={styles.taskItemContent}>
                                                    <Text style={styles.taskItemTitle}>{task.title}</Text>
                                                    {task.description && (
                                                        <Text style={styles.taskItemDesc} numberOfLines={1}>
                                                            {task.description}
                                                        </Text>
                                                    )}
                                                    <View style={styles.taskItemMeta}>
                                                        <Text style={styles.taskItemTime}>
                                                            ⏱ {task.visualTimerMinutes}分钟
                                                        </Text>
                                                        <Text style={styles.taskItemSteps}>
                                                            📝 {task.subtasks?.length || 0}个步骤
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.taskItemArrow}>›</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.deleteButton}
                                                onPress={() => handleDeleteTask(task.id, task.title)}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={styles.deleteButtonText}>🗑️</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </Animated.View>
                                ))}
                            </View>
                        )}
                    </View>
                </ScrollView>

                <AISettings
                    isVisible={showAISettings}
                    onClose={() => setShowAISettings(false)}
                />
            </SafeAreaView>
        );
    }

    // Task Setup View
    if (viewMode === 'setup' && selectedTask) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" />
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[styles.content, { width: contentWidth }]}>
                        {/* Back button */}
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={handleBackToList}
                        >
                            <Text style={styles.backButtonText}>‹ 返回</Text>
                        </TouchableOpacity>

                        {/* Task info */}
                        <Animated.View entering={FadeIn} style={styles.setupHeader}>
                            <Text style={styles.setupIcon}>🎯</Text>
                            <Text style={styles.setupTitle}>{selectedTask.title}</Text>
                            {selectedTask.description && (
                                <Text style={styles.setupDesc}>{selectedTask.description}</Text>
                            )}
                        </Animated.View>

                        {/* Time selector */}
                        <Animated.View entering={FadeInUp.delay(200)} style={styles.timeSelector}>
                            <Text style={styles.timeSelectorLabel}>设置专注时间</Text>
                            <View style={styles.timeControls}>
                                <TouchableOpacity
                                    style={styles.timeButton}
                                    onPress={() => adjustTime(-5)}
                                >
                                    <Text style={styles.timeButtonText}>-5</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.timeButton}
                                    onPress={() => adjustTime(-1)}
                                >
                                    <Text style={styles.timeButtonText}>-1</Text>
                                </TouchableOpacity>
                                <View style={styles.timeDisplay}>
                                    <Text style={styles.timeValue}>{customMinutes}</Text>
                                    <Text style={styles.timeUnit}>分钟</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.timeButton}
                                    onPress={() => adjustTime(1)}
                                >
                                    <Text style={styles.timeButtonText}>+1</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.timeButton}
                                    onPress={() => adjustTime(5)}
                                >
                                    <Text style={styles.timeButtonText}>+5</Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>

                        {/* Subtasks preview */}
                        <Animated.View entering={FadeInUp.delay(300)} style={styles.subtasksPreview}>
                            <Text style={styles.subtasksLabel}>任务步骤</Text>
                            {selectedTask.subtasks?.map((subtask, index) => (
                                <View key={subtask.id} style={styles.subtaskItem}>
                                    <View style={styles.subtaskNumber}>
                                        <Text style={styles.subtaskNumberText}>{index + 1}</Text>
                                    </View>
                                    <Text style={styles.subtaskTitle}>{subtask.title}</Text>
                                </View>
                            ))}
                        </Animated.View>

                        {/* Start button */}
                        <Animated.View entering={FadeInUp.delay(400)} style={styles.startButtonContainer}>
                            <TouchableOpacity
                                style={styles.startButton}
                                onPress={handleStartTask}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={[Colors.primary, '#FF8C61']}
                                    style={styles.startGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Text style={styles.startButtonText}>▶ 开始专注</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    // Execution View - All Complete
    if (allComplete && currentTask) {
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
                            <Text style={styles.restartText}>📋 返回任务列表</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </SafeAreaView>
        );
    }

    // Execution View - In Progress
    if (viewMode === 'execution' && currentTask && currentSubtask) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" />

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBackToList}>
                        <Text style={styles.backText}>‹ 退出</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                        Alert.alert('当前任务', currentTask.title, [{ text: '继续专注' }]);
                    }}>
                        <Text style={styles.parentTask}>
                            {currentTask.title}
                        </Text>
                    </TouchableOpacity>
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            style={[styles.settingsButton, !aiApiKey && styles.settingsButtonWarning]}
                            onPress={() => setShowAISettings(true)}
                        >
                            <Text style={styles.settingsIcon}>⚙️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.quickHelp}
                            onPress={handleNeedHelp}
                        >
                            <Text style={styles.helpIcon}>?</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Visual Timer */}
                <View style={styles.timerSection}>
                    <VisualTimer
                        totalMinutes={currentSubtask.visualTimerMinutes}
                        remainingSeconds={remainingSeconds}
                        onTimeUp={() => {
                            if (Platform.OS !== 'web') {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                            }
                        }}
                        onWarning={() => {
                            if (Platform.OS !== 'web') {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                            }
                        }}
                    />

                    {isPaused && (
                        <View style={styles.pausedBadge}>
                            <Text style={styles.pausedText}>⏸ 已暂停</Text>
                        </View>
                    )}
                </View>

                {/* Pause button */}
                <View style={styles.controlSection}>
                    <TouchableOpacity
                        style={styles.pauseButton}
                        onPress={handlePauseToggle}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.pauseIcon}>{isPaused ? '▶' : '⏸'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Task Card */}
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

                {/* AI Settings Modal */}
                <AISettings
                    isVisible={showAISettings}
                    onClose={() => setShowAISettings(false)}
                />
            </SafeAreaView>
        );
    }

    // Fallback - Empty State
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
                    onPress={() => {
                        setTasks(DEMO_TASKS);
                        setViewMode('list');
                    }}
                >
                    <Text style={styles.demoButtonText}>加载示例任务</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
    },
    content: {
        flex: 1,
        width: '100%',
        maxWidth: MAX_CONTENT_WIDTH,
        paddingHorizontal: Spacing.lg,
    },
    // List View Styles
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    listTitle: {
        fontSize: FontSizes.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    taskList: {
        gap: Spacing.md,
    },
    taskItemWrapper: {
        position: 'relative',
    },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.surfaceElevated,
    },
    deleteButton: {
        position: 'absolute',
        right: Spacing.sm,
        top: Spacing.sm,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.error,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.9,
    },
    deleteButtonText: {
        fontSize: 18,
    },
    taskItemLeft: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.executor.glow,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    taskItemIcon: {
        fontSize: 24,
    },
    taskItemContent: {
        flex: 1,
    },
    taskItemTitle: {
        fontSize: FontSizes.md,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
    },
    taskItemDesc: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
    },
    taskItemMeta: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    taskItemTime: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
    },
    taskItemSteps: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
    },
    taskItemArrow: {
        fontSize: FontSizes.xl,
        color: Colors.textMuted,
        marginLeft: Spacing.sm,
    },
    // Setup View Styles
    backButton: {
        paddingVertical: Spacing.md,
    },
    backButtonText: {
        fontSize: FontSizes.md,
        color: Colors.primary,
    },
    setupHeader: {
        alignItems: 'center',
        paddingVertical: Spacing.xl,
    },
    setupIcon: {
        fontSize: 64,
        marginBottom: Spacing.md,
    },
    setupTitle: {
        fontSize: FontSizes.xxl,
        fontWeight: '700',
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    setupDesc: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    timeSelector: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    timeSelectorLabel: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    timeControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
    },
    timeButton: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeButtonText: {
        fontSize: FontSizes.md,
        color: Colors.textPrimary,
        fontWeight: '600',
    },
    timeDisplay: {
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
    },
    timeValue: {
        fontSize: FontSizes.hero,
        fontWeight: '700',
        color: Colors.primary,
    },
    timeUnit: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
    },
    subtasksPreview: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    subtasksLabel: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        marginBottom: Spacing.md,
    },
    subtaskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    subtaskNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    subtaskNumberText: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        fontWeight: '600',
    },
    subtaskTitle: {
        fontSize: FontSizes.md,
        color: Colors.textPrimary,
        flex: 1,
    },
    startButtonContainer: {
        paddingBottom: Spacing.xxl,
    },
    startButton: {
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    startGradient: {
        paddingVertical: Spacing.lg,
        alignItems: 'center',
    },
    startButtonText: {
        color: '#FFF',
        fontSize: FontSizes.lg,
        fontWeight: '700',
    },
    // Execution View Styles
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
    },
    backText: {
        fontSize: FontSizes.md,
        color: Colors.primary,
    },
    parentTask: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        flex: 1,
        textAlign: 'center',
        paddingHorizontal: Spacing.md,
    },
    headerRight: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    settingsButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsButtonWarning: {
        borderWidth: 2,
        borderColor: Colors.warning,
    },
    settingsIcon: {
        fontSize: FontSizes.md,
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
    // Empty State
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
    // Complete State
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
