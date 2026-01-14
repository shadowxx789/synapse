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

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
                    <Text style={styles.disabledTitle}>ç™»å½•å·²ç¦ç”¨</Text>
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

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            setError('请输入邮箱和密码');
            return;
        }

        setError(null);
        setIsLoading(true);

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        try {
            const user = await authService.login(email.trim(), password);

            setUser({
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                partnerId: user.partnerId,
                pairingCode: user.pairingCode,
            });

            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            // Navigate based on user state
            if (!user.role) {
                // User hasn't selected role yet
                router.replace('/(auth)/');
            } else if (!user.partnerId) {
                // User has role but not paired
                router.replace('/(auth)/pair');
            } else {
                // User is fully set up
                router.replace(user.role === 'executor' ? '/(executor)' : '/(supporter)');
            }
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

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            setError('请先输入邮箱地址');
            return;
        }

        setIsLoading(true);
        try {
            await authService.sendPasswordReset(email.trim());
            if (Platform.OS === 'web') {
                window.alert('重置密码邮件已发送，请查收');
            } else {
                // For native, we'd use Alert.alert
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (err) {
            const authError = err as AuthError;
            setError(authError.message);
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
                            <Text style={styles.tagline}>欢迎回来</Text>
                        </Animated.View>

                        {/* Login Form */}
                        <View style={styles.formContainer}>
                            <Animated.View entering={FadeInUp.delay(300)}>
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
                                        placeholder="输入密码"
                                        placeholderTextColor={Colors.textMuted}
                                        secureTextEntry={!showPassword}
                                        autoComplete="password"
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

                            {/* Error Message */}
                            {error && (
                                <Animated.View entering={FadeInUp.duration(200)}>
                                    <Text style={styles.errorText}>{error}</Text>
                                </Animated.View>
                            )}

                            {/* Forgot Password */}
                            <Animated.View entering={FadeInUp.delay(450)}>
                                <TouchableOpacity
                                    onPress={handleForgotPassword}
                                    disabled={isLoading}
                                >
                                    <Text style={styles.forgotPassword}>忘记密码？</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        </View>

                        {/* Login Button */}
                        <Animated.View entering={FadeInUp.delay(500)} style={styles.footer}>
                            <TouchableOpacity
                                style={[
                                    styles.loginButton,
                                    isLoading && styles.loginButtonDisabled,
                                ]}
                                onPress={handleLogin}
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
                                        <Text style={styles.buttonText}>登录</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Register Link */}
                            <View style={styles.registerContainer}>
                                <Text style={styles.registerText}>还没有账号？</Text>
                                <Link href="/(auth)/register" asChild>
                                    <TouchableOpacity disabled={isLoading}>
                                        <Text style={styles.registerLink}>立即注册</Text>
                                    </TouchableOpacity>
                                </Link>
                            </View>
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
        paddingTop: Spacing.xxl,
        paddingBottom: Spacing.xl,
    },
    logo: {
        fontSize: FontSizes.hero,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    subtitle: {
        fontSize: FontSizes.lg,
        color: Colors.textMuted,
        marginTop: Spacing.xs,
        letterSpacing: 4,
    },
    tagline: {
        fontSize: FontSizes.xl,
        color: Colors.textSecondary,
        marginTop: Spacing.lg,
        fontWeight: '600',
    },
    formContainer: {
        flex: 1,
        paddingTop: Spacing.xl,
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
        marginBottom: Spacing.lg,
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
    forgotPassword: {
        color: Colors.primary,
        fontSize: FontSizes.sm,
        textAlign: 'right',
        paddingVertical: Spacing.sm,
    },
    footer: {
        paddingVertical: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },
    loginButton: {
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
    loginButtonDisabled: {
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
    registerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Spacing.lg,
    },
    registerText: {
        color: Colors.textSecondary,
        fontSize: FontSizes.sm,
    },
    registerLink: {
        color: Colors.primary,
        fontSize: FontSizes.sm,
        fontWeight: '600',
        marginLeft: Spacing.xs,
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
