import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSizes } from '@/constants/Colors';

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
    return (
        <View style={styles.tabIconContainer}>
            <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>{icon}</Text>
            <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
        </View>
    );
}

export default function ExecutorLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Colors.surface,
                    borderTopColor: Colors.surfaceElevated,
                    borderTopWidth: 1,
                    height: 70,
                    paddingBottom: 10,
                    paddingTop: 10,
                },
                tabBarShowLabel: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon icon="🎯" label="任务" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="buffer"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon icon="🧠" label="减震" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="space"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon icon="📍" label="空间" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon icon="⚙️" label="设置" focused={focused} />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabIcon: {
        fontSize: 24,
        marginBottom: 2,
    },
    tabIconFocused: {
        transform: [{ scale: 1.1 }],
    },
    tabLabel: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
    },
    tabLabelFocused: {
        color: Colors.primary,
        fontWeight: '600',
    },
});
