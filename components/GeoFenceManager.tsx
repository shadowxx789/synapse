import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    TextInput,
    Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInUp, SlideInUp } from 'react-native-reanimated';

import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';
import { useLocationStore, GeoFence } from '@/stores/locationStore';

interface GeoFenceManagerProps {
    onLocationEnter?: (fence: GeoFence) => void;
}

export default function GeoFenceManager({ onLocationEnter }: GeoFenceManagerProps) {
    const {
        geoFences,
        addGeoFence,
        removeGeoFence,
        updateGeoFence,
        currentLocation,
        setCurrentLocation,
    } = useLocationStore();

    const [showAddModal, setShowAddModal] = useState(false);
    const [triggeredFence, setTriggeredFence] = useState<GeoFence | null>(null);
    const [newFence, setNewFence] = useState({
        name: '',
        icon: '📍',
        tasks: '',
        radius: 100,
    });

    const ICON_OPTIONS = ['🛒', '💊', '🏢', '🏠', '🍽️', '🏥', '🚗', '🏪', '🎓', '📍'];

    const handleSimulateEntry = (fence: GeoFence) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTriggeredFence(fence);
        onLocationEnter?.(fence);
    };

    const handleAddFence = () => {
        if (!newFence.name.trim() || !newFence.tasks.trim()) {
            Alert.alert('请填写完整', '地点名称和任务列表不能为空');
            return;
        }

        addGeoFence({
            name: newFence.name,
            icon: newFence.icon,
            latitude: 31.23 + Math.random() * 0.1,
            longitude: 121.47 + Math.random() * 0.1,
            radius: newFence.radius,
            tasks: newFence.tasks.split(',').map(t => t.trim()).filter(t => t),
            isActive: true,
        });

        setNewFence({ name: '', icon: '📍', tasks: '', radius: 100 });
        setShowAddModal(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleToggleFence = (fence: GeoFence) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        updateGeoFence(fence.id, { isActive: !fence.isActive });
    };

    const handleDeleteFence = (fence: GeoFence) => {
        Alert.alert(
            '确认删除',
            `确定要删除「${fence.name}」地点吗？`,
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '删除',
                    style: 'destructive',
                    onPress: () => {
                        removeGeoFence(fence.id);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>📍 地理围栏</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowAddModal(true)}
                >
                    <Text style={styles.addButtonText}>+ 添加</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>
                到达指定地点时自动弹出任务清单
            </Text>

            {/* Geo-fence list */}
            <View style={styles.fenceList}>
                {geoFences.map((fence, index) => (
                    <Animated.View
                        key={fence.id}
                        entering={FadeInUp.delay(index * 100)}
                    >
                        <View style={[
                            styles.fenceCard,
                            !fence.isActive && styles.fenceCardInactive
                        ]}>
                            <View style={styles.fenceHeader}>
                                <View style={styles.fenceIconContainer}>
                                    <Text style={styles.fenceIcon}>{fence.icon}</Text>
                                </View>
                                <View style={styles.fenceInfo}>
                                    <Text style={styles.fenceName}>{fence.name}</Text>
                                    <Text style={styles.fenceRadius}>半径 {fence.radius}m</Text>
                                </View>
                                <TouchableOpacity
                                    style={[
                                        styles.toggleSwitch,
                                        fence.isActive && styles.toggleSwitchActive
                                    ]}
                                    onPress={() => handleToggleFence(fence)}
                                >
                                    <View style={[
                                        styles.toggleKnob,
                                        fence.isActive && styles.toggleKnobActive
                                    ]} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.taskTags}>
                                {fence.tasks.slice(0, 3).map((task, i) => (
                                    <View key={i} style={styles.taskTag}>
                                        <Text style={styles.taskTagText}>{task}</Text>
                                    </View>
                                ))}
                                {fence.tasks.length > 3 && (
                                    <Text style={styles.moreTasksText}>
                                        +{fence.tasks.length - 3}
                                    </Text>
                                )}
                            </View>

                            <View style={styles.fenceActions}>
                                <TouchableOpacity
                                    style={styles.simulateButton}
                                    onPress={() => handleSimulateEntry(fence)}
                                >
                                    <Text style={styles.simulateButtonText}>🔔 模拟到达</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.deleteIconButton}
                                    onPress={() => handleDeleteFence(fence)}
                                >
                                    <Text style={styles.deleteIcon}>🗑️</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
                ))}
            </View>

            {/* Empty state */}
            {geoFences.length === 0 && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>📍</Text>
                    <Text style={styles.emptyText}>还没有设置地理围栏</Text>
                    <Text style={styles.emptyHint}>添加常去的地点和对应的任务</Text>
                </View>
            )}

            {/* Triggered fence modal */}
            <Modal
                visible={!!triggeredFence}
                transparent
                animationType="fade"
                onRequestClose={() => setTriggeredFence(null)}
            >
                <View style={styles.modalOverlay}>
                    {triggeredFence && (
                        <Animated.View
                            entering={SlideInUp.springify()}
                            style={styles.triggeredModal}
                        >
                            <View style={styles.triggeredHeader}>
                                <Text style={styles.triggeredIcon}>{triggeredFence.icon}</Text>
                                <Text style={styles.triggeredTitle}>
                                    你到达了 {triggeredFence.name}
                                </Text>
                            </View>

                            <Text style={styles.triggeredSubtitle}>
                                📋 这里有一些任务提醒：
                            </Text>

                            <View style={styles.triggeredTasks}>
                                {triggeredFence.tasks.map((task, index) => (
                                    <Animated.View
                                        key={index}
                                        entering={FadeInUp.delay(index * 100)}
                                        style={styles.triggeredTaskItem}
                                    >
                                        <View style={styles.checkbox}>
                                            <Text style={styles.checkboxText}>☐</Text>
                                        </View>
                                        <Text style={styles.triggeredTaskText}>{task}</Text>
                                    </Animated.View>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={styles.gotItButton}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    setTriggeredFence(null);
                                }}
                            >
                                <Text style={styles.gotItButtonText}>👍 知道了</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </View>
            </Modal>

            {/* Add fence modal */}
            <Modal
                visible={showAddModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowAddModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <Animated.View
                        entering={FadeIn}
                        style={styles.addModal}
                    >
                        <Text style={styles.modalTitle}>添加地理围栏</Text>

                        <Text style={styles.inputLabel}>选择图标</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.iconSelector}
                        >
                            {ICON_OPTIONS.map((icon) => (
                                <TouchableOpacity
                                    key={icon}
                                    style={[
                                        styles.iconOption,
                                        newFence.icon === icon && styles.iconOptionSelected
                                    ]}
                                    onPress={() => setNewFence({ ...newFence, icon })}
                                >
                                    <Text style={styles.iconText}>{icon}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.inputLabel}>地点名称</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="例如：家附近超市"
                            placeholderTextColor={Colors.textMuted}
                            value={newFence.name}
                            onChangeText={(name) => setNewFence({ ...newFence, name })}
                        />

                        <Text style={styles.inputLabel}>任务列表（用逗号分隔）</Text>
                        <TextInput
                            style={[styles.input, styles.inputMultiline]}
                            placeholder="例如：买牛奶, 买鸡蛋, 买面包"
                            placeholderTextColor={Colors.textMuted}
                            value={newFence.tasks}
                            onChangeText={(tasks) => setNewFence({ ...newFence, tasks })}
                            multiline
                        />

                        <Text style={styles.inputLabel}>触发半径</Text>
                        <View style={styles.radiusSelector}>
                            {[50, 100, 200, 500].map((r) => (
                                <TouchableOpacity
                                    key={r}
                                    style={[
                                        styles.radiusOption,
                                        newFence.radius === r && styles.radiusOptionSelected
                                    ]}
                                    onPress={() => setNewFence({ ...newFence, radius: r })}
                                >
                                    <Text style={[
                                        styles.radiusOptionText,
                                        newFence.radius === r && styles.radiusOptionTextSelected
                                    ]}>
                                        {r}m
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowAddModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>取消</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.confirmButton}
                                onPress={handleAddFence}
                            >
                                <Text style={styles.confirmButtonText}>添加</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    title: {
        fontSize: FontSizes.lg,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    addButton: {
        backgroundColor: Colors.surfaceElevated,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
    },
    addButtonText: {
        color: Colors.primary,
        fontSize: FontSizes.sm,
        fontWeight: '600',
    },
    subtitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.md,
    },
    fenceList: {
        gap: Spacing.md,
    },
    fenceCard: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
    },
    fenceCardInactive: {
        opacity: 0.5,
    },
    fenceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    fenceIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    fenceIcon: {
        fontSize: 20,
    },
    fenceInfo: {
        flex: 1,
    },
    fenceName: {
        fontSize: FontSizes.md,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    fenceRadius: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
    },
    toggleSwitch: {
        width: 44,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.surface,
        padding: 2,
        justifyContent: 'center',
    },
    toggleSwitchActive: {
        backgroundColor: Colors.success,
    },
    toggleKnob: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.textMuted,
    },
    toggleKnobActive: {
        backgroundColor: '#FFF',
        alignSelf: 'flex-end',
    },
    taskTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    taskTag: {
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.sm,
    },
    taskTagText: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
    },
    moreTasksText: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        alignSelf: 'center',
    },
    fenceActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    simulateButton: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
    },
    simulateButtonText: {
        fontSize: FontSizes.sm,
        color: Colors.primary,
        fontWeight: '600',
    },
    deleteIconButton: {
        padding: Spacing.sm,
    },
    deleteIcon: {
        fontSize: 16,
    },
    emptyState: {
        alignItems: 'center',
        padding: Spacing.xl,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: Spacing.sm,
    },
    emptyText: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
    },
    emptyHint: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    triggeredModal: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        width: '100%',
        maxWidth: 360,
    },
    triggeredHeader: {
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    triggeredIcon: {
        fontSize: 64,
        marginBottom: Spacing.sm,
    },
    triggeredTitle: {
        fontSize: FontSizes.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
        textAlign: 'center',
    },
    triggeredSubtitle: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        marginBottom: Spacing.md,
    },
    triggeredTasks: {
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    triggeredTaskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    checkboxText: {
        fontSize: 14,
        color: Colors.primary,
    },
    triggeredTaskText: {
        fontSize: FontSizes.md,
        color: Colors.textPrimary,
        flex: 1,
    },
    gotItButton: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    gotItButtonText: {
        color: '#FFF',
        fontSize: FontSizes.md,
        fontWeight: '700',
    },
    addModal: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: FontSizes.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    inputLabel: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
        marginTop: Spacing.sm,
    },
    iconSelector: {
        marginBottom: Spacing.sm,
    },
    iconOption: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
    },
    iconOptionSelected: {
        backgroundColor: Colors.primary + '30',
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    iconText: {
        fontSize: 24,
    },
    input: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        color: Colors.textPrimary,
        fontSize: FontSizes.md,
    },
    inputMultiline: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    radiusSelector: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    radiusOption: {
        flex: 1,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    radiusOptionSelected: {
        backgroundColor: Colors.primary,
    },
    radiusOptionText: {
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    radiusOptionTextSelected: {
        color: '#FFF',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.xl,
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
    confirmButton: {
        flex: 2,
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#FFF',
        fontSize: FontSizes.md,
        fontWeight: '700',
    },
});
