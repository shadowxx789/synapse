import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInUp, Layout } from 'react-native-reanimated';

import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';
import { ShredResult, shredTask } from '@/services/ai';
import { taskService } from '@/services/backend';
import { useEnergyStore, ACTION_POINTS } from '@/stores/energyStore';
import { Reward } from '@/stores/rewardStore';
import { useUserStore } from '@/stores/userStore';
import SupportHeatmap from '@/components/SupportHeatmap';
import RewardShop from '@/components/RewardShop';
import AIAgent from '@/components/AIAgent';

// Generate mock heatmap data for the last 28 days
const generateHeatmapData = () => {
    const data = [];
    for (let i = 27; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        data.push({
            label: date.toLocaleDateString(),
            value: Math.floor(Math.random() * 8), // Random 0-7 activities per day
            maxValue: 7,
        });
    }
    return data;
};

export default function SupporterHomeScreen() {
    const [taskInput, setTaskInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSendingTask, setIsSendingTask] = useState(false);
    const [shredResult, setShredResult] = useState<ShredResult | null>(null);
    const [showAIAgent, setShowAIAgent] = useState(false);
    const [activeTab, setActiveTab] = useState<'tasks' | 'heatmap' | 'rewards'>('tasks');
    const { totalPoints, addPoints, actions } = useEnergyStore();
    const user = useUserStore((state) => state.user);

    // Helper to count active days
    const activeDaysCount = () => {
        const uniqueDays = new Set(
            actions.map(a => new Date(a.timestamp).toDateString())
        );
        return uniqueDays.size;
    };

    // Generate heatmap data based on actual actions
    const heatmapData = useMemo(() => {
        const data = [];
        for (let i = 27; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();

            // Count actions for this day (using mock data for demo + real actions)
            const dayActions = actions.filter(a =>
                new Date(a.timestamp).toDateString() === dateStr
            ).length;

            // Add some mock data for visualization
            const mockValue = Math.floor(Math.random() * 3);

            data.push({
                label: date.toLocaleDateString(),
                value: dayActions + mockValue,
                maxValue: 10,
            });
        }
        return data;
    }, [actions]);

    const handleShred = async () => {
        if (!taskInput.trim()) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsLoading(true);

        try {
            // Call the real AI service to shred the task
            const result = await shredTask(taskInput);

            setShredResult(result);

            // Award energy points
            if (user?.id) {
                addPoints({
                    userId: user.id,
                    actionType: 'instruction_shred',
                    points: ACTION_POINTS.instruction_shred,
                    description: `鎷嗚В浠诲姟: ${taskInput}`,
                });
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Shred failed:', error);
            Alert.alert(
                '鎷嗚В澶辫触',
                'AI 任务拆解失败，请检查 AI 配置或稍后重试。',
                [{ text: '濂界殑' }]
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendToExecutor = async () => {
        if (!shredResult) return;

        if (!user?.id || !user.partnerId) {
            Alert.alert('无法发送', '请先完成伴侣配对，再发送任务。');
            return;
        }

        const executorId = user.partnerId;
        const normalizeMinutes = (value: number | string | undefined): number =>
            Math.max(1, Math.round(Number(value) || 1));
        const totalMinutes = Math.max(
            1,
            shredResult.subtasks.reduce((sum, subtask) => sum + normalizeMinutes(subtask.estimatedMinutes), 0)
        );

        setIsSendingTask(true);

        try {
            const parentTaskId = await taskService.create({
                parent_task_id: null,
                title: shredResult.originalTask,
                description: `支持者分配任务: ${user.name}`,
                creator_id: user.id,
                executor_id: executorId,
                visual_timer_minutes: totalMinutes,
                status: 'pending',
                completed_at: null,
            });

            await Promise.all(
                shredResult.subtasks.map((subtask) =>
                    taskService.create({
                        parent_task_id: parentTaskId,
                        title: subtask.title,
                        description: null,
                        creator_id: user.id,
                        executor_id: executorId,
                        visual_timer_minutes: normalizeMinutes(subtask.estimatedMinutes),
                        status: 'pending',
                        completed_at: null,
                    })
                )
            );

            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            Alert.alert(
                '任务已发送',
                '执行者将收到这个任务，并看到拆解后的步骤。',
                [{ text: '好的', style: 'default' }]
            );
            setShredResult(null);
            setTaskInput('');
        } catch (error) {
            console.error('Send task failed:', error);
            Alert.alert('发送失败', '任务发送失败，请稍后重试。');
        } finally {
            setIsSendingTask(false);
        }
    };

    const handleAISendReminder = (message: string) => {
        Alert.alert(
            '📤 提醒已发送',
            `AI 灏忓姪鎵嬪凡缁忓府浣犲彂閫佷簡鎻愰啋:\n\n"${message}"`,
            [{ text: '濂界殑', style: 'default' }]
        );
    };

    const handleRewardRedeemed = (reward: Reward) => {
        Alert.alert(
            '🎀 奖励已兑换',
            `${reward.title} 已经发送给执行者，请记得兑现哦！`,
            [{ text: '濂界殑', style: 'default' }]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header with Energy Points */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.greeting}>浣犲ソ 馃憢</Text>
                            <Text style={styles.subtitle}>陪伴是最长情的告白</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.energyBadge}
                            onPress={() => setActiveTab('rewards')}
                        >
                            <Text style={styles.energyIcon}>⚡</Text>
                            <Text style={styles.energyPoints}>{totalPoints}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Quick Stats Dashboard - calming, clear */}
                    <View style={styles.quickStats}>
                        <View style={styles.quickStat}>
                            <Text style={styles.quickStatValue}>{activeDaysCount()}</Text>
                            <Text style={styles.quickStatLabel}>天陪伴</Text>
                        </View>
                        <View style={styles.quickStatDivider} />
                        <View style={styles.quickStat}>
                            <Text style={styles.quickStatValue}>{actions.length}</Text>
                            <Text style={styles.quickStatLabel}>次帮助</Text>
                        </View>
                    </View>

                    {/* Clean Tab Navigation */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'tasks' && styles.tabActive]}
                            onPress={() => setActiveTab('tasks')}
                        >
                            <Text style={[styles.tabText, activeTab === 'tasks' && styles.tabTextActive]}>
                                浠诲姟
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'heatmap' && styles.tabActive]}
                            onPress={() => setActiveTab('heatmap')}
                        >
                            <Text style={[styles.tabText, activeTab === 'heatmap' && styles.tabTextActive]}>
                                鐑姏鍥?
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'rewards' && styles.tabActive]}
                            onPress={() => setActiveTab('rewards')}
                        >
                            <Text style={[styles.tabText, activeTab === 'rewards' && styles.tabTextActive]}>
                                濂栧姳
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Tab Content */}
                    {activeTab === 'tasks' && (
                        <>
                            {/* Task Input Section */}
                            <Animated.View
                                entering={FadeInUp.delay(200)}
                                style={styles.inputSection}
                            >
                                <Text style={styles.sectionTitle}>🔧 任务拆解器</Text>
                                <Text style={styles.sectionHint}>
                                    杈撳叆涓€涓ぇ浠诲姟锛孉I 浼氳嚜鍔ㄦ媶瑙ｆ垚灏忔楠?
                                </Text>

                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="渚嬪锛氭暣鐞嗚。鏌溿€佸噯澶囨櫄椁?.."
                                        placeholderTextColor={Colors.textMuted}
                                        value={taskInput}
                                        onChangeText={setTaskInput}
                                        multiline
                                        maxLength={200}
                                    />

                                    <TouchableOpacity
                                        style={[
                                            styles.shredButton,
                                            (!taskInput.trim() || isLoading) && styles.buttonDisabled
                                        ]}
                                        onPress={handleShred}
                                        disabled={!taskInput.trim() || isLoading}
                                        activeOpacity={0.8}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color="#FFF" />
                                        ) : (
                                            <Text style={styles.shredButtonText}>鉁傦笍 鎷嗚В</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>

                                {/* Quick task buttons */}
                                <View style={styles.quickTasks}>
                                    {['鏁寸悊鎴块棿', '鍑嗗鏅氶', '娲楃'].map((task) => (
                                        <TouchableOpacity
                                            key={task}
                                            style={styles.quickTaskChip}
                                            onPress={() => setTaskInput(task)}
                                        >
                                            <Text style={styles.quickTaskText}>{task}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </Animated.View>

                            {/* Shred Results */}
                            {shredResult && (
                                <Animated.View
                                    entering={FadeIn}
                                    layout={Layout}
                                    style={styles.resultsSection}
                                >
                                    <Text style={styles.sectionTitle}>馃搵 鎷嗚В缁撴灉</Text>
                                    <Text style={styles.originalTask}>
                                        鍘熶换鍔★細{shredResult.originalTask}
                                    </Text>

                                    <View style={styles.subtasksList}>
                                        {shredResult.subtasks.map((subtask, index) => (
                                            <Animated.View
                                                key={index}
                                                entering={FadeInUp.delay(index * 100)}
                                                style={styles.subtaskItem}
                                            >
                                                <View style={styles.stepNumber}>
                                                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                                                </View>
                                                <View style={styles.subtaskContent}>
                                                    <Text style={styles.subtaskTitle}>{subtask.title}</Text>
                                                    <Text style={styles.subtaskTime}>
                                                        鈴?{subtask.estimatedMinutes} 鍒嗛挓
                                                    </Text>
                                                </View>
                                            </Animated.View>
                                        ))}
                                    </View>

                                    <TouchableOpacity
                                        style={styles.sendButton}
                                        onPress={handleSendToExecutor}
                                        disabled={isSendingTask}
                                        activeOpacity={0.8}
                                    >
                                        <LinearGradient
                                            colors={[Colors.supporter.primary, Colors.supporter.accent]}
                                            style={styles.sendButtonGradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        >
                                            <Text style={styles.sendButtonText}>
                                                {isSendingTask ? '发送中...' : '📤 发送给执行者'}
                                            </Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </Animated.View>
                            )}

                            {/* AI Agent Button */}
                            <Animated.View entering={FadeInUp.delay(300)} style={styles.aiSection}>
                                <TouchableOpacity
                                    style={styles.aiAgentButton}
                                    onPress={() => setShowAIAgent(true)}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.aiAgentIcon}>
                                        <Text style={styles.aiAgentEmoji}>馃</Text>
                                    </View>
                                    <View style={styles.aiAgentContent}>
                                        <Text style={styles.aiAgentTitle}>AI 浠ｆ浛鍌績</Text>
                                        <Text style={styles.aiAgentDesc}>
                                            璁?AI 灏忓姪鎵嬪府浣犳俯鍜屽湴鎻愰啋鎵ц鑰?
                                        </Text>
                                    </View>
                                    <Text style={styles.aiAgentArrow}>→</Text>
                                </TouchableOpacity>
                            </Animated.View>

                            {/* Energy Bank Preview */}
                            <Animated.View
                                entering={FadeInUp.delay(400)}
                                style={styles.energySection}
                            >
                                <Text style={styles.sectionTitle}>馃挵 鎯呮劅閾惰</Text>
                                <View style={styles.energyCard}>
                                    <View style={styles.energyRow}>
                                        <Text style={styles.energyLabel}>褰撳墠鑳介噺</Text>
                                        <Text style={styles.energyValue}>⚡ {totalPoints} 点</Text>
                                    </View>
                                    <View style={styles.energyProgress}>
                                        <View
                                            style={[
                                                styles.energyProgressFill,
                                                { width: `${Math.min(100, totalPoints)}%` }
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.energyHint}>
                                        {totalPoints >= 100
                                            ? '🎀 能量已满！可以兑换奖励了！'
                                            : `还差 ${100 - totalPoints} 点可以兑换奖励！`}
                                    </Text>
                                </View>

                                {/* Action breakdown */}
                                <View style={styles.actionBreakdown}>
                                    <Text style={styles.breakdownTitle}>绉垎鏄庣粏</Text>
                                    <View style={styles.breakdownItem}>
                                        <Text style={styles.breakdownLabel}>鉁傦笍 浠诲姟鎷嗚В</Text>
                                        <Text style={styles.breakdownValue}>+10 点/次</Text>
                                    </View>
                                    <View style={styles.breakdownItem}>
                                        <Text style={styles.breakdownLabel}>🔍 帮忙找东西</Text>
                                        <Text style={styles.breakdownValue}>+5 点/次</Text>
                                    </View>
                                    <View style={styles.breakdownItem}>
                                        <Text style={styles.breakdownLabel}>馃懃 杩滅▼闄悓</Text>
                                        <Text style={styles.breakdownValue}>+15 鐐?30鍒嗛挓</Text>
                                    </View>
                                </View>
                            </Animated.View>
                        </>
                    )}

                    {activeTab === 'heatmap' && (
                        <Animated.View entering={FadeIn}>
                            <SupportHeatmap data={heatmapData} />
                        </Animated.View>
                    )}

                    {activeTab === 'rewards' && (
                        <Animated.View entering={FadeIn}>
                            <RewardShop onRewardRedeemed={handleRewardRedeemed} />
                        </Animated.View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* AI Agent Modal */}
            <AIAgent
                isVisible={showAIAgent}
                onClose={() => setShowAIAgent(false)}
                onSendReminder={handleAISendReminder}
                executorName="执行者"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    greeting: {
        fontSize: FontSizes.xxl,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    subtitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },
    energyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceElevated,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        borderWidth: 2,
        borderColor: Colors.energyGlow,
        ...Platform.select({
            web: { boxShadow: '0px 0px 8px rgba(255, 215, 0, 0.3)' },
            default: {
                shadowColor: 'rgba(255, 215, 0, 0.3)',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
            },
        }),
    },
    energyIcon: {
        fontSize: 18,
        marginRight: Spacing.xs,
    },
    energyPoints: {
        fontSize: FontSizes.md,
        fontWeight: '700',
        color: Colors.energyGlow,
    },
    quickStats: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    quickStat: {
        alignItems: 'center',
    },
    quickStatValue: {
        fontSize: FontSizes.xl,
        fontWeight: '700',
        color: Colors.supporter.primary,
    },
    quickStatLabel: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        marginTop: Spacing.xs,
    },
    quickStatDivider: {
        width: 1,
        height: 30,
        backgroundColor: Colors.surfaceElevated,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xs,
        marginBottom: Spacing.lg,
    },
    tab: {
        flex: 1,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
        borderRadius: BorderRadius.lg,
    },
    tabActive: {
        backgroundColor: Colors.supporter.primary,
    },
    tabText: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        fontWeight: '500',
    },
    tabTextActive: {
        color: '#FFF',
        fontWeight: '700',
    },
    inputSection: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xxl,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        fontSize: FontSizes.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
    },
    sectionHint: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.md,
    },
    inputContainer: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    textInput: {
        flex: 1,
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        color: Colors.textPrimary,
        fontSize: FontSizes.md,
        minHeight: 50,
        maxHeight: 100,
    },
    shredButton: {
        backgroundColor: Colors.supporter.primary,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: Colors.surfaceElevated,
    },
    shredButtonText: {
        color: '#FFF',
        fontSize: FontSizes.md,
        fontWeight: '700',
    },
    quickTasks: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    quickTaskChip: {
        backgroundColor: Colors.surfaceElevated,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
    },
    quickTaskText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    resultsSection: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xxl,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    originalTask: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.md,
        fontStyle: 'italic',
    },
    subtasksList: {
        gap: Spacing.sm,
    },
    subtaskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
    },
    stepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.supporter.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    stepNumberText: {
        color: '#FFF',
        fontSize: FontSizes.sm,
        fontWeight: '700',
    },
    subtaskContent: {
        flex: 1,
    },
    subtaskTitle: {
        fontSize: FontSizes.md,
        color: Colors.textPrimary,
        fontWeight: '500',
    },
    subtaskTime: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        marginTop: Spacing.xs,
    },
    sendButton: {
        marginTop: Spacing.lg,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
    },
    sendButtonGradient: {
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    sendButtonText: {
        color: '#FFF',
        fontSize: FontSizes.md,
        fontWeight: '700',
    },
    aiSection: {
        marginBottom: Spacing.lg,
    },
    aiAgentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xxl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.surfaceElevated,
    },
    aiAgentIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.supporter.glow,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    aiAgentEmoji: {
        fontSize: 24,
    },
    aiAgentContent: {
        flex: 1,
    },
    aiAgentTitle: {
        fontSize: FontSizes.md,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
    },
    aiAgentDesc: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    aiAgentArrow: {
        fontSize: FontSizes.xl,
        color: Colors.supporter.primary,
    },
    energySection: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xxl,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    energyCard: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    energyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    energyLabel: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
    },
    energyValue: {
        fontSize: FontSizes.lg,
        fontWeight: '700',
        color: Colors.energyGlow,
    },
    energyProgress: {
        height: 8,
        backgroundColor: Colors.surface,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: Spacing.sm,
    },
    energyProgressFill: {
        height: '100%',
        backgroundColor: Colors.energyGlow,
        borderRadius: 4,
    },
    energyHint: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        textAlign: 'center',
    },
    actionBreakdown: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
    },
    breakdownTitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    breakdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: Spacing.xs,
    },
    breakdownLabel: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
    },
    breakdownValue: {
        fontSize: FontSizes.sm,
        color: Colors.supporter.primary,
        fontWeight: '600',
    },
});

