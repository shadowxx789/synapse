import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
    ActivityIndicator,
    Share,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';
import { usePartnerPairing } from '@/hooks/useFirestore';
import { useUserStore } from '@/stores/userStore';

interface PartnerPairingProps {
    isVisible: boolean;
    onClose: () => void;
    onPaired: () => void;
}

export default function PartnerPairing({ isVisible, onClose, onPaired }: PartnerPairingProps) {
    const { user, setPairingCode, setPartnerId } = useUserStore();
    const { pairingCode, loading, error, generateCode, pairWithCode } = usePartnerPairing(user?.id || null);

    const [mode, setMode] = useState<'choose' | 'generate' | 'enter'>('choose');
    const [inputCode, setInputCode] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    const handleGenerateCode = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setMode('generate');
        const code = await generateCode();
        if (code) {
            setPairingCode(code);
        }
    };

    const handleShareCode = async () => {
        if (!pairingCode) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await Share.share({
                message: `加入我的 Synapse 伴侣链接！配对码: ${pairingCode}`,
            });
        } catch (e) {
            console.error('Share failed:', e);
        }
    };

    const handleEnterCode = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setMode('enter');
        setInputCode('');
        setLocalError(null);
    };

    const handleSubmitCode = async () => {
        if (inputCode.length !== 6) {
            setLocalError('配对码应为6位');
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const success = await pairWithCode(inputCode.toUpperCase());

        if (success) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onPaired();
            onClose();
        } else {
            setLocalError(error || '配对失败');
        }
    };

    const handleClose = () => {
        setMode('choose');
        setInputCode('');
        setLocalError(null);
        onClose();
    };

    if (!isVisible) return null;

    return (
        <Modal
            visible={isVisible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <Animated.View
                    entering={SlideInDown.springify()}
                    style={styles.container}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>👫 配对伴侣</Text>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {mode === 'choose' && (
                        <Animated.View entering={FadeIn} style={styles.content}>
                            <Text style={styles.description}>
                                与你的伴侣配对，开始一起使用 Synapse
                            </Text>

                            <TouchableOpacity
                                style={styles.optionCard}
                                onPress={handleGenerateCode}
                            >
                                <Text style={styles.optionIcon}>🔗</Text>
                                <View style={styles.optionContent}>
                                    <Text style={styles.optionTitle}>生成配对码</Text>
                                    <Text style={styles.optionDesc}>
                                        让伴侣输入你的配对码
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.optionCard}
                                onPress={handleEnterCode}
                            >
                                <Text style={styles.optionIcon}>✏️</Text>
                                <View style={styles.optionContent}>
                                    <Text style={styles.optionTitle}>输入配对码</Text>
                                    <Text style={styles.optionDesc}>
                                        输入伴侣分享的配对码
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {mode === 'generate' && (
                        <Animated.View entering={FadeIn} style={styles.content}>
                            <Text style={styles.description}>
                                将此配对码分享给你的伴侣
                            </Text>

                            {loading ? (
                                <ActivityIndicator size="large" color={Colors.primary} />
                            ) : (
                                <>
                                    <View style={styles.codeDisplay}>
                                        <Text style={styles.codeText}>
                                            {pairingCode || user?.pairingCode || '------'}
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.shareButton}
                                        onPress={handleShareCode}
                                    >
                                        <Text style={styles.shareButtonText}>📤 分享配对码</Text>
                                    </TouchableOpacity>

                                    <Text style={styles.hint}>
                                        配对码有效期 24 小时
                                    </Text>
                                </>
                            )}

                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => setMode('choose')}
                            >
                                <Text style={styles.backButtonText}>← 返回</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {mode === 'enter' && (
                        <Animated.View entering={FadeIn} style={styles.content}>
                            <Text style={styles.description}>
                                输入伴侣分享的 6 位配对码
                            </Text>

                            <TextInput
                                style={styles.codeInput}
                                value={inputCode}
                                onChangeText={(text) => {
                                    setInputCode(text.toUpperCase());
                                    setLocalError(null);
                                }}
                                placeholder="XXXXXX"
                                placeholderTextColor={Colors.textMuted}
                                maxLength={6}
                                autoCapitalize="characters"
                                autoFocus
                            />

                            {(localError || error) && (
                                <Text style={styles.errorText}>{localError || error}</Text>
                            )}

                            <TouchableOpacity
                                style={[
                                    styles.submitButton,
                                    inputCode.length !== 6 && styles.submitButtonDisabled,
                                ]}
                                onPress={handleSubmitCode}
                                disabled={inputCode.length !== 6 || loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.submitButtonText}>确认配对</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => setMode('choose')}
                            >
                                <Text style={styles.backButtonText}>← 返回</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    title: {
        fontSize: FontSizes.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeText: {
        fontSize: 16,
        color: Colors.textMuted,
    },
    content: {
        alignItems: 'center',
    },
    description: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.xl,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        width: '100%',
    },
    optionIcon: {
        fontSize: 32,
        marginRight: Spacing.md,
    },
    optionContent: {
        flex: 1,
    },
    optionTitle: {
        fontSize: FontSizes.lg,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
    },
    optionDesc: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    codeDisplay: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xxl,
        marginBottom: Spacing.lg,
    },
    codeText: {
        fontSize: FontSizes.hero,
        fontWeight: '700',
        color: Colors.primary,
        letterSpacing: 8,
    },
    shareButton: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        marginBottom: Spacing.md,
    },
    shareButtonText: {
        fontSize: FontSizes.md,
        fontWeight: '600',
        color: '#FFF',
    },
    hint: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        marginBottom: Spacing.lg,
    },
    codeInput: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xl,
        fontSize: FontSizes.xxl,
        fontWeight: '700',
        color: Colors.textPrimary,
        textAlign: 'center',
        letterSpacing: 8,
        width: '100%',
        marginBottom: Spacing.md,
    },
    errorText: {
        fontSize: FontSizes.sm,
        color: Colors.error,
        marginBottom: Spacing.md,
    },
    submitButton: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xxl,
        marginBottom: Spacing.md,
        minWidth: 150,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        backgroundColor: Colors.surfaceElevated,
    },
    submitButtonText: {
        fontSize: FontSizes.md,
        fontWeight: '600',
        color: '#FFF',
    },
    backButton: {
        padding: Spacing.md,
    },
    backButtonText: {
        fontSize: FontSizes.md,
        color: Colors.textMuted,
    },
});
