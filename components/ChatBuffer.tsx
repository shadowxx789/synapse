import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Modal,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeIn,
    FadeInUp,
    SlideInDown,
    SlideInUp,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';
import { useChatStore, ConflictPattern, Message, EmotionType, CommunicationTip } from '@/stores/chatStore';
import { useBadgeStore } from '@/stores/badgeStore';

interface ChatBufferProps {
    currentUserId?: string;
    currentUserName?: string;
}

export default function ChatBuffer({
    currentUserId = 'supporter',
    currentUserName = '支持者',
}: ChatBufferProps) {
    const {
        messages,
        addMessage,
        checkForConflict,
        getSuggestion,
        getAlternativeSuggestions,
        peacefulDays,
        communicationStats,
        communicationTips,
        currentMood,
        getWeeklyInsight,
        logEmotion,
        markTipCompleted,
        setCurrentMood,
    } = useChatStore();

    const { updateCommunicationScore } = useBadgeStore();

    const [inputText, setInputText] = useState('');
    const [showInterceptModal, setShowInterceptModal] = useState(false);
    const [interceptedPattern, setInterceptedPattern] = useState<ConflictPattern | null>(null);
    const [originalMessage, setOriginalMessage] = useState('');
    const [showTipsModal, setShowTipsModal] = useState(false);
    const [showInsightModal, setShowInsightModal] = useState(false);
    const [showMoodPicker, setShowMoodPicker] = useState(false);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);

    // Warning animation
    const shakeX = useSharedValue(0);

    const weeklyInsight = getWeeklyInsight();

    const handleSend = () => {
        if (!inputText.trim()) return;

        const conflictCheck = checkForConflict(inputText);

        if (conflictCheck.isConflict && conflictCheck.pattern) {
            // Intercept the message
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setOriginalMessage(inputText);
            setInterceptedPattern(conflictCheck.pattern);
            setSelectedSuggestionIndex(0);
            setShowInterceptModal(true);

            // Shake animation
            shakeX.value = withSequence(
                withTiming(-10, { duration: 50 }),
                withRepeat(withTiming(10, { duration: 100 }), 4, true),
                withTiming(0, { duration: 50 })
            );
        } else {
            // Send normally
            sendMessage(inputText);
        }
    };

    const sendMessage = (content: string, usedSuggestion = false) => {
        addMessage({
            senderId: currentUserId,
            senderName: currentUserName,
            content,
        });
        setInputText('');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (usedSuggestion) {
            updateCommunicationScore(1);
        }

        // Scroll to bottom
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const handleSendAnyway = () => {
        sendMessage(originalMessage);
        setShowInterceptModal(false);
        setInterceptedPattern(null);
        setOriginalMessage('');
    };

    const handleUseSuggestion = () => {
        if (interceptedPattern) {
            const alternatives = getAlternativeSuggestions(interceptedPattern);
            const suggestion = selectedSuggestionIndex === 0
                ? getSuggestion(interceptedPattern)
                : alternatives[selectedSuggestionIndex - 1];
            sendMessage(suggestion, true);
        }
        setShowInterceptModal(false);
        setInterceptedPattern(null);
        setOriginalMessage('');
    };

    const handleCancel = () => {
        setShowInterceptModal(false);
        setInterceptedPattern(null);
        setOriginalMessage('');
    };

    const handleMoodSelect = (mood: EmotionType) => {
        setCurrentMood(mood);
        logEmotion(mood);
        setShowMoodPicker(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const getMoodEmoji = (mood: EmotionType) => {
        const moodMap: Record<EmotionType, string> = {
            neutral: '😐',
            positive: '😊',
            negative: '😢',
            frustrated: '😤',
            supportive: '🤗',
            grateful: '🙏',
        };
        return moodMap[mood];
    };

    const inputStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shakeX.value }],
    }));

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case 'blame': return '🚨 责备语气';
            case 'accusation': return '⚠️ 指责语气';
            case 'criticism': return '😤 批评语气';
            case 'generalization': return '📢 以偏概全';
            default: return '⚠️ 冲突风险';
        }
    };

    const getSeverityColor = (severity: number) => {
        if (severity >= 3) return Colors.error;
        if (severity >= 2) return Colors.warning;
        return Colors.secondary;
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>💬 安全沟通</Text>
                    <Text style={styles.subtitle}>AI 帮你避免冲突性语言</Text>
                </View>
                <View style={styles.peaceBadge}>
                    <Text style={styles.peaceEmoji}>🕊️</Text>
                    <Text style={styles.peaceDays}>{peacefulDays}天</Text>
                </View>
            </View>

            {/* Messages */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
            >
                {messages.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>💌</Text>
                        <Text style={styles.emptyText}>开始温和的对话</Text>
                        <Text style={styles.emptyHint}>
                            AI 会帮你检测可能引发冲突的语言
                        </Text>
                    </View>
                ) : (
                    messages.map((msg, index) => (
                        <Animated.View
                            key={msg.id}
                            entering={FadeInUp.delay(index * 50)}
                            style={[
                                styles.messageBubble,
                                msg.senderId === currentUserId
                                    ? styles.myMessage
                                    : styles.theirMessage,
                                msg.wasIntercepted && styles.interceptedMessage,
                            ]}
                        >
                            <Text style={styles.senderName}>{msg.senderName}</Text>
                            <Text style={styles.messageText}>{msg.content}</Text>
                            {msg.wasIntercepted && (
                                <View style={styles.interceptedBadge}>
                                    <Text style={styles.interceptedText}>
                                        ✨ 已优化表达
                                    </Text>
                                </View>
                            )}
                            <Text style={styles.timestamp}>
                                {new Date(msg.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </Text>
                        </Animated.View>
                    ))
                )}
            </ScrollView>

            {/* Input */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <Animated.View style={[styles.inputContainer, inputStyle]}>
                    <TextInput
                        style={styles.input}
                        placeholder="输入消息..."
                        placeholderTextColor={Colors.textMuted}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            !inputText.trim() && styles.sendButtonDisabled
                        ]}
                        onPress={handleSend}
                        disabled={!inputText.trim()}
                    >
                        <Text style={styles.sendButtonText}>发送</Text>
                    </TouchableOpacity>
                </Animated.View>
            </KeyboardAvoidingView>

            {/* Intercept Modal */}
            <Modal
                visible={showInterceptModal}
                transparent
                animationType="fade"
                onRequestClose={handleCancel}
            >
                <View style={styles.modalOverlay}>
                    <Animated.View
                        entering={SlideInDown.springify()}
                        style={styles.interceptModal}
                    >
                        <View style={styles.warningHeader}>
                            <Text style={styles.warningIcon}>⚠️</Text>
                            <Text style={styles.warningTitle}>检测到冲突风险</Text>
                        </View>

                        {interceptedPattern && (
                            <View style={styles.categoryBadge}>
                                <Text style={styles.categoryText}>
                                    {getCategoryLabel(interceptedPattern.category)}
                                </Text>
                            </View>
                        )}

                        <View style={styles.originalMessageBox}>
                            <Text style={styles.boxLabel}>你的原话</Text>
                            <Text style={styles.originalText}>"{originalMessage}"</Text>
                        </View>

                        <View style={styles.suggestionBox}>
                            <Text style={styles.boxLabel}>💡 建议的表达方式</Text>
                            <Text style={styles.suggestionText}>
                                "{interceptedPattern ? getSuggestion(interceptedPattern) : ''}"
                            </Text>
                        </View>

                        <Text style={styles.explainText}>
                            使用"我"开头的表达可以减少对方的防御心理，更容易达成理解。
                        </Text>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.useSuggestionButton}
                                onPress={handleUseSuggestion}
                            >
                                <Text style={styles.useSuggestionText}>✨ 使用建议</Text>
                            </TouchableOpacity>

                            <View style={styles.secondaryActions}>
                                <TouchableOpacity
                                    style={styles.sendAnywayButton}
                                    onPress={handleSendAnyway}
                                >
                                    <Text style={styles.sendAnywayText}>仍然发送</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={handleCancel}
                                >
                                    <Text style={styles.cancelText}>取消</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.surfaceElevated,
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
    peaceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.success + '20',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        gap: Spacing.xs,
    },
    peaceEmoji: {
        fontSize: 16,
    },
    peaceDays: {
        fontSize: FontSizes.sm,
        color: Colors.success,
        fontWeight: '600',
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        padding: Spacing.md,
        paddingBottom: Spacing.lg,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xxl,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: Spacing.md,
    },
    emptyText: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
    },
    emptyHint: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        textAlign: 'center',
    },
    messageBubble: {
        maxWidth: '80%',
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.sm,
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: Colors.supporter.primary + '30',
        borderBottomRightRadius: 4,
    },
    theirMessage: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.surfaceElevated,
        borderBottomLeftRadius: 4,
    },
    interceptedMessage: {
        borderWidth: 1,
        borderColor: Colors.success + '50',
    },
    senderName: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        marginBottom: Spacing.xs,
    },
    messageText: {
        fontSize: FontSizes.md,
        color: Colors.textPrimary,
        lineHeight: FontSizes.md * 1.4,
    },
    interceptedBadge: {
        marginTop: Spacing.xs,
    },
    interceptedText: {
        fontSize: FontSizes.xs,
        color: Colors.success,
    },
    timestamp: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        marginTop: Spacing.xs,
        alignSelf: 'flex-end',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.surfaceElevated,
        gap: Spacing.sm,
    },
    input: {
        flex: 1,
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        color: Colors.textPrimary,
        fontSize: FontSizes.md,
        maxHeight: 100,
    },
    sendButton: {
        backgroundColor: Colors.supporter.primary,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: Colors.surfaceElevated,
    },
    sendButtonText: {
        color: '#FFF',
        fontSize: FontSizes.md,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    interceptModal: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        width: '100%',
        maxWidth: 400,
    },
    warningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
        gap: Spacing.sm,
    },
    warningIcon: {
        fontSize: 32,
    },
    warningTitle: {
        fontSize: FontSizes.xl,
        fontWeight: '700',
        color: Colors.warning,
    },
    categoryBadge: {
        alignSelf: 'center',
        backgroundColor: Colors.warning + '20',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        marginBottom: Spacing.lg,
    },
    categoryText: {
        fontSize: FontSizes.sm,
        color: Colors.warning,
        fontWeight: '600',
    },
    originalMessageBox: {
        backgroundColor: Colors.error + '10',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: Colors.error,
    },
    boxLabel: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        marginBottom: Spacing.xs,
    },
    originalText: {
        fontSize: FontSizes.md,
        color: Colors.textPrimary,
        fontStyle: 'italic',
    },
    suggestionBox: {
        backgroundColor: Colors.success + '10',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: Colors.success,
    },
    suggestionText: {
        fontSize: FontSizes.md,
        color: Colors.textPrimary,
    },
    explainText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.lg,
        lineHeight: FontSizes.sm * 1.5,
    },
    modalActions: {
        gap: Spacing.md,
    },
    useSuggestionButton: {
        backgroundColor: Colors.success,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    useSuggestionText: {
        color: '#FFF',
        fontSize: FontSizes.md,
        fontWeight: '700',
    },
    secondaryActions: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    sendAnywayButton: {
        flex: 1,
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    sendAnywayText: {
        color: Colors.textMuted,
        fontSize: FontSizes.sm,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    cancelText: {
        color: Colors.textMuted,
        fontSize: FontSizes.sm,
    },
});
