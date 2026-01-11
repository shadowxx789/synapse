import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Dimensions,
    StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';

import { useUserStore, UserRole } from '@/stores/userStore';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
    const [selectedRole, setSelectedRole] = useState<UserRole>(null);
    const { setUser, setRole } = useUserStore();
    const router = useRouter();

    const handleRoleSelect = (role: UserRole) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedRole(role);
    };

    const handleContinue = () => {
        if (!selectedRole) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Create demo user
        setUser({
            id: Date.now().toString(),
            email: 'demo@synapse.app',
            name: selectedRole === 'executor' ? '执行者' : '支持者',
            role: selectedRole,
        });

        // Navigate to appropriate flow
        if (selectedRole === 'executor') {
            router.replace('/(executor)');
        } else {
            router.replace('/(supporter)');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <Animated.View
                entering={FadeInDown.delay(200).springify()}
                style={styles.header}
            >
                <Text style={styles.logo}>⚡ 同频</Text>
                <Text style={styles.subtitle}>Synapse</Text>
                <Text style={styles.tagline}>
                    让 ADHD 伴侣同频协作
                </Text>
            </Animated.View>

            {/* Role Selection */}
            <View style={styles.rolesContainer}>
                <Animated.Text
                    entering={FadeInUp.delay(400)}
                    style={styles.question}
                >
                    你是哪个角色？
                </Animated.Text>

                {/* Executor Card */}
                <Animated.View entering={FadeInUp.delay(500)}>
                    <TouchableOpacity
                        style={[
                            styles.roleCard,
                            selectedRole === 'executor' && styles.roleCardSelected,
                            { borderColor: Colors.executor.primary }
                        ]}
                        onPress={() => handleRoleSelect('executor')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.roleIconContainer}>
                            <Text style={styles.roleIcon}>🏎️</Text>
                        </View>
                        <View style={styles.roleContent}>
                            <Text style={[
                                styles.roleName,
                                { color: Colors.executor.primary }
                            ]}>
                                执行者
                            </Text>
                            <Text style={styles.roleDesc}>
                                我有 ADHD，需要清晰的任务指引
                            </Text>
                        </View>
                        {selectedRole === 'executor' && (
                            <View style={[styles.checkmark, { backgroundColor: Colors.executor.primary }]}>
                                <Text style={styles.checkmarkText}>✓</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </Animated.View>

                {/* Supporter Card */}
                <Animated.View entering={FadeInUp.delay(600)}>
                    <TouchableOpacity
                        style={[
                            styles.roleCard,
                            selectedRole === 'supporter' && styles.roleCardSelected,
                            { borderColor: Colors.supporter.primary }
                        ]}
                        onPress={() => handleRoleSelect('supporter')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.roleIconContainer}>
                            <Text style={styles.roleIcon}>🧭</Text>
                        </View>
                        <View style={styles.roleContent}>
                            <Text style={[
                                styles.roleName,
                                { color: Colors.supporter.primary }
                            ]}>
                                支持者
                            </Text>
                            <Text style={styles.roleDesc}>
                                我是伴侣，想减少唠叨和情感透支
                            </Text>
                        </View>
                        {selectedRole === 'supporter' && (
                            <View style={[styles.checkmark, { backgroundColor: Colors.supporter.primary }]}>
                                <Text style={styles.checkmarkText}>✓</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </View>

            {/* Continue Button */}
            <Animated.View
                entering={FadeInUp.delay(700)}
                style={styles.footer}
            >
                <TouchableOpacity
                    style={[
                        styles.continueButton,
                        !selectedRole && styles.continueButtonDisabled
                    ]}
                    onPress={handleContinue}
                    disabled={!selectedRole}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={selectedRole
                            ? [Colors.primary, '#FF8C61']
                            : [Colors.surfaceElevated, Colors.surfaceElevated]
                        }
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Text style={[
                            styles.buttonText,
                            !selectedRole && styles.buttonTextDisabled
                        ]}>
                            开始使用
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.hint}>
                    之后可以在设置中切换角色
                </Text>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
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
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        marginTop: Spacing.lg,
    },
    rolesContainer: {
        flex: 1,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xl,
    },
    question: {
        fontSize: FontSizes.xl,
        fontWeight: '600',
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: Spacing.xl,
    },
    roleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    roleCardSelected: {
        backgroundColor: Colors.surfaceElevated,
    },
    roleIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    roleIcon: {
        fontSize: 28,
    },
    roleContent: {
        flex: 1,
    },
    roleName: {
        fontSize: FontSizes.lg,
        fontWeight: '700',
        marginBottom: Spacing.xs,
    },
    roleDesc: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        lineHeight: FontSizes.sm * 1.4,
    },
    checkmark: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmarkText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    footer: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },
    continueButton: {
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    continueButtonDisabled: {
        shadowOpacity: 0,
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
    buttonTextDisabled: {
        color: Colors.textMuted,
    },
    hint: {
        textAlign: 'center',
        color: Colors.textMuted,
        fontSize: FontSizes.sm,
        marginTop: Spacing.md,
    },
});
