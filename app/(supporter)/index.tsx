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
import { ShredResult } from '@/services/ai';
import { useEnergyStore, ACTION_POINTS } from '@/stores/energyStore';
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
    const [shredResult, setShredResult] = useState<ShredResult | null>(null);
    const [showAIAgent, setShowAIAgent] = useState(false);
    const [activeTab, setActiveTab] = useState<'tasks' | 'heatmap' | 'rewards'>('tasks');
    const { totalPoints, addPoints, actions } = useEnergyStore();

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
            // Smart AI-like task shredding based on task type
            const taskLower = taskInput.toLowerCase();
            let subtasks: { title: string; estimatedMinutes: number; order: number }[] = [];

            if (taskLower.includes('整理') || taskLower.includes('收拾')) {
                subtasks = [
                    { title: '找一个空箱子或袋子放不需要的东西', estimatedMinutes: 1, order: 1 },
                    { title: '先把最大的几件东西归位', estimatedMinutes: 2, order: 2 },
                    { title: '整理桌面/台面上的小物品', estimatedMinutes: 2, order: 3 },
                    { title: '擦拭表面灰尘', estimatedMinutes: 1, order: 4 },
                    { title: '检查一遍，确保看起来整洁', estimatedMinutes: 1, order: 5 },
                ];
            } else if (taskLower.includes('做饭') || taskLower.includes('晚餐') || taskLower.includes('午餐')) {
                subtasks = [
                    { title: '决定今天要做什么菜', estimatedMinutes: 1, order: 1 },
                    { title: '检查食材是否齐全', estimatedMinutes: 1, order: 2 },
                    { title: '洗菜和准备食材', estimatedMinutes: 2, order: 3 },
                    { title: '开始烹饪', estimatedMinutes: 2, order: 4 },
                    { title: '装盘并清理灶台', estimatedMinutes: 2, order: 5 },
                ];
            } else if (taskLower.includes('洗') || taskLower.includes('清洁')) {
                subtasks = [
                    { title: '准备清洁用品', estimatedMinutes: 1, order: 1 },
                    { title: '从最脏的地方开始', estimatedMinutes: 2, order: 2 },
                    { title: '仔细清洗每个角落', estimatedMinutes: 2, order: 3 },
                    { title: '冲洗干净', estimatedMinutes: 1, order: 4 },
                    { title: '擦干并放回原位', estimatedMinutes: 1, order: 5 },
                ];
            } else if (taskLower.includes('工作') || taskLower.includes('report') || taskLower.includes('报告')) {
                subtasks = [
                    { title: '关闭手机通知，准备专注', estimatedMinutes: 1, order: 1 },
                    { title: '打开需要的文档/工具', estimatedMinutes: 1, order: 2 },
                    { title: '完成第一个小部分', estimatedMinutes: 2, order: 3 },
                    { title: '休息一下，喝口水', estimatedMinutes: 1, order: 4 },
                    { title: '继续下一个部分', estimatedMinutes: 2, order: 5 },
                ];
            } else {
                // Generic breakdown
                subtasks = [
                    { title: `开始准备${taskInput}`, estimatedMinutes: 1, order: 1 },
                    { title: `执行${taskInput}的第一步`, estimatedMinutes: 2, order: 2 },
                    { title: '完成主要内容', estimatedMinutes: 2, order: 3 },
                    { title: '检查完成情况', estimatedMinutes: 1, order: 4 },
                    { title: '收尾和整理', estimatedMinutes: 1, order: 5 },
                ];
            }

            const mockResult: ShredResult = {
                originalTask: taskInput,
                subtasks,
            };

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1200));

            setShredResult(mockResult);

            // Award energy points
            addPoints({
                userId: 'supporter-1',
                actionType: 'instruction_shred',
                points: ACTION_POINTS.instruction_shred,
                description: `拆解任务: ${taskInput}`,
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Shred failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendToExecutor = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
            '✅ 任务已发送',
            '执行者将收到这个任务，并看到拆解后的步骤。',
            [{ text: '好的', style: 'default' }]
        );
        setShredResult(null);
        setTaskInput('');
    };

    const handleAISendReminder = (message: string) => {
        Alert.alert(
            '📤 提醒已发送',
            `AI 小助手已经帮你发送了提醒:\n\n"${message}"`,
            [{ text: '好的', style: 'default' }]
        );
    };

    const handleRewardRedeemed = (reward: any) => {
        Alert.alert(
            '🎉 奖励已兑换',
            `${reward.title} 已经发送给执行者，请记得兑现哦！`,
            [{ text: '好的', style: 'default' }]
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
                            <Text style={styles.greeting}>你好 👋</Text>
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
                                任务
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'heatmap' && styles.tabActive]}
                            onPress={() => setActiveTab('heatmap')}
                        >
                            <Text style={[styles.tabText, activeTab === 'heatmap' && styles.tabTextActive]}>
                                热力图
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'rewards' && styles.tabActive]}
                            onPress={() => setActiveTab('rewards')}
                        >
                            <Text style={[styles.tabText, activeTab === 'rewards' && styles.tabTextActive]}>
                                奖励
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
                                    输入一个大任务，AI 会自动拆解成小步骤
                                </Text>

                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="例如：整理衣柜、准备晚餐..."
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
                                            <Text style={styles.shredButtonText}>✂️ 拆解</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>

                                {/* Quick task buttons */}
                                <View style={styles.quickTasks}>
                                    {['整理房间', '准备晚餐', '洗碗'].map((task) => (
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
                                    <Text style={styles.sectionTitle}>📋 拆解结果</Text>
                                    <Text style={styles.originalTask}>
                                        原任务：{shredResult.originalTask}
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
                                                        ⏱ {subtask.estimatedMinutes} 分钟
                                                    </Text>
                                                </View>
                                            </Animated.View>
                                        ))}
                                    </View>

                                    <TouchableOpacity
                                        style={styles.sendButton}
                                        onPress={handleSendToExecutor}
                                        activeOpacity={0.8}
                                    >
                                        <LinearGradient
                                            colors={[Colors.supporter.primary, Colors.supporter.accent]}
                                            style={styles.sendButtonGradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        >
                                            <Text style={styles.sendButtonText}>
                                                📤 发送给执行者
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
                                        <Text style={styles.aiAgentEmoji}>🤖</Text>
                                    </View>
                                    <View style={styles.aiAgentContent}>
                                        <Text style={styles.aiAgentTitle}>AI 代替催促</Text>
                                        <Text style={styles.aiAgentDesc}>
                                            让 AI 小助手帮你温和地提醒执行者
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
                                <Text style={styles.sectionTitle}>💰 情感银行</Text>
                                <View style={styles.energyCard}>
                                    <View style={styles.energyRow}>
                                        <Text style={styles.energyLabel}>当前能量</Text>
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
                                            ? '🎉 能量已满！可以兑换奖励了！'
                                            : `还差 ${100 - totalPoints} 点可以兑换奖励！`}
                                    </Text>
                                </View>

                                {/* Action breakdown */}
                                <View style={styles.actionBreakdown}>
                                    <Text style={styles.breakdownTitle}>积分明细</Text>
                                    <View style={styles.breakdownItem}>
                                        <Text style={styles.breakdownLabel}>✂️ 任务拆解</Text>
                                        <Text style={styles.breakdownValue}>+10 点/次</Text>
                                    </View>
                                    <View style={styles.breakdownItem}>
                                        <Text style={styles.breakdownLabel}>🔍 帮忙找东西</Text>
                                        <Text style={styles.breakdownValue}>+5 点/次</Text>
                                    </View>
                                    <View style={styles.breakdownItem}>
                                        <Text style={styles.breakdownLabel}>👥 远程陪同</Text>
                                        <Text style={styles.breakdownValue}>+15 点/30分钟</Text>
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
        shadowColor: Colors.energyGlow,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
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
