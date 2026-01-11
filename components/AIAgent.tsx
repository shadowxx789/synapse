import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
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

interface AIAgentProps {
    isVisible: boolean;
    onClose: () => void;
    onSendReminder: (message: string) => void;
    executorName?: string;
}

// Pre-defined gentle reminder templates
const REMINDER_TEMPLATES = [
    {
        id: '1',
        label: '温和提醒',
        message: '嘿，你现在有空吗？有一个小任务需要你的帮助 💪',
    },
    {
        id: '2',
        label: '时间提醒',
        message: '⏰ 离任务截止还有一点时间，我们一起完成它吧！',
    },
    {
        id: '3',
        label: '鼓励式',
        message: '我相信你可以的！就差这一步了，加油 ✨',
    },
    {
        id: '4',
        label: '询问式',
        message: '最近感觉怎么样？需要我帮你把任务拆得更小一些吗？',
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

    const handleSelectTemplate = (template: typeof REMINDER_TEMPLATES[0]) => {
        setSelectedTemplate(template.id);
        setCustomMessage(template.message);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                    {/* AI Avatar */}
                    <Animated.View style={[styles.avatarContainer, robotStyle]}>
                        <Text style={styles.avatar}>🤖</Text>
                    </Animated.View>

                    <Text style={styles.title}>AI 小助手</Text>
                    <Text style={styles.subtitle}>
                        让我来帮你温和地提醒 {executorName}
                    </Text>

                    {/* Template Options */}
                    <View style={styles.templatesContainer}>
                        <Text style={styles.sectionLabel}>选择提醒方式</Text>
                        <View style={styles.templates}>
                            {REMINDER_TEMPLATES.map((template) => (
                                <TouchableOpacity
                                    key={template.id}
                                    style={[
                                        styles.templateChip,
                                        selectedTemplate === template.id && styles.templateChipSelected
                                    ]}
                                    onPress={() => handleSelectTemplate(template)}
                                >
                                    <Text style={[
                                        styles.templateChipText,
                                        selectedTemplate === template.id && styles.templateChipTextSelected
                                    ]}>
                                        {template.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Custom Message */}
                    <View style={styles.messageContainer}>
                        <Text style={styles.sectionLabel}>提醒内容</Text>
                        <TextInput
                            style={styles.messageInput}
                            placeholder="输入或编辑提醒内容..."
                            placeholderTextColor={Colors.textMuted}
                            value={customMessage}
                            onChangeText={setCustomMessage}
                            multiline
                            maxLength={200}
                        />
                    </View>

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
                                (!customMessage.trim() || isSending) && styles.sendButtonDisabled
                            ]}
                            onPress={handleSend}
                            disabled={!customMessage.trim() || isSending}
                        >
                            <Text style={styles.sendButtonText}>
                                {isSending ? '发送中...' : '📤 发送提醒'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.note}>
                        💡 使用 AI 代替你发送提醒，避免直接冲突
                    </Text>
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
        marginBottom: Spacing.lg,
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
    },
    templateChipSelected: {
        backgroundColor: Colors.supporter.glow,
        borderColor: Colors.supporter.primary,
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
    messageInput: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        color: Colors.textPrimary,
        fontSize: FontSizes.md,
        minHeight: 80,
        textAlignVertical: 'top',
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
    },
});
