import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Platform,
    ScrollView,
    useWindowDimensions,
    TextInput,
    ActivityIndicator,
    Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';
import { useUserStore } from '@/stores/userStore';
import { userService } from '@/services/backend';

const MAX_CONTENT_WIDTH = 480;
const PAIRING_CODE_LENGTH = 6;

export default function PairScreen() {
    const [mode, setMode] = useState<'display' | 'input'>('display');
    const [myCode, setMyCode] = useState<string>('');
    const [inputCode, setInputCode] = useState<string[]>(Array(PAIRING_CODE_LENGTH).fill(''));
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingCode, setIsGeneratingCode] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const inputRefs = useRef<(TextInput | null)[]>([]);
    const router = useRouter();
    const { user, updateUser, setCoupleId, setCoupleSecret } = useUserStore();
    const { width: windowWidth } = useWindowDimensions();
    const contentWidth = Math.min(windowWidth, MAX_CONTENT_WIDTH);

    // Generate pairing code when user is loaded
    useEffect(() => {
        if (user?.id && !myCode) {
            generatePairingCode();
        }
    }, [user?.id]);

    const generatePairingCode = async () => {
        if (!user?.id) {
            setIsGeneratingCode(false);
            return;
        }

        setIsGeneratingCode(true);
        try {
            const code = userService.generatePairingCode();
            // 添加过期时间
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            await userService.update(user.id, {
                pairingCode: code,
                pairingCodeExpiresAt: expiresAt
            });
            setMyCode(code);
            updateUser({ pairingCode: code });
        } catch (err) {
            setError('生成配对码失败，请重试');
        } finally {
            setIsGeneratingCode(false);
        }
    };

    const handleCopyCode = async () => {
        if (!myCode) return;

        await Clipboard.setStringAsync(myCode);
        setCopied(true);

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        setTimeout(() => setCopied(false), 2000);
    };

    const handleShareCode = async () => {
        if (!myCode) return;

        try {
            await Share.share({
                message: `我的同频配对码是: ${myCode}\n\n下载同频App连接我们吧！`,
            });
        } catch {
            // User cancelled share
        }
    };

    const handleCodeInput = (value: string, index: number) => {
        const sanitizedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

        if (sanitizedValue.length <= 1) {
            const newCode = [...inputCode];
            newCode[index] = sanitizedValue;
            setInputCode(newCode);
            setError(null);

            // Auto-advance to next input
            if (sanitizedValue && index < PAIRING_CODE_LENGTH - 1) {
                inputRefs.current[index + 1]?.focus();
            }
        } else if (sanitizedValue.length === PAIRING_CODE_LENGTH) {
            // Pasted full code
            const newCode = sanitizedValue.split('');
            setInputCode(newCode);
            inputRefs.current[PAIRING_CODE_LENGTH - 1]?.focus();
        }
    };

    const handleKeyPress = (e: { nativeEvent: { key: string } }, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !inputCode[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleConnect = async () => {
        const code = inputCode.join('');

        if (code.length !== PAIRING_CODE_LENGTH) {
            setError('请输入完整的6位配对码');
            return;
        }

        if (code === myCode) {
            setError('不能使用自己的配对码');
            return;
        }

        setError(null);
        setIsLoading(true);

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        try {
            // Find partner by pairing code
            const partner = await userService.findByPairingCode(code);

            if (!partner) {
                setError('配对码无效或已过期');
                setIsLoading(false);
                return;
            }

            if (partner.id === user?.id) {
                setError('不能与自己配对');
                setIsLoading(false);
                return;
            }

            // Check role compatibility
            if (partner.role === user?.role) {
                setError(`对方也是${user?.role === 'executor' ? '执行者' : '支持者'}，需要一个执行者和一个支持者配对`);
                setIsLoading(false);
                return;
            }

            // Pair with partner
            const success = await userService.pairWithPartner(user!.id, code);

            if (success) {
                // Generate couple ID
                const coupleId = [user!.id, partner.id].sort().join('_');

                // Update local state
                updateUser({
                    partnerId: partner.id,
                    coupleId: coupleId,
                });
                setCoupleId(coupleId);

                // Generate and store couple secret (for encryption)
                // In a real app, this would be done via secure key exchange
                const secret = generateCoupleSecret();
                setCoupleSecret(secret);

                if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }

                // Navigate to main app
                const route = user?.role === 'executor' ? '/(executor)' : '/(supporter)';
                router.replace(route);
            } else {
                setError('配对失败，请重试');
            }
        } catch (err) {
            setError('配对出错，请检查网络后重试');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSkip = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        // Allow user to skip pairing for now
        const route = user?.role === 'executor' ? '/(executor)' : '/(supporter)';
        router.replace(route);
    };

    // Simple secret generation (in production, use proper key exchange)
    const generateCoupleSecret = (): string => {
        const array = new Uint8Array(32);
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            crypto.getRandomValues(array);
        } else {
            // Fallback for environments without crypto
            for (let i = 0; i < 32; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
        }
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    };

    // 用户信息未加载时显示加载状态
    if (!user) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={{ color: Colors.textSecondary, marginTop: 16 }}>
                        加载中...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={[styles.content, { width: contentWidth }]}>
                    {/* Header */}
                    <Animated.View
                        entering={FadeInDown.delay(200).springify()}
                        style={styles.header}
                    >
                        <MaterialCommunityIcons name="link-variant" size={56} color={Colors.primary} style={styles.emoji} />
                        <Text style={styles.title}>连接伴侣</Text>
                        <Text style={styles.subtitle}>
                            {user?.role === 'executor'
                                ? '让你的支持者扫描配对码，开始同频之旅'
                                : '输入执行者的配对码，开始同频之旅'}
                        </Text>
                    </Animated.View>

                    {/* Mode Toggle */}
                    <Animated.View entering={FadeInUp.delay(300)} style={styles.toggleContainer}>
                        <TouchableOpacity
                            style={[styles.toggleButton, mode === 'display' && styles.toggleButtonActive]}
                            onPress={() => setMode('display')}
                        >
                            <Text style={[styles.toggleText, mode === 'display' && styles.toggleTextActive]}>
                                我的配对码
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleButton, mode === 'input' && styles.toggleButtonActive]}
                            onPress={() => setMode('input')}
                        >
                            <Text style={[styles.toggleText, mode === 'input' && styles.toggleTextActive]}>
                                输入配对码
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Display Mode - Show My Code */}
                    {mode === 'display' && (
                        <Animated.View entering={FadeIn.delay(100)} style={styles.codeSection}>
                            <View style={styles.codeCard}>
                                {isGeneratingCode ? (
                                    <ActivityIndicator size="large" color={Colors.primary} />
                                ) : (
                                    <>
                                        <View style={styles.codeDisplay}>
                                            {myCode.split('').map((char, index) => (
                                                <View key={index} style={styles.codeChar}>
                                                    <Text style={styles.codeCharText}>{char}</Text>
                                                </View>
                                            ))}
                                        </View>
                                        <Text style={styles.codeHint}>24小时内有效</Text>
                                    </>
                                )}
                            </View>

                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={handleCopyCode}
                                    disabled={isGeneratingCode}
                                >
                                    <MaterialCommunityIcons
                                        name={copied ? 'check' : 'content-copy'}
                                        size={24}
                                        color={Colors.textSecondary}
                                        style={styles.actionIcon}
                                    />
                                    <Text style={styles.actionText}>{copied ? '已复制' : '复制'}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={handleShareCode}
                                    disabled={isGeneratingCode}
                                >
                                    <MaterialCommunityIcons
                                        name="share-variant"
                                        size={24}
                                        color={Colors.textSecondary}
                                        style={styles.actionIcon}
                                    />
                                    <Text style={styles.actionText}>分享</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={generatePairingCode}
                                    disabled={isGeneratingCode}
                                >
                                    <MaterialCommunityIcons
                                        name="refresh"
                                        size={24}
                                        color={Colors.textSecondary}
                                        style={styles.actionIcon}
                                    />
                                    <Text style={styles.actionText}>刷新</Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    )}

                    {/* Input Mode - Enter Partner's Code */}
                    {mode === 'input' && (
                        <Animated.View entering={FadeIn.delay(100)} style={styles.codeSection}>
                            <Text style={styles.inputLabel}>输入对方的配对码</Text>

                            <View style={styles.codeInputContainer}>
                                {inputCode.map((char, index) => (
                                    <TextInput
                                        key={index}
                                        ref={(ref) => {
                                            inputRefs.current[index] = ref;
                                        }}
                                        style={[
                                            styles.codeInput,
                                            char && styles.codeInputFilled,
                                            error && styles.codeInputError,
                                        ]}
                                        value={char}
                                        onChangeText={(value) => handleCodeInput(value, index)}
                                        onKeyPress={(e) => handleKeyPress(e, index)}
                                        maxLength={index === 0 ? PAIRING_CODE_LENGTH : 1}
                                        autoCapitalize="characters"
                                        autoCorrect={false}
                                        keyboardType="default"
                                        editable={!isLoading}
                                    />
                                ))}
                            </View>

                            {/* Error Message */}
                            {error && (
                                <Animated.View entering={FadeIn.duration(200)}>
                                    <Text style={styles.errorText}>{error}</Text>
                                </Animated.View>
                            )}

                            {/* Connect Button */}
                            <TouchableOpacity
                                style={[styles.connectButton, isLoading && styles.connectButtonDisabled]}
                                onPress={handleConnect}
                                disabled={isLoading || inputCode.join('').length !== PAIRING_CODE_LENGTH}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={
                                        isLoading
                                            ? [Colors.surfaceElevated, Colors.surfaceElevated]
                                            : [Colors.primary, '#FF8C61']
                                    }
                                    style={styles.buttonGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color={Colors.textMuted} />
                                    ) : (
                                        <Text style={styles.buttonText}>
                                            <MaterialCommunityIcons name="link-variant" size={FontSizes.lg} color="#FFF" /> 连接
                                        </Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {/* Skip Button */}
                    <Animated.View entering={FadeInUp.delay(500)} style={styles.footer}>
                        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                            <Text style={styles.skipText}>稍后配对 →</Text>
                        </TouchableOpacity>
                        <Text style={styles.skipHint}>
                            你可以稍后在设置中配对伴侣
                        </Text>
                    </Animated.View>
                </View>
            </ScrollView>
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
    header: {
        alignItems: 'center',
        paddingTop: Spacing.xxl,
        paddingBottom: Spacing.lg,
    },
    emoji: {
        fontSize: 56,
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: FontSizes.xxl,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    subtitle: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: FontSizes.md * 1.5,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xs,
        marginBottom: Spacing.xl,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    toggleButtonActive: {
        backgroundColor: Colors.primary,
    },
    toggleText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    toggleTextActive: {
        color: '#FFF',
    },
    codeSection: {
        flex: 1,
    },
    codeCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        alignItems: 'center',
        minHeight: 140,
        justifyContent: 'center',
    },
    codeDisplay: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    codeChar: {
        width: 44,
        height: 56,
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    codeCharText: {
        fontSize: FontSizes.xl,
        fontWeight: '700',
        color: Colors.primary,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    codeHint: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        marginTop: Spacing.md,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.lg,
        marginTop: Spacing.lg,
    },
    actionButton: {
        alignItems: 'center',
        padding: Spacing.md,
    },
    actionIcon: {
        fontSize: 24,
        marginBottom: Spacing.xs,
    },
    actionText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    inputLabel: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.md,
        textAlign: 'center',
    },
    codeInputContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    codeInput: {
        width: 44,
        height: 56,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 2,
        borderColor: Colors.surfaceElevated,
        textAlign: 'center',
        fontSize: FontSizes.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    codeInputFilled: {
        borderColor: Colors.primary,
    },
    codeInputError: {
        borderColor: Colors.error,
    },
    errorText: {
        color: Colors.error,
        fontSize: FontSizes.sm,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    connectButton: {
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        marginTop: Spacing.md,
        ...Platform.select({
            web: { boxShadow: '0px 4px 8px rgba(255, 107, 53, 0.4)' },
            default: {
                shadowColor: 'rgba(255, 107, 53, 0.4)',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
                elevation: 6,
            },
        }),
    },
    connectButtonDisabled: {
        ...Platform.select({
            web: { boxShadow: 'none' },
            default: {
                shadowColor: 'transparent',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0,
                shadowRadius: 0,
                elevation: 0,
            },
        }),
    },
    buttonGradient: {
        paddingVertical: Spacing.lg,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: FontSizes.lg,
        fontWeight: '700',
    },
    footer: {
        paddingVertical: Spacing.xl,
        alignItems: 'center',
    },
    skipButton: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
    skipText: {
        color: Colors.textSecondary,
        fontSize: FontSizes.md,
    },
    skipHint: {
        color: Colors.textMuted,
        fontSize: FontSizes.xs,
        marginTop: Spacing.xs,
    },
});
