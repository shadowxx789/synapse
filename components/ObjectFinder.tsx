import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    TextInput,
    Image,
    Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInUp, SlideInRight } from 'react-native-reanimated';

import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';
import { useObjectStore, ObjectAnchor } from '@/stores/objectStore';

const CATEGORY_OPTIONS = [
    { key: 'keys', label: '钥匙', icon: '🔑' },
    { key: 'wallet', label: '钱包', icon: '👛' },
    { key: 'medicine', label: '药物', icon: '💊' },
    { key: 'documents', label: '文件', icon: '📄' },
    { key: 'electronics', label: '电子产品', icon: '📱' },
    { key: 'other', label: '其他', icon: '📦' },
] as const;

interface ObjectFinderProps {
    onFindRequest?: (object: ObjectAnchor) => void;
}

export default function ObjectFinder({ onFindRequest }: ObjectFinderProps) {
    const { objects, addObject, removeObject } = useObjectStore();
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedObject, setSelectedObject] = useState<ObjectAnchor | null>(null);
    const [newObject, setNewObject] = useState({
        name: '',
        icon: '📦',
        description: '',
        location: '',
        category: 'other' as ObjectAnchor['category'],
    });

    const handleObjectPress = (obj: ObjectAnchor) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedObject(obj);
    };

    const handleFindWithAirtag = (obj: ObjectAnchor) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
            '🔊 正在播放声音',
            `正在让 ${obj.name} 发出声音...\n\n请注意听周围的响声！`,
            [{ text: '找到了！', style: 'default' }]
        );
        onFindRequest?.(obj);
    };

    const handleAddObject = () => {
        if (!newObject.name.trim() || !newObject.location.trim()) {
            Alert.alert('请填写完整', '名称和存放位置不能为空');
            return;
        }

        const category = CATEGORY_OPTIONS.find(c => c.key === newObject.category);
        addObject({
            ...newObject,
            icon: category?.icon || '📦',
        });

        setNewObject({
            name: '',
            icon: '📦',
            description: '',
            location: '',
            category: 'other',
        });
        setShowAddModal(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleDelete = (obj: ObjectAnchor) => {
        Alert.alert(
            '确认删除',
            `确定要删除「${obj.name}」吗？`,
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '删除',
                    style: 'destructive',
                    onPress: () => {
                        removeObject(obj.id);
                        setSelectedObject(null);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>📍 物品锚点</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowAddModal(true)}
                >
                    <Text style={styles.addButtonText}>+ 添加</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>记住每件物品的固定位置</Text>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.objectsScroll}
            >
                {objects.map((obj, index) => (
                    <Animated.View
                        key={obj.id}
                        entering={SlideInRight.delay(index * 100)}
                    >
                        <TouchableOpacity
                            style={styles.objectCard}
                            onPress={() => handleObjectPress(obj)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.objectIconContainer}>
                                <Text style={styles.objectIcon}>{obj.icon}</Text>
                                {obj.airtagId && (
                                    <View style={styles.airtagBadge}>
                                        <Text style={styles.airtagText}>📡</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.objectName}>{obj.name}</Text>
                            <Text style={styles.objectLocation} numberOfLines={1}>
                                {obj.location}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                ))}
            </ScrollView>

            {/* Object Detail Modal */}
            <Modal
                visible={!!selectedObject}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedObject(null)}
            >
                <View style={styles.modalOverlay}>
                    {selectedObject && (
                        <Animated.View
                            entering={FadeIn}
                            style={styles.detailModal}
                        >
                            <View style={styles.detailHeader}>
                                <Text style={styles.detailIcon}>{selectedObject.icon}</Text>
                                <Text style={styles.detailTitle}>{selectedObject.name}</Text>
                            </View>

                            {selectedObject.description && (
                                <Text style={styles.detailDescription}>
                                    {selectedObject.description}
                                </Text>
                            )}

                            <View style={styles.locationCard}>
                                <Text style={styles.locationLabel}>📍 存放位置</Text>
                                <Text style={styles.locationText}>{selectedObject.location}</Text>
                            </View>

                            {selectedObject.imageUri && (
                                <View style={styles.imageContainer}>
                                    <Image
                                        source={{ uri: selectedObject.imageUri }}
                                        style={styles.locationImage}
                                        resizeMode="cover"
                                    />
                                </View>
                            )}

                            {selectedObject.airtagId ? (
                                <TouchableOpacity
                                    style={styles.findButton}
                                    onPress={() => handleFindWithAirtag(selectedObject)}
                                >
                                    <Text style={styles.findButtonText}>🔊 播放声音定位</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.noAirtagHint}>
                                    <Text style={styles.noAirtagText}>
                                        💡 添加 AirTag 可以远程定位
                                    </Text>
                                </View>
                            )}

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => handleDelete(selectedObject)}
                                >
                                    <Text style={styles.deleteButtonText}>🗑️ 删除</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => setSelectedObject(null)}
                                >
                                    <Text style={styles.closeButtonText}>关闭</Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    )}
                </View>
            </Modal>

            {/* Add Object Modal */}
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
                        <Text style={styles.modalTitle}>添加物品锚点</Text>

                        <Text style={styles.inputLabel}>类别</Text>
                        <View style={styles.categoryGrid}>
                            {CATEGORY_OPTIONS.map((cat) => (
                                <TouchableOpacity
                                    key={cat.key}
                                    style={[
                                        styles.categoryOption,
                                        newObject.category === cat.key && styles.categorySelected
                                    ]}
                                    onPress={() => setNewObject({ ...newObject, category: cat.key })}
                                >
                                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                                    <Text style={[
                                        styles.categoryLabel,
                                        newObject.category === cat.key && styles.categoryLabelSelected
                                    ]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.inputLabel}>物品名称</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="例如：家门钥匙"
                            placeholderTextColor={Colors.textMuted}
                            value={newObject.name}
                            onChangeText={(name) => setNewObject({ ...newObject, name })}
                        />

                        <Text style={styles.inputLabel}>存放位置</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="例如：玄关柜子第二层"
                            placeholderTextColor={Colors.textMuted}
                            value={newObject.location}
                            onChangeText={(location) => setNewObject({ ...newObject, location })}
                        />

                        <Text style={styles.inputLabel}>备注（可选）</Text>
                        <TextInput
                            style={[styles.input, styles.inputMultiline]}
                            placeholder="任何有助于找到它的信息"
                            placeholderTextColor={Colors.textMuted}
                            value={newObject.description}
                            onChangeText={(description) => setNewObject({ ...newObject, description })}
                            multiline
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowAddModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>取消</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.confirmButton}
                                onPress={handleAddObject}
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
    objectsScroll: {
        gap: Spacing.md,
        paddingRight: Spacing.md,
    },
    objectCard: {
        width: 100,
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        alignItems: 'center',
    },
    objectIconContainer: {
        position: 'relative',
        marginBottom: Spacing.sm,
    },
    objectIcon: {
        fontSize: 32,
    },
    airtagBadge: {
        position: 'absolute',
        top: -4,
        right: -8,
        backgroundColor: Colors.surface,
        borderRadius: 8,
        padding: 2,
    },
    airtagText: {
        fontSize: 10,
    },
    objectName: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: Spacing.xs,
    },
    objectLocation: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    detailModal: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        width: '100%',
        maxWidth: 360,
    },
    detailHeader: {
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    detailIcon: {
        fontSize: 64,
        marginBottom: Spacing.sm,
    },
    detailTitle: {
        fontSize: FontSizes.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    detailDescription: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    locationCard: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    locationLabel: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        marginBottom: Spacing.xs,
    },
    locationText: {
        fontSize: FontSizes.lg,
        color: Colors.textPrimary,
        fontWeight: '600',
    },
    imageContainer: {
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        marginBottom: Spacing.md,
    },
    locationImage: {
        width: '100%',
        height: 150,
    },
    findButton: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    findButtonText: {
        color: '#FFF',
        fontSize: FontSizes.md,
        fontWeight: '700',
    },
    noAirtagHint: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    noAirtagText: {
        fontSize: FontSizes.sm,
        color: Colors.textMuted,
        textAlign: 'center',
    },
    modalActions: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    deleteButton: {
        flex: 1,
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    deleteButtonText: {
        color: Colors.error,
        fontSize: FontSizes.md,
    },
    closeButton: {
        flex: 2,
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    closeButtonText: {
        color: Colors.textPrimary,
        fontSize: FontSizes.md,
        fontWeight: '600',
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
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    categoryOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceElevated,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        gap: Spacing.xs,
    },
    categorySelected: {
        backgroundColor: Colors.primary,
    },
    categoryIcon: {
        fontSize: 16,
    },
    categoryLabel: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    categoryLabelSelected: {
        color: '#FFF',
    },
    input: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        color: Colors.textPrimary,
        fontSize: FontSizes.md,
    },
    inputMultiline: {
        minHeight: 60,
        textAlignVertical: 'top',
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
