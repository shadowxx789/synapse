import React, { useState } from 'react';
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
    KeyboardAvoidingView,
    ActivityIndicator,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';
import { AUTH_DISABLED } from '@/constants/FeatureFlags';
import { authService, AuthError } from '@/services/authService';
import { useUserStore } from '@/stores/userStore';

const MAX_CONTENT_WIDTH = 480;

export default function RegisterScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const router = useRouter();
    const { setUser } = useUserStore();
    const { width: windowWidth } = useWindowDimensions();
    const contentWidth = Math.min(windowWidth, MAX_CONTENT_WIDTH);

    if (AUTH_DISABLED) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" />
                <View style={styles.disabledContainer}>
                    <Text style={styles.disabledTitle}>æ³¨å†Œå·²ç¦ç”¨</Text>
                    <Text style={styles.disabledSubtitle}>
                        å½“å‰ç‰ˆæœ¬æœªå¯ç”¨ç”¨æˆ·ç®¡ç†ï¼Œè¯·å…ˆé€‰æ‹©è§’è‰²ä½“éªŒã€‚
                    </Text>
                    <TouchableOpacity
                        style={styles.disabledButton}
                        onPress={() => router.replace('/(auth)')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.disabledButtonText}>è¿”å›žè§’è‰²é€‰æ‹©</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const validateInputs = (): boolean => {
        if (!name.trim()) {
            setError('请输入你的名字');
            return false;
        }
        if (!email.trim()) {
            setError('请输入邮箱');
            return false;
        }
        if (!password.trim()) {
            setError('请输入密码');
            return false;
        }
        if (password.length < 6) {
            setError('密码至少需要6位');
            return false;
        }
        if (password !== confirmPassword) {
            setError('两次输入的密码不一致');
            return false;
        }
        return true;
    };

    const handleRegister = async () => {
        if (!validateInputs()) return;

        setError(null);
        setIsLoading(true);

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        try {
            const user = await authService.register(
                email.trim(),
                password,
                name.trim()
            );

            setUser({
                id: user.id,
                email: user.email,
                name: user.name,
                role: null,
            });

            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            // Navigate to role selection
            router.replace('/(auth)/');
        } catch (err) {
            const authError = err as AuthError;
            setError(authError.message);
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
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
                            <Text style={styles.logo}>⚡ 同频</Text>
                            <Text style={styles.subtitle}>Synapse</Text>
                            <Text style={styles.tagline}>创建账号</Text>
                        </Animated.View>

                        {/* Register Form */}
                        <View style={styles.formContainer}>
                            <Animated.View entering={FadeInUp.delay(300)}>
                                <Text style={styles.label}>你的名字</Text>
                                <TextInput
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="怎么称呼你？"
                                    placeholderTextColor={Colors.textMuted}
                                    autoCapitalize="words"
                                    autoComplete="name"
                                    editable={!isLoading}
                                />
                            </Animated.View>

                            <Animated.View entering={FadeInUp.delay(350)}>
                                <Text style={styles.label}>邮箱</Text>
                                <TextInput
                                    style={styles.input}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="your@email.com"
                                    placeholderTextColor={Colors.textMuted}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                    editable={!isLoading}
                                />
                            </Animated.View>

                            <Animated.View entering={FadeInUp.delay(400)}>
                                <Text style={styles.label}>密码</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        value={password}
                                        onChangeText={setPassword}
                                        placeholder="至少6位"
                                        placeholderTextColor={Colors.textMuted}
                                        secureTextEntry={!showPassword}
                                        autoComplete="new-password"
                                        editable={!isLoading}
                                    />
                                    <TouchableOpacity
                                        style={styles.eyeButton}
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        <Text style={styles.eyeIcon}>
                                            {showPassword ? '🙈' : '👁️'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>

                            <Animated.View entering={FadeInUp.delay(450)}>
                                <Text style={styles.label}>确认密码</Text>
                                <TextInput
                                    style={styles.input}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="再次输入密码"
                                    placeholderTextColor={Colors.textMuted}
                                    secureTextEntry={!showPassword}
                                    autoComplete="new-password"
                                    editable={!isLoading}
                                />
                            </Animated.View>

                            {/* Error Message */}
                            {error && (
                                <Animated.View entering={FadeInUp.duration(200)}>
                                    <Text style={styles.errorText}>{error}</Text>
                                </Animated.View>
                            )}
                        </View>

                        {/* Register Button */}
                        <Animated.View entering={FadeInUp.delay(500)} style={styles.footer}>
                            <TouchableOpacity
                                style={[
                                    styles.registerButton,
                                    isLoading && styles.registerButtonDisabled,
                                ]}
                                onPress={handleRegister}
                                disabled={isLoading}
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
                                        <Text style={styles.buttonText}>注册</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Login Link */}
                            <View style={styles.loginContainer}>
                                <Text style={styles.loginText}>已有账号？</Text>
                                <Link href="/(auth)/login" asChild>
                                    <TouchableOpacity disabled={isLoading}>
                                        <Text style={styles.loginLink}>立即登录</Text>
                                    </TouchableOpacity>
                                </Link>
                            </View>

                            {/* Terms */}
                            <Text style={styles.terms}>
                                注册即表示同意我们的服务条款和隐私政策
                            </Text>
                        </Animated.View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
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
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.lg,
    },
    logo: {
        fontSize: FontSizes.xxl,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    subtitle: {
        fontSize: FontSizes.md,
        color: Colors.textMuted,
        marginTop: Spacing.xs,
        letterSpacing: 4,
    },
    tagline: {
        fontSize: FontSizes.xl,
        color: Colors.textSecondary,
        marginTop: Spacing.md,
        fontWeight: '600',
    },
    formContainer: {
        flex: 1,
        paddingTop: Spacing.lg,
    },
    label: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
        paddingLeft: Spacing.xs,
    },
    input: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        fontSize: FontSizes.md,
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.surfaceElevated,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.surfaceElevated,
        marginBottom: Spacing.md,
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        fontSize: FontSizes.md,
        color: Colors.textPrimary,
    },
    eyeButton: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
    },
    eyeIcon: {
        fontSize: 20,
    },
    errorText: {
        color: Colors.error,
        fontSize: FontSizes.sm,
        textAlign: 'center',
        marginBottom: Spacing.md,
        paddingHorizontal: Spacing.md,
    },
    footer: {
        paddingVertical: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },
    registerButton: {
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
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
    registerButtonDisabled: {
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
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Spacing.lg,
    },
    loginText: {
        color: Colors.textSecondary,
        fontSize: FontSizes.sm,
    },
    loginLink: {
        color: Colors.primary,
        fontSize: FontSizes.sm,
        fontWeight: '600',
        marginLeft: Spacing.xs,
    },
    terms: {
        color: Colors.textMuted,
        fontSize: FontSizes.xs,
        textAlign: 'center',
        marginTop: Spacing.lg,
    },
    disabledContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
        backgroundColor: Colors.background,
    },
    disabledTitle: {
        fontSize: FontSizes.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
        textAlign: 'center',
    },
    disabledSubtitle: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    disabledButton: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
    },
    disabledButtonText: {
        color: Colors.textPrimary,
        fontSize: FontSizes.md,
        fontWeight: '700',
        textAlign: 'center',
    },
});
