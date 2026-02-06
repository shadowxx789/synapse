import React, { useState, useEffect } from 'react';
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
    Modal,
    TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInUp, SlideInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import TaskCard from '@/components/TaskCard';
import VisualTimer from '@/components/VisualTimer';
import DopaminePop from '@/components/DopaminePop';
import UrgentRecharge from '@/components/UrgentRecharge';
import AISettings from '@/components/AISettings';
import TaskItemSkeleton from '@/components/TaskItemSkeleton';
import { useTaskStore, Task } from '@/stores/taskStore';
import { useEnergyStore } from '@/stores/energyStore';
import { useAISettingsStore } from '@/stores/aiSettingsStore';
import { useUserStore } from '@/stores/userStore';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';
import { shredTask } from '@/services/ai';

const MAX_CONTENT_WIDTH = 480;
const DEMO_CREATOR_ID = 'demo-supporter';
const DEMO_EXECUTOR_ID = 'demo-executor';

// Demo tasks for testing
const DEMO_TASKS: Task[] = [
    {
        id: '1',
        title: '鏁寸悊涔︽',
        description: '把书桌整理干净，让工作环境更舒适',
        creatorId: DEMO_CREATOR_ID,
        executorId: DEMO_EXECUTOR_ID,
        visualTimerMinutes: 5,
        status: 'pending',
        createdAt: new Date(),
        subtasks: [
            { id: 's1', title: '把书桌上的杂物放到一边', estimatedMinutes: 1, order: 1 },
            { id: 's2', title: '用湿布擦拭桌面', estimatedMinutes: 1, order: 2 },
            { id: 's3', title: '鏁寸悊鏂囧叿鏀惧洖绗旂瓛', estimatedMinutes: 1, order: 3 },
            { id: 's4', title: '把书按大小排列整齐', estimatedMinutes: 2, order: 4 },
        ].map((s, i) => ({
            ...s,
            id: `subtask-1-${i}`,
            parentTaskId: '1',
            creatorId: DEMO_CREATOR_ID,
            executorId: DEMO_EXECUTOR_ID,
            visualTimerMinutes: s.estimatedMinutes,
            status: 'pending' as const,
            createdAt: new Date(),
        })),
    },
    {
        id: '2',
        title: '娲楃',
        description: '鎶婃按姹犻噷鐨勭娲楀共鍑€',
        creatorId: DEMO_CREATOR_ID,
        executorId: DEMO_EXECUTOR_ID,
        visualTimerMinutes: 10,
        status: 'pending',
        createdAt: new Date(),
        subtasks: [
            { id: 's1', title: '鎶婄娉″湪姘撮噷', estimatedMinutes: 2, order: 1 },
            { id: 's2', title: '鐢ㄦ礂娲佺簿娓呮礂', estimatedMinutes: 5, order: 2 },
            { id: 's3', title: '冲洗干净放到架子上', estimatedMinutes: 3, order: 3 },
        ].map((s, i) => ({
            ...s,
            id: `subtask-2-${i}`,
            parentTaskId: '2',
            creatorId: DEMO_CREATOR_ID,
            executorId: DEMO_EXECUTOR_ID,
            visualTimerMinutes: s.estimatedMinutes,
            status: 'pending' as const,
            createdAt: new Date(),
        })),
    },
    {
        id: '3',
        title: '杩愬姩15鍒嗛挓',
        description: '做一些简单的运动，保持身体健康',
        creatorId: DEMO_CREATOR_ID,
        executorId: DEMO_EXECUTOR_ID,
        visualTimerMinutes: 15,
        status: 'pending',
        createdAt: new Date(),
        subtasks: [
            { id: 's1', title: '鐑韩鎷変几', estimatedMinutes: 3, order: 1 },
            { id: 's2', title: '做 20 个深蹲', estimatedMinutes: 4, order: 2 },
            { id: 's3', title: '鍋?0涓刊鍗ф拺', estimatedMinutes: 4, order: 3 },
            { id: 's4', title: '鏀炬澗鎷変几', estimatedMinutes: 4, order: 4 },
        ].map((s, i) => ({
            ...s,
            id: `subtask-3-${i}`,
            parentTaskId: '3',
            creatorId: DEMO_CREATOR_ID,
            executorId: DEMO_EXECUTOR_ID,
            visualTimerMinutes: s.estimatedMinutes,
            status: 'pending' as const,
            createdAt: new Date(),
        })),
    },
];

