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
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useUserStore, UserRole } from '@/stores/userStore';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';
import { authService } from '@/services/backend';

const MAX_CONTENT_WIDTH = 480;

export default function RoleSelectionScreen() {
    const [selectedRole, setSelectedRole] = useState<UserRole>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { user, setRole } = useUserStore();
    const router = useRouter();
    const { width: windowWidth } = useWindowDimensions();
    const contentWidth = Math.min(windowWidth, MAX_CONTENT_WIDTH);

    const handleRoleSelect = (role: UserRole) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        setSelectedRole(role);
    };

    const handleContinue = async () => {
        if (!selectedRole || !user) return;

        setIsLoading(true);

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        try {
            // Update role in database
            await authService.updateRole(user.id, selectedRole);

            // Update local state
            setRole(selectedRole);

            // Navigate to pairing
            router.replace('/(auth)/pair');
        } catch (error) {
            console.error('Failed to update role:', error);
            // Still update local state and continue
            setRole(selectedRole);
            router.replace('/(auth)/pair');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.content, { width: contentWidth }]}>
                    {/* Header */}
                    <Animated.View
                        entering={FadeInDown.delay(200).springify()}
                        style={styles.header}
                    >
                        <Text style={styles.logo}>
                            <MaterialCommunityIcons name="lightning-bolt" size={FontSizes.hero} color={Colors.textPrimary} /> 同频
                        </Text>
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
                                    <MaterialCommunityIcons name="car-sports" size={28} color={Colors.executor.primary} />
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
                                    <MaterialCommunityIcons name="compass" size={28} color={Colors.supporter.primary} />
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
                                (!selectedRole || isLoading) && styles.continueButtonDisabled
                            ]}
                            onPress={handleContinue}
                            disabled={!selectedRole || isLoading}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={selectedRole && !isLoading
                                    ? [Colors.primary, '#FF8C61']
                                    : [Colors.surfaceElevated, Colors.surfaceElevated]
                                }
                                style={styles.buttonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color={Colors.textMuted} />
                                ) : (
                                    <Text style={[
                                        styles.buttonText,
                                        !selectedRole && styles.buttonTextDisabled
                                    ]}>
                                        开始使用
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <Text style={styles.hint}>
                            之后可以在设置中切换角色
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
        backgroundColor: 'rgba(22, 27, 34, 0.8)', // Semi-transparent for glow effect
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
        paddingVertical: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },
    continueButton: {
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
    continueButtonDisabled: {
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
