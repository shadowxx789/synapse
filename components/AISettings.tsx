import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Modal,
    Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';
import {
    useAISettingsStore,
    AI_PROVIDERS,
} from '@/stores/aiSettingsStore';
import { shredTask } from '@/services/ai';

interface AISettingsProps {
    isVisible: boolean;
    onClose: () => void;
}

export default function AISettings({ isVisible, onClose }: AISettingsProps) {
    const {
        providerId,
        apiKey,
        customBaseUrl,
        customModel,
        taskShredPrompt,
        reminderPrompt,
        setProvider,
        setApiKey,
        setCustomBaseUrl,
        setCustomModel,
        setTaskShredPrompt,
        setReminderPrompt,
        resetTaskShredPromptToDefault,
        resetReminderPromptToDefault,
    } = useAISettingsStore();

    const [showApiKey, setShowApiKey] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

    const selectedProvider = AI_PROVIDERS.find(p => p.id === providerId);

    const handleProviderChange = (id: string) => {
        setProvider(id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleTestAPI = async () => {
        if (!apiKey) {
            Alert.alert('提示', '请先输入 API Key');
            return;
        }

        setIsTesting(true);
        setTestResult(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const result = await shredTask('测试任务：整理桌面');
            if (result.subtasks.length > 0) {
                setTestResult('success');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                setTestResult('error');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
        } catch (error) {
            setTestResult('error');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsTesting(false);
        }
    };

    const handleResetPrompt = () => {
        Alert.alert(
            '重置提示词',
            '确定要恢复默认任务拆解提示词吗？',
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '确定',
                    onPress: () => {
                        resetTaskShredPromptToDefault();
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    },
                },
            ]
        );
    };

    const handleResetReminderPrompt = () => {
        Alert.alert(
            '重置提示词',
            '确定要恢复默认提醒消息提示词吗？',
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '确定',
                    onPress: () => {
                        resetReminderPromptToDefault();
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    },
                },
            ]
        );
    };

    const handleSave = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
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
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.title}>🤖 AI 设置</Text>
                            <Text style={styles.subtitle}>
                                配置 AI API 用于智能拆解任务
                            </Text>
                        </View>

                        {/* Provider Selection */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>API 服务商</Text>
                            <View style={styles.providerGrid}>
                                {AI_PROVIDERS.map((provider) => (
                                    <TouchableOpacity
                                        key={provider.id}
                                        style={[
                                            styles.providerCard,
                                            providerId === provider.id && styles.providerCardSelected,
                                        ]}
                                        onPress={() => handleProviderChange(provider.id)}
                                    >
                                        <Text style={[
                                            styles.providerName,
                                            providerId === provider.id && styles.providerNameSelected,
                                        ]}>
                                            {provider.name}
                                        </Text>
                                        {provider.id !== 'custom' && (
                                            <Text style={styles.providerModel}>
                                                {provider.defaultModel}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* API Key */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>API Key</Text>
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={[styles.input, styles.inputFlex]}
                                    placeholder="输入你的 API Key"
                                    placeholderTextColor={Colors.textMuted}
                                    value={apiKey}
                                    onChangeText={setApiKey}
                                    secureTextEntry={!showApiKey}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <TouchableOpacity
                                    style={styles.toggleButton}
                                    onPress={() => setShowApiKey(!showApiKey)}
                                >
                                    <Text style={styles.toggleButtonText}>
                                        {showApiKey ? '🙈' : '👁️'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Custom API Settings */}
                        {providerId === 'custom' && (
                            <Animated.View entering={FadeIn} style={styles.section}>
                                <Text style={styles.sectionTitle}>自定义 API 地址</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="https://api.example.com/v1"
                                    placeholderTextColor={Colors.textMuted}
                                    value={customBaseUrl}
                                    onChangeText={setCustomBaseUrl}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="url"
                                />
                            </Animated.View>
                        )}

                        {/* Model Override */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                模型名称 {selectedProvider?.defaultModel && `(默认: ${selectedProvider.defaultModel})`}
                            </Text>
                            <TextInput
                                style={styles.input}
                                placeholder={selectedProvider?.defaultModel || "gpt-4o-mini"}
                                placeholderTextColor={Colors.textMuted}
                                value={customModel}
                                onChangeText={setCustomModel}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        {/* Test Connection */}
                        <View style={styles.section}>
                            <TouchableOpacity
                                style={[
                                    styles.testButton,
                                    isTesting && styles.testButtonLoading,
                                    testResult === 'success' && styles.testButtonSuccess,
                                    testResult === 'error' && styles.testButtonError,
                                ]}
                                onPress={handleTestAPI}
                                disabled={isTesting}
                            >
                                <Text style={styles.testButtonText}>
                                    {isTesting
                                        ? '🔄 测试中...'
                                        : testResult === 'success'
                                            ? '✅ 连接成功'
                                            : testResult === 'error'
                                                ? '❌ 连接失败'
                                                : '🧪 测试连接'
                                    }
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Custom Prompt */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>任务拆解提示词</Text>
                                <TouchableOpacity onPress={handleResetPrompt}>
                                    <Text style={styles.resetButton}>恢复默认</Text>
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                style={[styles.input, styles.promptInput]}
                                placeholder="自定义 AI 拆解任务的提示词..."
                                placeholderTextColor={Colors.textMuted}
                                value={taskShredPrompt}
                                onChangeText={setTaskShredPrompt}
                                multiline
                                textAlignVertical="top"
                            />
                            <Text style={styles.promptHint}>
                                💡 提示词决定了 AI 如何拆解任务。建议保留 JSON 输出格式要求。
                            </Text>
                        </View>

                        {/* Reminder Prompt */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>提醒消息提示词</Text>
                                <TouchableOpacity onPress={handleResetReminderPrompt}>
                                    <Text style={styles.resetButton}>恢复默认</Text>
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                style={[styles.input, styles.promptInput]}
                                placeholder="自定义 AI 生成温和提醒的提示词..."
                                placeholderTextColor={Colors.textMuted}
                                value={reminderPrompt}
                                onChangeText={setReminderPrompt}
                                multiline
                                textAlignVertical="top"
                            />
                            <Text style={styles.promptHint}>
                                💡 这个提示词用于"AI 代替催促"功能，生成温和、支持性的提醒消息。
                            </Text>
                        </View>

                        {/* Actions */}
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={onClose}
                            >
                                <Text style={styles.cancelButtonText}>取消</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleSave}
                            >
                                <Text style={styles.saveButtonText}>💾 保存设置</Text>
                            </TouchableOpacity>
                        </View>
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
        maxHeight: '90%',
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    title: {
        fontSize: FontSizes.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    subtitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },
    section: {
        marginBottom: Spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    sectionTitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    providerGrid: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    providerCard: {
        flex: 1,
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    providerCardSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primaryGlow,
    },
    providerName: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    providerNameSelected: {
        color: Colors.primary,
    },
    providerModel: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        marginTop: Spacing.xs,
    },
    inputRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    input: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        color: Colors.textPrimary,
        fontSize: FontSizes.md,
    },
    inputFlex: {
        flex: 1,
    },
    toggleButton: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
        width: 50,
    },
    toggleButtonText: {
        fontSize: FontSizes.lg,
    },
    testButton: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.textMuted,
    },
    testButtonLoading: {
        borderColor: Colors.warning,
    },
    testButtonSuccess: {
        borderColor: Colors.success,
        backgroundColor: 'rgba(46, 204, 113, 0.1)',
    },
    testButtonError: {
        borderColor: Colors.error,
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
    },
    testButtonText: {
        fontSize: FontSizes.md,
        color: Colors.textPrimary,
        fontWeight: '600',
    },
    promptInput: {
        minHeight: 150,
        textAlignVertical: 'top',
    },
    promptHint: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        marginTop: Spacing.sm,
    },
    resetButton: {
        fontSize: FontSizes.sm,
        color: Colors.primary,
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.md,
        paddingBottom: Spacing.lg,
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
    saveButton: {
        flex: 2,
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: FontSizes.md,
        fontWeight: '700',
    },
});
