import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeIn,
    SlideInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';
import { useAISettingsStore } from '@/stores/aiSettingsStore';
import { generateReminder, ReminderStyle } from '@/services/ai';

interface AIAgentProps {
    isVisible: boolean;
    onClose: () => void;
    onSendReminder: (message: string) => void;
    executorName?: string;
}

// Pre-defined gentle reminder templates (fallback when AI not configured)
const REMINDER_TEMPLATES = [
    {
        id: 'gentle',
        label: '温和提醒',
        message: '嘿，你现在有空吗？有一个小任务需要你的帮助 💪',
        style: 'gentle' as ReminderStyle,
    },
    {
        id: 'time',
        label: '时间提醒',
        message: '⏰ 离任务截止还有一点时间，我们一起完成它吧！',
        style: 'time' as ReminderStyle,
    },
    {
        id: 'encourage',
        label: '鼓励式',
        message: '我相信你可以的！就差这一步了，加油 ✨',
        style: 'encourage' as ReminderStyle,
    },
    {
        id: 'inquiry',
        label: '询问式',
        message: '最近感觉怎么样？需要我帮你把任务拆得更小一些吗？',
        style: 'inquiry' as ReminderStyle,
    },
];

export default function AIAgent({
    isVisible,
    onClose,
    onSendReminder,
    executorName = '执行者'
}: AIAgentProps) {
    const [customMessage, setCustomMessage] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    const { apiKey } = useAISettingsStore();
    const isAIConfigured = !!apiKey;

    // Floating animation for the robot
    const floatY = useSharedValue(0);

    useEffect(() => {
        floatY.value = withRepeat(
            withTiming(10, { duration: 1500 }),
            -1,
            true
        );
    }, []);

    const robotStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: floatY.value }],
    }));

    const handleSelectTemplate = async (template: typeof REMINDER_TEMPLATES[0]) => {
        setSelectedTemplate(template.id);
        setAiError(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // If AI is configured, generate a new message using AI
        if (isAIConfigured) {
            setIsGenerating(true);
            const result = await generateReminder(template.style);
            setIsGenerating(false);

            if (result.success) {
                setCustomMessage(result.message);
            } else {
                // Fallback to template message
                setCustomMessage(template.message);
                setAiError(result.error || '生成失败，使用预设消息');
            }
        } else {
            // Use template message directly
            setCustomMessage(template.message);
        }
    };

    const handleGenerateCustom = async () => {
        if (!isAIConfigured) {
            setAiError('请先在设置中配置 AI API');
            return;
        }

        setIsGenerating(true);
        setAiError(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const result = await generateReminder('custom', customMessage || '生成一条温和的提醒');
        setIsGenerating(false);

        if (result.success) {
            setCustomMessage(result.message);
            setSelectedTemplate(null);
        } else {
            setAiError(result.error || '生成失败');
        }
    };

    const handleSend = async () => {
        if (!customMessage.trim()) return;

        setIsSending(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Simulate sending
        await new Promise(resolve => setTimeout(resolve, 1000));

        onSendReminder(customMessage);
        setIsSending(false);
        setCustomMessage('');
        setSelectedTemplate(null);
        setAiError(null);
        onClose();

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
                    entering={SlideInDown.springify()}
                    style={styles.container}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* AI Avatar */}
                        <Animated.View style={[styles.avatarContainer, robotStyle]}>
                            <Text style={styles.avatar}>🤖</Text>
                        </Animated.View>

                        <Text style={styles.title}>AI 小助手</Text>
                        <Text style={styles.subtitle}>
                            让我来帮你温和地提醒 {executorName}
                        </Text>

                        {/* AI Status Badge */}
                        <View style={[
                            styles.aiBadge,
                            isAIConfigured ? styles.aiBadgeActive : styles.aiBadgeInactive
                        ]}>
                            <Text style={styles.aiBadgeIcon}>
                                {isAIConfigured ? '✨' : '⚠️'}
                            </Text>
                            <Text style={[
                                styles.aiBadgeText,
                                isAIConfigured ? styles.aiBadgeTextActive : styles.aiBadgeTextInactive
                            ]}>
                                {isAIConfigured ? 'AI 已启用 - 智能生成消息' : '使用预设模板 (配置 API 启用 AI)'}
                            </Text>
                        </View>

                        {/* Template Options */}
                        <View style={styles.templatesContainer}>
                            <Text style={styles.sectionLabel}>
                                {isAIConfigured ? '选择风格 (AI 将生成消息)' : '选择提醒方式'}
                            </Text>
                            <View style={styles.templates}>
                                {REMINDER_TEMPLATES.map((template) => (
                                    <TouchableOpacity
                                        key={template.id}
                                        style={[
                                            styles.templateChip,
                                            selectedTemplate === template.id && styles.templateChipSelected,
                                            isGenerating && selectedTemplate === template.id && styles.templateChipLoading
                                        ]}
                                        onPress={() => handleSelectTemplate(template)}
                                        disabled={isGenerating}
                                    >
                                        {isGenerating && selectedTemplate === template.id ? (
                                            <ActivityIndicator size="small" color={Colors.supporter.primary} />
                                        ) : (
                                            <Text style={[
                                                styles.templateChipText,
                                                selectedTemplate === template.id && styles.templateChipTextSelected
                                            ]}>
                                                {template.label}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Custom Message */}
                        <View style={styles.messageContainer}>
                            <View style={styles.messageLabelRow}>
                                <Text style={styles.sectionLabel}>提醒内容</Text>
                                {isAIConfigured && (
                                    <TouchableOpacity
                                        style={styles.regenerateButton}
                                        onPress={handleGenerateCustom}
                                        disabled={isGenerating}
                                    >
                                        <Text style={styles.regenerateButtonText}>
                                            {isGenerating ? '生成中...' : '🔄 重新生成'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <TextInput
                                style={styles.messageInput}
                                placeholder={isAIConfigured ? "选择风格后 AI 自动生成，或手动编辑..." : "输入或编辑提醒内容..."}
                                placeholderTextColor={Colors.textMuted}
                                value={customMessage}
                                onChangeText={setCustomMessage}
                                multiline
                                maxLength={200}
                            />
                        </View>

                        {/* AI Error */}
                        {aiError && (
                            <Animated.View entering={FadeIn} style={styles.errorContainer}>
                                <Text style={styles.errorText}>⚠️ {aiError}</Text>
                            </Animated.View>
                        )}

                        {/* Preview */}
                        {customMessage.trim() && (
                            <Animated.View
                                entering={FadeIn}
                                style={styles.previewContainer}
                            >
                                <Text style={styles.previewLabel}>预览</Text>
                                <View style={styles.previewBubble}>
                                    <Text style={styles.previewSender}>🤖 同频小助手</Text>
                                    <Text style={styles.previewMessage}>{customMessage}</Text>
                                </View>
                            </Animated.View>
                        )}

                        {/* Actions */}
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={onClose}
                            >
                                <Text style={styles.cancelButtonText}>取消</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.sendButton,
                                    (!customMessage.trim() || isSending || isGenerating) && styles.sendButtonDisabled
                                ]}
                                onPress={handleSend}
                                disabled={!customMessage.trim() || isSending || isGenerating}
                            >
                                <Text style={styles.sendButtonText}>
                                    {isSending ? '发送中...' : '📤 发送提醒'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.note}>
                            💡 {isAIConfigured 
                                ? 'AI 会根据你选择的风格生成独特的温和提醒' 
                                : '配置 AI API 后可使用智能生成功能'}
                        </Text>
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.lg,
        paddingTop: Spacing.xxl,
        maxHeight: '90%',
    },
    avatarContainer: {
        position: 'absolute',
        top: -40,
        alignSelf: 'center',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: Colors.supporter.primary,
        shadowColor: Colors.supporter.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 10,
    },
    avatar: {
        fontSize: 40,
    },
    title: {
        fontSize: FontSizes.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
        textAlign: 'center',
        marginTop: Spacing.lg,
    },
    subtitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: Spacing.xs,
        marginBottom: Spacing.md,
    },
    aiBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.full,
        marginBottom: Spacing.lg,
        gap: Spacing.xs,
    },
    aiBadgeActive: {
        backgroundColor: 'rgba(78, 205, 196, 0.15)',
        borderWidth: 1,
        borderColor: Colors.supporter.primary,
    },
    aiBadgeInactive: {
        backgroundColor: Colors.surfaceElevated,
    },
    aiBadgeIcon: {
        fontSize: FontSizes.sm,
    },
    aiBadgeText: {
        fontSize: FontSizes.xs,
    },
    aiBadgeTextActive: {
        color: Colors.supporter.primary,
        fontWeight: '600',
    },
    aiBadgeTextInactive: {
        color: Colors.textMuted,
    },
    templatesContainer: {
        marginBottom: Spacing.md,
    },
    sectionLabel: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    templates: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    templateChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: 'transparent',
        minWidth: 70,
        alignItems: 'center',
    },
    templateChipSelected: {
        backgroundColor: Colors.supporter.glow,
        borderColor: Colors.supporter.primary,
    },
    templateChipLoading: {
        opacity: 0.7,
    },
    templateChipText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    templateChipTextSelected: {
        color: Colors.supporter.primary,
        fontWeight: '600',
    },
    messageContainer: {
        marginBottom: Spacing.md,
    },
    messageLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    regenerateButton: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    regenerateButtonText: {
        fontSize: FontSizes.xs,
        color: Colors.supporter.primary,
        fontWeight: '600',
    },
    messageInput: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        color: Colors.textPrimary,
        fontSize: FontSizes.md,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    errorContainer: {
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        marginBottom: Spacing.md,
    },
    errorText: {
        fontSize: FontSizes.sm,
        color: Colors.error,
        textAlign: 'center',
    },
    previewContainer: {
        marginBottom: Spacing.md,
    },
    previewLabel: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        marginBottom: Spacing.xs,
    },
    previewBubble: {
        backgroundColor: Colors.supporter.glow,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: Colors.supporter.primary,
    },
    previewSender: {
        fontSize: FontSizes.xs,
        color: Colors.supporter.primary,
        fontWeight: '600',
        marginBottom: Spacing.xs,
    },
    previewMessage: {
        fontSize: FontSizes.md,
        color: Colors.textPrimary,
        lineHeight: FontSizes.md * 1.4,
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.md,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: Colors.textMuted,
        fontSize: FontSizes.md,
    },
    sendButton: {
        flex: 2,
        backgroundColor: Colors.supporter.primary,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: Colors.surfaceElevated,
    },
    sendButtonText: {
        color: '#FFF',
        fontSize: FontSizes.md,
        fontWeight: '700',
    },
    note: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        textAlign: 'center',
        marginTop: Spacing.lg,
        marginBottom: Spacing.md,
    },
});
