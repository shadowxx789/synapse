import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    StatusBar,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Colors, FontSizes, Spacing } from '@/constants/Colors';
import ObjectFinder from '@/components/ObjectFinder';
import BodyDoubling from '@/components/BodyDoubling';
import GeoFenceManager from '@/components/GeoFenceManager';
import { useEnergyStore, ACTION_POINTS } from '@/stores/energyStore';

export default function SpaceScreen() {
    const { addPoints } = useEnergyStore();

    const handleBodyDoublingToggle = (active: boolean) => {
        if (active) {
            // Start timer to add points every 30 minutes
            console.log('Body doubling started - points will accrue');
        }
    };

    const handleFindRequest = () => {
        // Supporter gets points for helping find items
        addPoints({
            userId: 'supporter-1',
            actionType: 'item_finding',
            points: ACTION_POINTS.item_finding,
            description: '帮助找到物品',
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Header */}
                <Animated.View
                    entering={FadeInUp}
                    style={styles.header}
                >
                    <Text style={styles.title}>空间感知</Text>
                    <Text style={styles.subtitle}>
                        将信息锚定在物理世界
                    </Text>
                </Animated.View>

                {/* Object Finder */}
                <Animated.View entering={FadeInUp.delay(100)}>
                    <ObjectFinder onFindRequest={handleFindRequest} />
                </Animated.View>

                <View style={styles.spacer} />

                {/* Body Doubling */}
                <Animated.View entering={FadeInUp.delay(200)}>
                    <BodyDoubling onToggle={handleBodyDoublingToggle} />
                </Animated.View>

                <View style={styles.spacer} />

                {/* Geo-fence Manager */}
                <Animated.View entering={FadeInUp.delay(300)}>
                    <GeoFenceManager />
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },
    header: {
        marginBottom: Spacing.lg,
    },
    title: {
        fontSize: FontSizes.xxl,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
    },
    spacer: {
        height: Spacing.lg,
    },
});
