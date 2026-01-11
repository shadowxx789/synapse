import { create } from 'zustand';

export type EnergyLevel = 'high' | 'medium' | 'low' | 'fog';

export interface MedicationRecord {
    id: string;
    name: string;
    dosage: string;
    takenAt: Date;
    effectDuration: number; // hours
    effectiveness?: number; // 1-5 rating
}

export interface EnergyEntry {
    id: string;
    timestamp: Date;
    level: EnergyLevel;
    notes?: string;
    hadMedication: boolean;
    sleepHours?: number;
    sleepQuality?: 'good' | 'fair' | 'poor';
    factors?: EnergyFactor[];
}

export type EnergyFactor =
    | 'good_sleep'
    | 'poor_sleep'
    | 'exercise'
    | 'caffeine'
    | 'stress'
    | 'relaxation'
    | 'social'
    | 'alone_time'
    | 'nature'
    | 'screen_time';

export interface DailyPrediction {
    hour: number;
    predictedLevel: EnergyLevel;
    confidence: number; // 0-1
    recommendation: string;
    suggestedTasks?: string[];
}

export interface WeeklyTrend {
    date: Date;
    avgEnergy: number; // 0-100 scale
    medicationCompliance: number; // percentage
    bestHour: number;
    worstHour: number;
}

export interface SleepRecord {
    id: string;
    date: Date;
    hours: number;
    quality: 'good' | 'fair' | 'poor';
    bedTime?: string;
    wakeTime?: string;
}

export interface PersonalizedInsight {
    id: string;
    type: 'pattern' | 'suggestion' | 'achievement';
    title: string;
    description: string;
    icon: string;
    actionable?: string;
}

interface EnergyPredictionState {
    medications: MedicationRecord[];
    energyHistory: EnergyEntry[];
    todaysPrediction: DailyPrediction[];
    currentEnergyLevel: EnergyLevel;
    lastMedicationTime: Date | null;
    weeklyTrends: WeeklyTrend[];
    sleepRecords: SleepRecord[];
    insights: PersonalizedInsight[];
    optimalWorkHours: number[];
    focusStreak: number;

    addMedication: (med: Omit<MedicationRecord, 'id'>) => void;
    logEnergy: (level: EnergyLevel, notes?: string, factors?: EnergyFactor[]) => void;
    getCurrentPrediction: () => DailyPrediction | null;
    generateTodaysPrediction: () => void;
    getTaskDensityMultiplier: () => number;
    logSleep: (hours: number, quality: SleepRecord['quality']) => void;
    getWeeklyReport: () => { avgEnergy: number; trend: 'improving' | 'stable' | 'declining'; insights: string[] };
    getOptimalTaskWindow: () => { start: number; end: number; confidence: number };
    rateMedicationEffectiveness: (medId: string, rating: number) => void;
    generatePersonalizedInsights: () => PersonalizedInsight[];
    incrementFocusStreak: () => void;
    resetFocusStreak: () => void;
}

// Generate predictions based on medication timing and historical patterns
const generatePredictions = (
    lastMedTime: Date | null,
    currentHour: number
): DailyPrediction[] => {
    const predictions: DailyPrediction[] = [];

    for (let hour = 6; hour <= 23; hour++) {
        let level: EnergyLevel = 'medium';
        let confidence = 0.6;
        let recommendation = '正常安排任务';

        if (lastMedTime) {
            const hoursSinceMed = (Date.now() - lastMedTime.getTime()) / (1000 * 60 * 60);
            const effectiveHour = hour - currentHour + hoursSinceMed;

            // Medication effect curve (typical stimulant pattern)
            if (effectiveHour >= 0 && effectiveHour < 1) {
                level = 'medium';
                recommendation = '药物正在起效，适合准备工作';
                confidence = 0.7;
            } else if (effectiveHour >= 1 && effectiveHour < 4) {
                level = 'high';
                recommendation = '高能量期！抓紧处理重要任务';
                confidence = 0.85;
            } else if (effectiveHour >= 4 && effectiveHour < 6) {
                level = 'medium';
                recommendation = '能量稳定，可以处理常规任务';
                confidence = 0.75;
            } else if (effectiveHour >= 6 && effectiveHour < 8) {
                level = 'low';
                recommendation = '能量下降，建议轻松任务或休息';
                confidence = 0.7;
            } else {
                level = 'fog';
                recommendation = '可能进入脑雾期，减少任务量';
                confidence = 0.6;
            }
        } else {
            // No medication - use natural circadian rhythm
            if (hour >= 9 && hour < 11) {
                level = 'medium';
                recommendation = '上午通常精力较好';
            } else if (hour >= 14 && hour < 16) {
                level = 'low';
                recommendation = '午后容易疲劳';
            } else if (hour >= 19 && hour < 21) {
                level = 'medium';
                recommendation = '晚间可能有第二个精力高峰';
            }
        }

        predictions.push({ hour, predictedLevel: level, confidence, recommendation });
    }

    return predictions;
};

