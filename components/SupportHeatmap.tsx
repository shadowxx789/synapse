import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/Colors';

interface HeatmapData {
    label: string;
    value: number;
    maxValue: number;
}

interface SupportHeatmapProps {
    data: HeatmapData[];
    title?: string;
}

const { width } = Dimensions.get('window');
const CELL_SIZE = (width - Spacing.lg * 2 - Spacing.md * 6) / 7;

// Rewarding color palette - using calming teal with warm accents
const getHeatColor = (value: number, maxValue: number): { bg: string; glow: string; textColor: string } => {
    if (maxValue === 0) return {
        bg: Colors.surfaceElevated,
        glow: 'transparent',
        textColor: Colors.textMuted
    };
    const intensity = value / maxValue;

    if (intensity === 0) return {
        bg: Colors.surfaceElevated,
        glow: 'transparent',
        textColor: Colors.textMuted
    };
    if (intensity < 0.25) return {
        bg: 'rgba(78, 205, 196, 0.15)',
        glow: 'rgba(78, 205, 196, 0.05)',
        textColor: Colors.supporter.primary
    };
    if (intensity < 0.5) return {
        bg: 'rgba(78, 205, 196, 0.35)',
        glow: 'rgba(78, 205, 196, 0.15)',
        textColor: Colors.supporter.primary
    };
    if (intensity < 0.75) return {
        bg: 'rgba(78, 205, 196, 0.55)',
        glow: 'rgba(78, 205, 196, 0.25)',
        textColor: '#FFF'
    };
    return {
        bg: 'linear-gradient(135deg, rgba(78, 205, 196, 0.8), rgba(126, 221, 214, 0.9))',
        glow: 'rgba(78, 205, 196, 0.4)',
        textColor: '#FFF'
    };
};

export default function SupportHeatmap({ data, title = '💕 支持足迹' }: SupportHeatmapProps) {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const totalActions = data.reduce((sum, d) => sum + d.value, 0);
    const activeDays = data.filter(d => d.value > 0).length;
    const streak = calculateStreak(data);

    // Get last 28 days data (4 weeks)
    const weeks = [];
    for (let i = 0; i < 4; i++) {
        weeks.push(data.slice(i * 7, (i + 1) * 7));
    }

    return (
        <View style={styles.container}>
            {/* Celebratory header */}
            <View style={styles.headerSection}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>你们一起走过的 {activeDays} 个温暖的日子</Text>
            </View>

            <View style={styles.heatmapContainer}>
                {/* Day labels */}
                <View style={styles.dayLabels}>
                    {['一', '二', '三', '四', '五', '六', '日'].map((day, i) => (
                        <Text key={i} style={styles.dayLabel}>{day}</Text>
                    ))}
                </View>

                {/* Week rows */}
                <View style={styles.weeksContainer}>
                    {weeks.map((week, weekIndex) => (
                        <View key={weekIndex} style={styles.weekRow}>
                            {week.map((day, dayIndex) => {
                                const colors = getHeatColor(day.value, maxValue);
                                const isHighActivity = day.value >= maxValue * 0.75;
                                const isStreakDay = streak > 3 && day.value > 0;

                                return (
                                    <View
                                        key={dayIndex}
                                        style={[
                                            styles.cell,
                                            { backgroundColor: colors.bg },
                                            isHighActivity && styles.cellHighActivity,
                                            isStreakDay && styles.cellStreak,
                                        ]}
                                    >
                                        {day.value > 0 && (
                                            <Text style={[
                                                styles.cellValue,
                                                { color: colors.textColor }
                                            ]}>
                                                {isHighActivity && day.value >= 5 ? '💕' : day.value}
                                            </Text>
                                        )}
                                    </View>
                                );
                            })}
                            {/* Fill empty cells if week is incomplete */}
                            {week.length < 7 && [...Array(7 - week.length)].map((_, i) => (
                                <View key={`empty-${i}`} style={[styles.cell, styles.emptyCell]} />
                            ))}
                        </View>
                    ))}
                </View>
            </View>

            {/* Simplified legend */}
            <View style={styles.legend}>
                <Text style={styles.legendLabel}>坚持</Text>
                {[0, 1, 2, 3, 4].map((i) => (
                    <View
                        key={i}
                        style={[
                            styles.legendCell,
                            {
                                backgroundColor: getHeatColor(i === 4 ? 10 : i * 0.25, 10).bg,
                                borderColor: i === 4 ? Colors.supporter.primary : 'transparent',
                                borderWidth: i === 4 ? 2 : 0,
                            }
                        ]}
                    />
                ))}
                <Text style={styles.legendLabel}>出色</Text>
            </View>

            {/* Celebratory stats */}
            <View style={styles.celebrationBanner}>
                {streak >= 3 && (
                    <View style={styles.streakBadge}>
                        <Text style={styles.streakEmoji}>🔥</Text>
                        <Text style={styles.streakText}>{streak}天连续支持</Text>
                    </View>
                )}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{totalActions}</Text>
                        <Text style={styles.statLabel}>次温暖帮助</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{activeDays}</Text>
                        <Text style={styles.statLabel}>天陪伴</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{maxValue}</Text>
                        <Text style={styles.statLabel}>最高纪录</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

// Helper to calculate streak of active days
function calculateStreak(data: HeatmapData[]): number {
    let streak = 0;
    for (let i = data.length - 1; i >= 0; i--) {
        if (data[i].value > 0) {
            streak++;
        } else if (streak > 0) {
            break;
        }
    }
    return streak;
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xxl,
        padding: Spacing.xl,
    },
    headerSection: {
        marginBottom: Spacing.lg,
    },
    title: {
        fontSize: FontSizes.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    heatmapContainer: {
        marginBottom: Spacing.lg,
    },
    dayLabels: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: Spacing.sm,
    },
    dayLabel: {
        width: CELL_SIZE,
        textAlign: 'center',
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        fontWeight: '500',
    },
    weeksContainer: {
        gap: Spacing.sm,
    },
    weekRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    cell: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cellHighActivity: {
        borderWidth: 2,
        borderColor: Colors.supporter.accent,
        shadowColor: Colors.supporter.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    cellStreak: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 3,
    },
    emptyCell: {
        backgroundColor: 'transparent',
    },
    cellValue: {
        fontSize: FontSizes.xs,
        fontWeight: '700',
    },
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    legendLabel: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        fontWeight: '500',
    },
    legendCell: {
        width: 20,
        height: 20,
        borderRadius: 6,
    },
    celebrationBanner: {
        backgroundColor: Colors.supporter.glow,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        marginBottom: Spacing.md,
        alignSelf: 'center',
    },
    streakEmoji: {
        fontSize: FontSizes.md,
        marginRight: Spacing.xs,
    },
    streakText: {
        color: '#FFD700',
        fontSize: FontSizes.sm,
        fontWeight: '700',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: FontSizes.xl,
        fontWeight: '700',
        color: Colors.supporter.primary,
    },
    statLabel: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },
    statDivider: {
        width: 1,
        backgroundColor: Colors.surface,
    },
});
