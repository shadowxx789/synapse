import React, { useState, useRef } from 'react';
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
    ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeInUp,
    SlideInDown,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';
import { useChatStore } from '@/stores/chatStore';
import { useBadgeStore } from '@/stores/badgeStore';
import { generateSafeCommunicationOptions, SafeCommunicationOption } from '@/services/ai';

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
        peacefulDays,
    } = useChatStore();

    const { updateCommunicationScore } = useBadgeStore();

    const [inputText, setInputText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const [communicationOptions, setCommunicationOptions] = useState<SafeCommunicationOption[]>([]);
    const [originalMessage, setOriginalMessage] = useState('');
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    // Animation for input shake
    const shakeX = useSharedValue(0);

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const messageToProcess = inputText.trim();
        setOriginalMessage(messageToProcess);
        setInputText('');
        setIsGenerating(true);

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        try {
            const result = await generateSafeCommunicationOptions(messageToProcess);

            if (result.success && result.options.length > 0) {
                setCommunicationOptions(result.options);
                setSelectedOptionIndex(null);
                setShowOptionsModal(true);
            } else {
                // If generation fails, send original message
                sendMessage(messageToProcess, false);
            }
        } catch (error) {
            console.error('Failed to generate options:', error);
            sendMessage(messageToProcess, false);
        } finally {
            setIsGenerating(false);
        }
    };

    const sendMessage = (content: string, usedSuggestion = false) => {
        addMessage({
            senderId: currentUserId,
            senderName: currentUserName,
            content,
        });

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        if (usedSuggestion) {
            updateCommunicationScore(1);
        }

        // Scroll to bottom
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const handleSelectOption = (index: number) => {
        setSelectedOptionIndex(index);
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const handleConfirmSelection = () => {
        if (selectedOptionIndex !== null && communicationOptions[selectedOptionIndex]) {
            sendMessage(communicationOptions[selectedOptionIndex].text, true);
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        }
        closeModal();
    };

    const handleSendOriginal = () => {
        sendMessage(originalMessage, false);
        closeModal();
    };

    const closeModal = () => {
        setShowOptionsModal(false);
        setCommunicationOptions([]);
        setOriginalMessage('');
        setSelectedOptionIndex(null);
    };

    const inputStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shakeX.value }],
    }));

    const getStyleEmoji = (style: string) => {
        if (style.includes('询问') || style.includes('温和')) return '💭';
        if (style.includes('共情') || style.includes('理解')) return '💝';
        if (style.includes('合作') || style.includes('积极')) return '🤝';
        return '✨';
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>💬 安全沟通</Text>
                    <Text style={styles.subtitle}>AI 帮你优化表达方式</Text>
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
                        <Text style={styles.emptyText}>开始安全沟通</Text>
                        <Text style={styles.emptyHint}>
                            输入你想说的话，AI 会帮你生成{'\n'}三个更温和的表达方式供你选择
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
                                msg.wasIntercepted && styles.optimizedMessage,
                            ]}
                        >
                            <Text style={styles.senderName}>{msg.senderName}</Text>
                            <Text style={styles.messageText}>{msg.content}</Text>
                            {msg.wasIntercepted && (
                                <View style={styles.optimizedBadge}>
                                    <Text style={styles.optimizedText}>
                                        ✨ 优化表达
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
                        placeholder="输入你想表达的话..."
                        placeholderTextColor={Colors.textMuted}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={500}
                        editable={!isGenerating}
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            (!inputText.trim() || isGenerating) && styles.sendButtonDisabled
                        ]}
                        onPress={handleSend}
                        disabled={!inputText.trim() || isGenerating}
                    >
                        {isGenerating ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Text style={styles.sendButtonText}>优化</Text>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </KeyboardAvoidingView>

            {/* Options Selection Modal */}
            <Modal
                visible={showOptionsModal}
                transparent
                animationType="fade"
                onRequestClose={closeModal}
            >
                <View style={styles.modalOverlay}>
                    <Animated.View
                        entering={SlideInDown.springify()}
                        style={styles.optionsModal}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalIcon}>✨</Text>
                            <Text style={styles.modalTitle}>选择表达方式</Text>
                        </View>

                        <View style={styles.originalBox}>
                            <Text style={styles.boxLabel}>你想说的</Text>
                            <Text style={styles.originalText}>"{originalMessage}"</Text>
                        </View>

                        <Text style={styles.optionsLabel}>AI 优化的三个版本：</Text>

                        <View style={styles.optionsContainer}>
                            {communicationOptions.map((option, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.optionCard,
                                        selectedOptionIndex === index && styles.optionCardSelected,
                                    ]}
                                    onPress={() => handleSelectOption(index)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.optionHeader}>
                                        <Text style={styles.optionEmoji}>
                                            {getStyleEmoji(option.style)}
                                        </Text>
                                        <Text style={[
                                            styles.optionStyle,
                                            selectedOptionIndex === index && styles.optionStyleSelected,
                                        ]}>
                                            {option.style}
                                        </Text>
                                        {selectedOptionIndex === index && (
                                            <Text style={styles.checkMark}>✓</Text>
                                        )}
                                    </View>
                                    <Text style={[
                                        styles.optionText,
                                        selectedOptionIndex === index && styles.optionTextSelected,
                                    ]}>
                                        "{option.text}"
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[
                                    styles.confirmButton,
                                    selectedOptionIndex === null && styles.confirmButtonDisabled,
                                ]}
                                onPress={handleConfirmSelection}
                                disabled={selectedOptionIndex === null}
                            >
                                <Text style={styles.confirmButtonText}>
                                    发送选中的表达
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.secondaryActions}>
                                <TouchableOpacity
                                    style={styles.sendOriginalButton}
                                    onPress={handleSendOriginal}
                                >
                                    <Text style={styles.sendOriginalText}>发送原话</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={closeModal}
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
        lineHeight: FontSizes.sm * 1.5,
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
    optimizedMessage: {
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
    optimizedBadge: {
        marginTop: Spacing.xs,
    },
    optimizedText: {
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
        minWidth: 60,
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
    optionsModal: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        width: '100%',
        maxWidth: 420,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
        gap: Spacing.sm,
    },
    modalIcon: {
        fontSize: 28,
    },
    modalTitle: {
        fontSize: FontSizes.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    originalBox: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    boxLabel: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        marginBottom: Spacing.xs,
    },
    originalText: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        fontStyle: 'italic',
    },
    optionsLabel: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.md,
    },
    optionsContainer: {
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    optionCard: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    optionCardSelected: {
        borderColor: Colors.success,
        backgroundColor: Colors.success + '10',
    },
    optionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xs,
        gap: Spacing.xs,
    },
    optionEmoji: {
        fontSize: 18,
    },
    optionStyle: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.textSecondary,
        flex: 1,
    },
    optionStyleSelected: {
        color: Colors.success,
    },
    checkMark: {
        fontSize: FontSizes.md,
        color: Colors.success,
        fontWeight: '700',
    },
    optionText: {
        fontSize: FontSizes.md,
        color: Colors.textPrimary,
        lineHeight: FontSizes.md * 1.4,
    },
    optionTextSelected: {
        color: Colors.textPrimary,
    },
    modalActions: {
        gap: Spacing.md,
    },
    confirmButton: {
        backgroundColor: Colors.success,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    confirmButtonDisabled: {
        backgroundColor: Colors.surfaceElevated,
    },
    confirmButtonText: {
        color: '#FFF',
        fontSize: FontSizes.md,
        fontWeight: '700',
    },
    secondaryActions: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    sendOriginalButton: {
        flex: 1,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
    },
    sendOriginalText: {
        color: Colors.textSecondary,
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