const buildDemoTasks = (executorId: string, creatorId: string): Task[] =>
    DEMO_TASKS.map((task, taskIndex) => {
        const demoTaskId = `demo-task-${taskIndex + 1}`;
        return {
            ...task,
            id: demoTaskId,
            creatorId,
            executorId,
            createdAt: new Date(),
            subtasks: task.subtasks?.map((subtask, subtaskIndex) => ({
                ...subtask,
                id: `${demoTaskId}-subtask-${subtaskIndex + 1}`,
                parentTaskId: demoTaskId,
                creatorId,
                executorId,
                createdAt: new Date(),
            })),
        };
    });

type ViewMode = 'list' | 'setup' | 'execution';

export default function ExecutorHomeScreen() {
    const { width: windowWidth } = useWindowDimensions();
    const contentWidth = Math.min(windowWidth, MAX_CONTENT_WIDTH);

    const {
        tasks,
        isSyncing,
        currentTask,
        currentSubtaskIndex,
        setTasks,
        addTask,
        setCurrentTask,
        completeCurrentSubtask,
        nextSubtask,
        removeTask,
    } = useTaskStore();
    const { totalPoints } = useEnergyStore();
    const user = useUserStore((state) => state.user);

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
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskMinutes, setNewTaskMinutes] = useState(5);

    const { apiKey: aiApiKey } = useAISettingsStore();
    const isLoadingTasks = isSyncing && tasks.length === 0;

    const scaleSubtasksToTotal = (subtasks: Task[] | undefined, targetMinutes: number): Task[] | undefined => {
        if (!subtasks || subtasks.length === 0) return subtasks;

        const baseTotal = subtasks.reduce((sum, st) => sum + Number(st.visualTimerMinutes || 0), 0) || 1;
        const scaledMinutes = subtasks.map((subtask) =>
            Math.max(1, Math.round(Number(subtask.visualTimerMinutes || 0) * (targetMinutes / baseTotal)))
        );

        const currentTotal = scaledMinutes.reduce((sum, minutes) => sum + minutes, 0);
        let diff = targetMinutes - currentTotal;

        for (let i = scaledMinutes.length - 1; i >= 0 && diff !== 0; i -= 1) {
            const nextValue = scaledMinutes[i] + diff;
            if (nextValue >= 1) {
                scaledMinutes[i] = nextValue;
                diff = 0;
            } else {
                diff += scaledMinutes[i] - 1;
                scaledMinutes[i] = 1;
            }
        }

        return subtasks.map((subtask, index) => ({
            ...subtask,
            visualTimerMinutes: scaledMinutes[index],
        }));
    };

    const loadDemoTasks = () => {
        if (!user?.id) {
            Alert.alert('鎻愮ず', '鐢ㄦ埛淇℃伅鏈姞杞斤紝鏆傛椂鏃犳硶鍔犺浇绀轰緥浠诲姟');
            return;
        }

        const creatorId = user.partnerId ?? user.id;
        setTasks(buildDemoTasks(user.id, creatorId));
        setViewMode('list');
    };

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

    // Calculate total remaining time (current subtask remaining + all upcoming subtasks)
    const calculateTotalRemainingSeconds = (): number => {
        if (!currentSubtask || !subtasks || subtasks.length === 0) return 0;

        // Sum of current subtask's allocated time + all upcoming subtasks
        const upcomingSubtasks = subtasks.slice(currentSubtaskIndex);
        const totalMinutes = upcomingSubtasks.reduce((sum, st) => sum + Number(st.visualTimerMinutes || 0), 0);
        return totalMinutes * 60;
    };

    // Initialize timer when subtask changes
    useEffect(() => {
        if (currentSubtask && viewMode === 'execution') {
            setRemainingSeconds(calculateTotalRemainingSeconds());
            setIsPaused(false);
        }
    }, [currentSubtask?.id, viewMode, subtasks, currentSubtaskIndex]);

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
        const originalTotalTime = selectedTask.visualTimerMinutes || 1;

        const updatedTask: Task = {
            ...selectedTask,
            status: 'doing',
            visualTimerMinutes: customMinutes,
            // Update each subtask's time proportionally
            subtasks: scaleSubtasksToTotal(selectedTask.subtasks, customMinutes),
        };

        setCurrentTask(updatedTask);
        // IMPORTANT: Set timer directly to user's requested time (bypass useEffect race condition)
        setRemainingSeconds(customMinutes * 60);
        setIsPaused(false);
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
            '閫夋嫨浣犻渶瑕佺殑甯姪绫诲瀷',
            [
                { text: '找不到东西', onPress: () => sendHelpRequest('find_item') },
                { text: '任务太难了', onPress: () => sendHelpRequest('too_hard') },
                { text: '娌℃湁鍔ㄥ姏', onPress: () => sendHelpRequest('no_motivation') },
                { text: '鍙栨秷', style: 'cancel' },
            ]
        );
    };

    const sendHelpRequest = (type: string) => {
        const messages: Record<string, string> = {
            find_item: '执行者需要帮忙找东西！',
            too_hard: '执行者觉得当前任务太难，需要进一步拆解',
            no_motivation: '鎵ц鑰呴渶瑕佷竴浜涢紦鍔卞拰鏀寔',
        };
        Alert.alert('已发送', `支持者会收到通知：\n\n"${messages[type]}"`, [
            { text: '濂界殑' },
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
        return `${mins}分 ${secs}秒`;
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
        if (Platform.OS === 'web') {
            removeTask(taskId);
            return;
        }

        Alert.alert(
            '鍒犻櫎浠诲姟',
            `确定要删除「${taskTitle}」吗？`,
            [
                {
                    text: '鍙栨秷',
                    style: 'cancel',
                },
                {
                    text: '鍒犻櫎',
                    style: 'destructive',
                    onPress: () => {
                        removeTask(taskId);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    },
                },
            ]
        );
    };

    const handleCreateTask = async () => {
        if (!newTaskTitle.trim()) {
            Alert.alert('提示', '请输入任务标题');
            return;
        }

        if (!user?.id) {
            Alert.alert('提示', '用户信息未加载，请稍后重试');
            return;
        }

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        const creatorId = user.id;
        const executorId = user.id;

        try {
            // Use AI to shred the task into subtasks
            const shredResult = await shredTask(newTaskTitle);

            const taskTimestamp = Date.now();
            const taskId = `task-${taskTimestamp}`;
            const newTask: Task = {
                id: taskId,
                title: newTaskTitle,
                description: '执行者自己创建的任务',
                creatorId,
                executorId,
                visualTimerMinutes: newTaskMinutes,
                status: 'pending',
                createdAt: new Date(),
                subtasks: shredResult.subtasks.map((subtask, index) => ({
                    id: `subtask-${taskTimestamp}-${index}`,
                    parentTaskId: taskId,
                    title: subtask.title,
                    creatorId,
                    executorId,
                    visualTimerMinutes: Math.max(1, Math.round(Number(subtask.estimatedMinutes) || 1)),
                    status: 'pending',
                    createdAt: new Date(),
                })),
            };

            addTask(newTask);
            setShowCreateTask(false);
            setNewTaskTitle('');
            setNewTaskMinutes(5);

            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            Alert.alert(
                '✅ 任务已创建',
                `「${newTaskTitle}」已添加到任务列表，共 ${shredResult.subtasks.length} 个步骤`,
                [{ text: '好的' }]
            );
        } catch (error) {
            console.error('Create task failed:', error);

            // Fallback: create simple task without AI shredding
            const taskTimestamp = Date.now();
            const taskId = `task-${taskTimestamp}`;
            const newTask: Task = {
                id: taskId,
                title: newTaskTitle,
                description: '执行者自己创建的任务',
                creatorId,
                executorId,
                visualTimerMinutes: newTaskMinutes,
                status: 'pending',
                createdAt: new Date(),
                subtasks: [
                    {
                        id: `subtask-${taskTimestamp}-0`,
                        parentTaskId: taskId,
                        title: newTaskTitle,
                        creatorId,
                        executorId,
                        visualTimerMinutes: Math.max(1, Math.round(Number(newTaskMinutes) || 1)),
                        status: 'pending',
                        createdAt: new Date(),
                    },
                ],
            };

            addTask(newTask);
            setShowCreateTask(false);
            setNewTaskTitle('');
            setNewTaskMinutes(5);

            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            Alert.alert(
                '✅ 任务已创建',
                `「${newTaskTitle}」已添加到任务列表（未使用 AI 拆解）`,
                [{ text: '好的' }]
            );
        }
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
                            <Text style={styles.listTitle}>寰呭姙浠诲姟</Text>
                            <View style={styles.headerRight}>
                                <TouchableOpacity
                                    style={styles.createButton}
                                    onPress={() => setShowCreateTask(true)}
                                >
                                    <MaterialCommunityIcons name="plus" size={24} color={Colors.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.settingsButton, !aiApiKey && styles.settingsButtonWarning]}
                                    onPress={() => setShowAISettings(true)}
                                >
                                    <MaterialCommunityIcons name="cog-outline" size={22} color={Colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {isLoadingTasks ? (
                            <View style={styles.taskList}>
                                {Array.from({ length: 3 }).map((_, index) => (
                                    <TaskItemSkeleton key={`task-skeleton-${index}`} />
                                ))}
                            </View>
                        ) : tasks.length === 0 ? (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="inbox-outline" size={64} color={Colors.textMuted} />
                                <Text style={styles.emptyTitle}>鏆傛棤浠诲姟</Text>
                                <Text style={styles.emptySubtitle}>
                                    绛夊緟鏀寔鑰呭垎閰嶆柊浠诲姟...
                                </Text>
                                <TouchableOpacity
                                    style={styles.demoButton}
                                    onPress={loadDemoTasks}
                                >
                                    <Text style={styles.demoButtonText}>鍔犺浇绀轰緥浠诲姟</Text>
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
                                                    <MaterialCommunityIcons name="clipboard-text-outline" size={24} color={Colors.executor.primary} />
                                                </View>
                                                <View style={styles.taskItemContent}>
                                                    <Text style={styles.taskItemTitle}>{task.title}</Text>
                                                    {task.description && (
                                                        <Text style={styles.taskItemDesc} numberOfLines={1}>
                                                            {task.description}
                                                        </Text>
                                                    )}
                                                    <View style={styles.taskItemMeta}>
                                                        <View style={styles.metaItem}>
                                                            <MaterialCommunityIcons name="timer-outline" size={14} color={Colors.textMuted} />
                                                            <Text style={styles.taskItemTime}>
                                                                {task.visualTimerMinutes}鍒嗛挓
                                                            </Text>
                                                        </View>
                                                        <View style={styles.metaItem}>
                                                            <MaterialCommunityIcons name="format-list-checks" size={14} color={Colors.textMuted} />
                                                            <Text style={styles.taskItemSteps}>
                                                                {task.subtasks?.length || 0}涓楠?
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>
                                                <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textMuted} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.deleteButton}
                                                onPress={() => handleDeleteTask(task.id, task.title)}
                                                activeOpacity={0.7}
                                            >
                                                <MaterialCommunityIcons name="trash-can-outline" size={20} color="#FFF" />
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

                {/* Create Task Modal */}
                <Modal
                    visible={showCreateTask}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowCreateTask(false)}
                >
                    <View style={styles.modalOverlay}>
                        <Animated.View
                            entering={SlideInDown.springify()}
                            style={styles.modalContainer}
                        >
                            <Text style={styles.modalTitle}>创建新任务</Text>
                            <Text style={styles.modalSubtitle}>
                                AI 浼氳嚜鍔ㄥ府浣犳媶瑙ｆ垚灏忔楠?
                            </Text>

                            <TextInput
                                style={styles.modalInput}
                                placeholder="杈撳叆浠诲姟鍚嶇О锛屼緥濡傦細鏁寸悊涔︽"
                                placeholderTextColor={Colors.textMuted}
                                value={newTaskTitle}
                                onChangeText={setNewTaskTitle}
                                autoFocus
                                maxLength={100}
                            />

                            <View style={styles.modalTimeSection}>
                                <Text style={styles.modalTimeLabel}>棰勮鏃堕暱</Text>
                                <View style={styles.modalTimeControls}>
                                    <TouchableOpacity
                                        style={styles.modalTimeButton}
                                        onPress={() => setNewTaskMinutes(Math.max(1, newTaskMinutes - 1))}
                                    >
                                        <Text style={styles.modalTimeButtonText}>-</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.modalTimeValue}>{newTaskMinutes}鍒嗛挓</Text>
                                    <TouchableOpacity
                                        style={styles.modalTimeButton}
                                        onPress={() => setNewTaskMinutes(Math.min(60, newTaskMinutes + 1))}
                                    >
                                        <Text style={styles.modalTimeButtonText}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.modalCancelButton}
                                    onPress={() => {
                                        setShowCreateTask(false);
                                        setNewTaskTitle('');
                                        setNewTaskMinutes(5);
                                    }}
                                >
                                    <Text style={styles.modalCancelText}>鍙栨秷</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.modalCreateButton,
                                        !newTaskTitle.trim() && styles.modalCreateButtonDisabled,
                                    ]}
                                    onPress={handleCreateTask}
                                    disabled={!newTaskTitle.trim()}
                                >
                                    <LinearGradient
                                        colors={[Colors.primary, '#FF8C61']}
                                        style={styles.modalCreateGradient}
                                    >
                                        <Text style={styles.modalCreateText}>鉁?鍒涘缓</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </View>
                </Modal>
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
                            <View style={styles.backButtonContent}>
                                <MaterialCommunityIcons name="chevron-left" size={24} color={Colors.primary} />
                                <Text style={styles.backButtonText}>杩斿洖</Text>
                            </View>
                        </TouchableOpacity>

                        {/* Task info */}
                        <Animated.View entering={FadeIn} style={styles.setupHeader}>
                            <MaterialCommunityIcons name="target" size={64} color={Colors.primary} />
                            <Text style={styles.setupTitle}>{selectedTask.title}</Text>
                            {selectedTask.description && (
                                <Text style={styles.setupDesc}>{selectedTask.description}</Text>
                            )}
                        </Animated.View>

                        {/* Time selector */}
                        <Animated.View entering={FadeInUp.delay(200)} style={styles.timeSelector}>
                            <Text style={styles.timeSelectorLabel}>璁剧疆涓撴敞鏃堕棿</Text>
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
                                    <Text style={styles.timeUnit}>鍒嗛挓</Text>
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
                            <Text style={styles.subtasksLabel}>浠诲姟姝ラ</Text>
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
                                    <View style={styles.startButtonContent}>
                                        <MaterialCommunityIcons name="play" size={24} color="#FFF" />
                                        <Text style={styles.startButtonText}>开始专注</Text>
                                    </View>
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
                    <MaterialCommunityIcons name="party-popper" size={80} color={Colors.success} />
                    <Text style={styles.completeTitle}>澶浜嗭紒</Text>
                    <Text style={styles.completeSubtitle}>
                        {`你完成了「${currentTask.title}」的所有步骤！`}
                    </Text>

                    {/* Stats */}
                    <Animated.View
                        entering={SlideInDown.delay(300)}
                        style={styles.statsCard}
                    >
                        <View style={styles.statRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{completedCount}</Text>
                                <Text style={styles.statLabel}>瀹屾垚姝ラ</Text>
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
                        <MaterialCommunityIcons name="arm-flex" size={24} color={Colors.executor.primary} style={styles.encouragementIcon} />
                        <Text style={styles.encouragementText}>
                            姣忓畬鎴愪竴涓换鍔★紝浣犻兘鍦ㄥ彉寰楁洿濂斤紒
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
                            <View style={styles.restartButtonContent}>
                                <MaterialCommunityIcons name="clipboard-list-outline" size={20} color="#FFF" />
                                <Text style={styles.restartText}>杩斿洖浠诲姟鍒楄〃</Text>
                            </View>
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
                    <TouchableOpacity style={styles.headerBackButton} onPress={handleBackToList}>
                        <MaterialCommunityIcons name="chevron-left" size={24} color={Colors.primary} />
                        <Text style={styles.backText}>退出</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                        Alert.alert('褰撳墠浠诲姟', currentTask.title, [{ text: '缁х画涓撴敞' }]);
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
                            <MaterialCommunityIcons name="cog-outline" size={22} color={Colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.quickHelp}
                            onPress={handleNeedHelp}
                        >
                            <MaterialCommunityIcons name="help-circle-outline" size={22} color={Colors.executor.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Main execution content - flex layout, no scroll */}
                <View style={styles.executionContent}>
                    {/* Visual Timer - takes available space */}
                    <View style={styles.timerSection}>
                        <VisualTimer
                            totalMinutes={currentTask.visualTimerMinutes}
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
                                <MaterialCommunityIcons name="pause" size={16} color={Colors.textPrimary} />
                                <Text style={styles.pausedText}>已暂停</Text>
                            </View>
                        )}

                        {/* Pause button - integrated with timer */}
                        <TouchableOpacity
                            style={styles.pauseButton}
                            onPress={handlePauseToggle}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons 
                                name={isPaused ? 'play' : 'pause'} 
                                size={28} 
                                color={Colors.executor.primary} 
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Task Card - compact at bottom */}
                    <TaskCard
                        title={currentSubtask.title}
                        stepNumber={currentSubtaskIndex + 1}
                        totalSteps={subtasks.length}
                        estimatedMinutes={currentSubtask.visualTimerMinutes}
                        onComplete={handleComplete}
                        onSkip={handleSkip}
                    />
                </View>

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
                    reward={{ title: '一次按摩', iconName: 'spa' }}
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
                <MaterialCommunityIcons name="inbox-outline" size={64} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>鏆傛棤浠诲姟</Text>
                <Text style={styles.emptySubtitle}>
                    绛夊緟鏀寔鑰呭垎閰嶆柊浠诲姟...
                </Text>
                <TouchableOpacity
                    style={styles.demoButton}
                    onPress={loadDemoTasks}
                >
                    <Text style={styles.demoButtonText}>鍔犺浇绀轰緥浠诲姟</Text>
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
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.error,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.9,
    },
    deleteButtonText: {
        fontSize: 20,
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
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    taskItemTime: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
    },
    taskItemSteps: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
    },
    // Setup View Styles
    backButton: {
        paddingVertical: Spacing.md,
        minHeight: 44,
        justifyContent: 'center',
    },
    backButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: FontSizes.md,
        color: Colors.primary,
    },
    setupHeader: {
        alignItems: 'center',
        paddingVertical: Spacing.xl,
        marginTop: Spacing.md,
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
    startButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
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
    headerBackButton: {
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: 44,
        minHeight: 44,
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
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsButtonWarning: {
        borderWidth: 2,
        borderColor: Colors.warning,
    },
    settingsIcon: {
        fontSize: FontSizes.lg,
    },
    quickHelp: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
    },
    helpIcon: {
        fontSize: FontSizes.lg,
        color: Colors.executor.primary,
        fontWeight: '700',
    },
    timerSection: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pausedBadge: {
        position: 'absolute',
        top: '45%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        backgroundColor: 'rgba(0,0,0,0.8)',
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
    executionContent: {
        flex: 1,
        justifyContent: 'space-between',
    },
    pauseButton: {
        marginTop: Spacing.md,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.surfaceElevated,
        borderWidth: 3,
        borderColor: Colors.executor.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            web: { boxShadow: '0px 4px 12px rgba(255, 107, 53, 0.4)' },
            default: {
                shadowColor: Colors.executor.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
                elevation: 8,
            },
        }),
    },
    pauseIcon: {
        fontSize: FontSizes.xl,
        color: Colors.executor.primary,
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
    encouragementIcon: {
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
    restartButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    restartText: {
        color: '#FFF',
        fontSize: FontSizes.lg,
        fontWeight: '700',
    },
    // Create Task Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },
    modalTitle: {
        fontSize: FontSizes.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: Spacing.xs,
    },
    modalSubtitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    modalInput: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        color: Colors.textPrimary,
        fontSize: FontSizes.md,
        marginBottom: Spacing.md,
    },
    modalTimeSection: {
        marginBottom: Spacing.lg,
    },
    modalTimeLabel: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    modalTimeControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.md,
    },
    modalTimeButton: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTimeButtonText: {
        fontSize: FontSizes.lg,
        color: Colors.textPrimary,
        fontWeight: '700',
    },
    modalTimeValue: {
        fontSize: FontSizes.lg,
        fontWeight: '700',
        color: Colors.primary,
        minWidth: 80,
        textAlign: 'center',
    },
    modalActions: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    modalCancelButton: {
        flex: 1,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surfaceElevated,
    },
    modalCancelText: {
        color: Colors.textMuted,
        fontSize: FontSizes.md,
        fontWeight: '600',
    },
    modalCreateButton: {
        flex: 2,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
    },
    modalCreateButtonDisabled: {
        opacity: 0.5,
    },
    modalCreateGradient: {
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    modalCreateText: {
        color: '#FFF',
        fontSize: FontSizes.md,
        fontWeight: '700',
    },
    createButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
    },
    createButtonText: {
        fontSize: FontSizes.md,
        color: '#FFF',
    },
});


