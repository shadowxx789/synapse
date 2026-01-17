import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';
import { useUserStore } from '@/stores/userStore';
import { userService } from '@/services/backend';
import AISettings from '@/components/AISettings';
import PartnerStatus from '@/components/PartnerStatus';

export default function ExecutorSettingsScreen() {
    const router = useRouter();
    const { user, logout, updateUser, setCoupleSecret } = useUserStore();
    const [showAISettings, setShowAISettings] = useState(false);
    const [isUnpairing, setIsUnpairing] = useState(false);

    const handleSwitchRole = () => {
        const doSwitch = () => {
            if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            logout();
            router.replace('/(auth)');
        };

        if (Platform.OS === 'web') {
            if (window.confirm('确定要返回角色选择页面吗？')) {
                doSwitch();
            }
        } else {
            Alert.alert(
                '切换角色',
                '确定要返回角色选择页面吗？',
                [
                    { text: '取消', style: 'cancel' },
                    { text: '确定', onPress: doSwitch },
                ]
            );
        }
    };

    const handleLogout = () => {
        const doLogout = () => {
            if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            logout();
            router.replace('/(auth)/login');
        };

        if (Platform.OS === 'web') {
            if (window.confirm('确定要退出登录吗？')) {
                doLogout();
            }
        } else {
            Alert.alert(
                '退出登录',
                '确定要退出登录吗？',
                [
                    { text: '取消', style: 'cancel' },
                    { text: '确定', style: 'destructive', onPress: doLogout },
                ]
            );
        }
    };

    const handlePairPartner = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        router.push('/(auth)/pair');
    };

    const handleUnpairPartner = async () => {
        const doUnpair = async () => {
            if (!user?.id) return;

            setIsUnpairing(true);
            try {
                await userService.unpair(user.id);
                updateUser({
                    partnerId: undefined,
                    coupleId: undefined,
                });
                setCoupleSecret(null);

                if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            } catch (error) {
                console.error('Failed to unpair:', error);
                if (Platform.OS === 'web') {
                    window.alert('解除配对失败，请重试');
                } else {
                    Alert.alert('错误', '解除配对失败，请重试');
                }
            } finally {
                setIsUnpairing(false);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('确定要解除与伴侣的配对吗？解除后需要重新配对。')) {
                doUnpair();
            }
        } else {
            Alert.alert(
                '解除配对',
                '确定要解除与伴侣的配对吗？解除后需要重新配对。',
                [
                    { text: '取消', style: 'cancel' },
                    { text: '确定解除', style: 'destructive', onPress: doUnpair },
                ]
            );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>⚙️ 设置</Text>
                </View>

                {/* User Info */}
                <View style={styles.section}>
                    <View style={styles.userCard}>
                        <View style={styles.userAvatar}>
                            <Text style={styles.userAvatarText}>🏎️</Text>
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{user?.name || '执行者'}</Text>
                            <Text style={styles.userEmail}>{user?.email}</Text>
                            <Text style={styles.userRole}>执行者模式</Text>
                        </View>
                    </View>
                </View>

                {/* Partner Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>伴侣连接</Text>
                    {user?.partnerId ? (
                        <>
                            <PartnerStatus
                                partnerName="支持者"
                                partnerRole="supporter"
                                isOnline={false}
                                onPress={() => {}}
                                onSendMessage={() => {}}
                                onSendEnergy={() => {}}
                            />
                            <TouchableOpacity
                                style={[styles.settingItem, styles.settingItemDanger, styles.marginTop]}
                                onPress={handleUnpairPartner}
                                disabled={isUnpairing}
                            >
                                {isUnpairing ? (
                                    <ActivityIndicator size="small" color={Colors.error} style={styles.settingIcon} />
                                ) : (
                                    <Text style={styles.settingIcon}>💔</Text>
                                )}
                                <View style={styles.settingContent}>
                                    <Text style={[styles.settingLabel, styles.settingLabelDanger]}>
                                        解除配对
                                    </Text>
                                    <Text style={styles.settingHint}>解除与伴侣的连接</Text>
                                </View>
                                <Text style={styles.settingArrow}>→</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity
                            style={styles.settingItem}
                            onPress={handlePairPartner}
                        >
                            <Text style={styles.settingIcon}>🔗</Text>
                            <View style={styles.settingContent}>
                                <Text style={styles.settingLabel}>配对伴侣</Text>
                                <Text style={styles.settingHint}>连接你的支持者</Text>
                            </View>
                            <Text style={styles.settingArrow}>→</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Settings Options */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>AI 设置</Text>
                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => setShowAISettings(true)}
                    >
                        <Text style={styles.settingIcon}>🤖</Text>
                        <View style={styles.settingContent}>
                            <Text style={styles.settingLabel}>AI API 配置</Text>
                            <Text style={styles.settingHint}>配置自定义 AI 服务</Text>
                        </View>
                        <Text style={styles.settingArrow}>→</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>账号</Text>
                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={handleSwitchRole}
                    >
                        <Text style={styles.settingIcon}>🔄</Text>
                        <View style={styles.settingContent}>
                            <Text style={styles.settingLabel}>切换角色</Text>
                            <Text style={styles.settingHint}>返回角色选择页面</Text>
                        </View>
                        <Text style={styles.settingArrow}>→</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.settingItem, styles.settingItemDanger]}
                        onPress={handleLogout}
                    >
                        <Text style={styles.settingIcon}>🚪</Text>
                        <View style={styles.settingContent}>
                            <Text style={[styles.settingLabel, styles.settingLabelDanger]}>
                                退出登录
                            </Text>
                        </View>
                        <Text style={styles.settingArrow}>→</Text>
                    </TouchableOpacity>
                </View>

                {/* App Info */}
                <View style={styles.appInfo}>
                    <Text style={styles.appName}>⚡ 同频 Synapse</Text>
                    <Text style={styles.appVersion}>v1.0.0</Text>
                </View>
            </ScrollView>

            {/* AI Settings Modal */}
            <AISettings
                isVisible={showAISettings}
                onClose={() => setShowAISettings(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        padding: Spacing.lg,
    },
    header: {
        marginBottom: Spacing.xl,
    },
    title: {
        fontSize: FontSizes.xxl,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        marginBottom: Spacing.sm,
        paddingLeft: Spacing.sm,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
    },
    userAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.executor.glow,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    userAvatarText: {
        fontSize: 28,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: FontSizes.lg,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    userEmail: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    userRole: {
        fontSize: FontSizes.sm,
        color: Colors.executor.primary,
        marginTop: Spacing.xs,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    settingItemDanger: {
        borderWidth: 1,
        borderColor: 'rgba(231, 76, 60, 0.3)',
    },
    marginTop: {
        marginTop: Spacing.md,
    },
    settingIcon: {
        fontSize: 24,
        marginRight: Spacing.md,
    },
    settingContent: {
        flex: 1,
    },
    settingLabel: {
        fontSize: FontSizes.md,
        color: Colors.textPrimary,
        fontWeight: '500',
    },
    settingLabelDanger: {
        color: Colors.error,
    },
    settingHint: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        marginTop: Spacing.xs,
    },
    settingArrow: {
        fontSize: FontSizes.lg,
        color: Colors.textMuted,
    },
    appInfo: {
        alignItems: 'center',
        marginTop: Spacing.xl,
        paddingTop: Spacing.xl,
        borderTopWidth: 1,
        borderTopColor: Colors.surfaceElevated,
    },
    appName: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    appVersion: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        marginTop: Spacing.xs,
    },
});