export const useEnergyPredictionStore = create<EnergyPredictionState>((set, get) => ({
    medications: [],
    energyHistory: [],
    todaysPrediction: [],
    currentEnergyLevel: 'medium',
    lastMedicationTime: null,
    weeklyTrends: [],
    sleepRecords: [],
    insights: [],
    optimalWorkHours: [9, 10, 11], // Default optimal hours
    focusStreak: 0,

    addMedication: (med) => {
        const newMed: MedicationRecord = {
            ...med,
            id: Date.now().toString(),
        };
        set((state) => ({
            medications: [...state.medications, newMed],
            lastMedicationTime: med.takenAt,
        }));
        // Regenerate predictions after taking medication
        get().generateTodaysPrediction();
    },

    logEnergy: (level, notes, factors) => {
        const { lastMedicationTime, sleepRecords } = get();
        const lastSleep = sleepRecords[sleepRecords.length - 1];

        const entry: EnergyEntry = {
            id: Date.now().toString(),
            timestamp: new Date(),
            level,
            notes,
            hadMedication: !!lastMedicationTime &&
                (Date.now() - lastMedicationTime.getTime()) < 12 * 60 * 60 * 1000,
            sleepHours: lastSleep?.hours,
            sleepQuality: lastSleep?.quality,
            factors,
        };
        set((state) => ({
            energyHistory: [...state.energyHistory, entry],
            currentEnergyLevel: level,
        }));
    },

    getCurrentPrediction: () => {
        const { todaysPrediction } = get();
        const currentHour = new Date().getHours();
        return todaysPrediction.find(p => p.hour === currentHour) || null;
    },

    generateTodaysPrediction: () => {
        const { lastMedicationTime, sleepRecords } = get();
        const currentHour = new Date().getHours();
        const lastSleep = sleepRecords[sleepRecords.length - 1];

        const predictions = generatePredictions(lastMedicationTime, currentHour);

        // Adjust predictions based on sleep quality
        if (lastSleep) {
            predictions.forEach(pred => {
                if (lastSleep.quality === 'poor') {
                    if (pred.predictedLevel === 'high') {
                        pred.predictedLevel = 'medium';
                        pred.recommendation = '睡眠不足，建议适当休息';
                    }
                    pred.confidence *= 0.8;
                } else if (lastSleep.quality === 'good' && lastSleep.hours >= 7) {
                    pred.confidence = Math.min(1, pred.confidence * 1.1);
                }
            });
        }

        set({ todaysPrediction: predictions });
    },

    getTaskDensityMultiplier: () => {
        const prediction = get().getCurrentPrediction();
        if (!prediction) return 1;

        switch (prediction.predictedLevel) {
            case 'high': return 1.2;
            case 'medium': return 1.0;
            case 'low': return 0.7;
            case 'fog': return 0.4;
            default: return 1;
        }
    },

    logSleep: (hours, quality) => {
        const record: SleepRecord = {
            id: Date.now().toString(),
            date: new Date(),
            hours,
            quality,
        };
        set((state) => ({
            sleepRecords: [...state.sleepRecords, record],
        }));
        // Regenerate predictions based on new sleep data
        get().generateTodaysPrediction();
    },

    getWeeklyReport: () => {
        const { energyHistory, medications } = get();

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const recentHistory = energyHistory.filter(e => new Date(e.timestamp) >= weekAgo);
        const recentMeds = medications.filter(m => new Date(m.takenAt) >= weekAgo);

        // Calculate average energy
        const levelToScore: Record<EnergyLevel, number> = {
            high: 100, medium: 70, low: 40, fog: 10
        };

        const avgEnergy = recentHistory.length > 0
            ? recentHistory.reduce((sum, e) => sum + levelToScore[e.level], 0) / recentHistory.length
            : 50;

        // Determine trend by comparing first and second half
        const midpoint = Math.floor(recentHistory.length / 2);
        const firstHalfAvg = recentHistory.slice(0, midpoint).reduce((sum, e) => sum + levelToScore[e.level], 0) / Math.max(1, midpoint);
        const secondHalfAvg = recentHistory.slice(midpoint).reduce((sum, e) => sum + levelToScore[e.level], 0) / Math.max(1, recentHistory.length - midpoint);

        let trend: 'improving' | 'stable' | 'declining' = 'stable';
        if (secondHalfAvg - firstHalfAvg > 10) trend = 'improving';
        else if (firstHalfAvg - secondHalfAvg > 10) trend = 'declining';

        // Generate insights
        const insights: string[] = [];
        if (avgEnergy >= 70) {
            insights.push('这周能量状态很好！继续保持');
        } else if (avgEnergy < 50) {
            insights.push('能量偏低，考虑增加休息时间');
        }

        if (recentMeds.length >= 5) {
            insights.push('服药规律性不错，有助于稳定能量');
        }

        const highCount = recentHistory.filter(e => e.level === 'high').length;
        if (highCount > 0) {
            insights.push(`本周有 ${highCount} 次高能量时刻`);
        }

        return { avgEnergy, trend, insights };
    },

    getOptimalTaskWindow: () => {
        const { energyHistory, optimalWorkHours } = get();

        // Analyze historical high-energy periods
        const hourlyScores: Record<number, { total: number; count: number }> = {};

        energyHistory.forEach(entry => {
            const hour = new Date(entry.timestamp).getHours();
            if (!hourlyScores[hour]) {
                hourlyScores[hour] = { total: 0, count: 0 };
            }
            const score = entry.level === 'high' ? 100 : entry.level === 'medium' ? 70 : entry.level === 'low' ? 40 : 10;
            hourlyScores[hour].total += score;
            hourlyScores[hour].count += 1;
        });

        // Find best consecutive 2-hour window
        let bestStart = optimalWorkHours[0] || 9;
        let bestScore = 0;

        for (let hour = 6; hour <= 21; hour++) {
            const score1 = hourlyScores[hour]?.total / Math.max(1, hourlyScores[hour]?.count || 1) || 50;
            const score2 = hourlyScores[hour + 1]?.total / Math.max(1, hourlyScores[hour + 1]?.count || 1) || 50;
            const avgScore = (score1 + score2) / 2;

            if (avgScore > bestScore) {
                bestScore = avgScore;
                bestStart = hour;
            }
        }

        const confidence = Math.min(1, (Object.keys(hourlyScores).length / 10));

        return {
            start: bestStart,
            end: bestStart + 2,
            confidence,
        };
    },

    rateMedicationEffectiveness: (medId, rating) => {
        set((state) => ({
            medications: state.medications.map(med =>
                med.id === medId ? { ...med, effectiveness: rating } : med
            ),
        }));
    },

    generatePersonalizedInsights: () => {
        const { energyHistory, sleepRecords, medications, focusStreak } = get();
        const insights: PersonalizedInsight[] = [];

        // Check sleep patterns
        const recentSleep = sleepRecords.slice(-7);
        const avgSleep = recentSleep.reduce((sum, s) => sum + s.hours, 0) / Math.max(1, recentSleep.length);

        if (avgSleep < 6) {
            insights.push({
                id: '1',
                type: 'suggestion',
                title: '睡眠不足',
                description: '过去一周平均睡眠不足6小时，这会影响专注力',
                icon: '😴',
                actionable: '尝试提前30分钟上床',
            });
        } else if (avgSleep >= 7) {
            insights.push({
                id: '2',
                type: 'achievement',
                title: '睡眠充足',
                description: '保持了良好的睡眠习惯！',
                icon: '🌙',
            });
        }

        // Focus streak achievement
        if (focusStreak >= 3) {
            insights.push({
                id: '3',
                type: 'achievement',
                title: `连续专注 ${focusStreak} 天`,
                description: '你正在建立良好的工作习惯！',
                icon: '🔥',
            });
        }

        // Medication pattern
        const medCount = medications.filter(m => {
            const dayAgo = new Date();
            dayAgo.setDate(dayAgo.getDate() - 7);
            return new Date(m.takenAt) >= dayAgo;
        }).length;

        if (medCount >= 6) {
            insights.push({
                id: '4',
                type: 'pattern',
                title: '服药规律',
                description: '你在坚持按时服药，这有助于稳定能量水平',
                icon: '💊',
            });
        }

        // Energy pattern discovery
        const morningEnergy = energyHistory.filter(e =>
            new Date(e.timestamp).getHours() >= 8 &&
            new Date(e.timestamp).getHours() <= 11
        );
        const afternoonEnergy = energyHistory.filter(e =>
            new Date(e.timestamp).getHours() >= 14 &&
            new Date(e.timestamp).getHours() <= 17
        );

        const morningHighRate = morningEnergy.filter(e => e.level === 'high').length / Math.max(1, morningEnergy.length);
        const afternoonHighRate = afternoonEnergy.filter(e => e.level === 'high').length / Math.max(1, afternoonEnergy.length);

        if (morningHighRate > afternoonHighRate + 0.2) {
            insights.push({
                id: '5',
                type: 'pattern',
                title: '早晨型能量模式',
                description: '你在早上的能量表现更好，建议把重要任务安排在上午',
                icon: '🌅',
                actionable: '将关键任务安排在9-11点',
            });
        } else if (afternoonHighRate > morningHighRate + 0.2) {
            insights.push({
                id: '6',
                type: 'pattern',
                title: '下午型能量模式',
                description: '你在下午的能量表现更好',
                icon: '☀️',
                actionable: '将关键任务安排在14-16点',
            });
        }

        set({ insights });
        return insights;
    },

    incrementFocusStreak: () => {
        set((state) => ({ focusStreak: state.focusStreak + 1 }));
    },

    resetFocusStreak: () => {
        set({ focusStreak: 0 });
    },
}));
