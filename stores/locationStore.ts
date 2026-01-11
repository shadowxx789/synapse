import { create } from 'zustand';

export interface GeoFence {
    id: string;
    name: string;
    icon: string;
    latitude: number;
    longitude: number;
    radius: number; // meters
    tasks: string[];
    isActive: boolean;
    triggeredAt?: Date;
    completedTasks?: string[];
}

export type PartnerActivity = 'idle' | 'working' | 'break' | 'away';

export interface BodyDoublingSession {
    id: string;
    startTime: Date;
    endTime?: Date;
    durationMinutes: number;
    partnerJoinedAt?: Date;
    focusScore?: number; // 1-5 rating at end of session
}

export interface BodyDoublingStats {
    totalSessions: number;
    totalMinutes: number;
    avgSessionLength: number;
    longestSession: number;
    thisWeekMinutes: number;
    streak: number; // consecutive days with body doubling
}

interface LocationState {
    currentLocation: {
        latitude: number;
        longitude: number;
    } | null;
    geoFences: GeoFence[];
    bodyDoublingActive: boolean;
    partnerOnline: boolean;
    lastPartnerActivity: Date | null;
    partnerActivity: PartnerActivity;
    partnerHeartbeat: Date | null;
    currentSession: BodyDoublingSession | null;
    sessionHistory: BodyDoublingSession[];
    bodyDoublingStats: BodyDoublingStats;
    supporterMessage: string;

    setCurrentLocation: (lat: number, lng: number) => void;
    addGeoFence: (fence: Omit<GeoFence, 'id'>) => void;
    removeGeoFence: (id: string) => void;
    updateGeoFence: (id: string, updates: Partial<GeoFence>) => void;
    toggleBodyDoubling: () => void;
    setPartnerOnline: (online: boolean) => void;
    checkGeoFences: () => GeoFence[];
    updatePartnerActivity: (activity: PartnerActivity) => void;
    sendHeartbeat: () => void;
    endSession: (focusScore?: number) => void;
    setSupporterMessage: (message: string) => void;
    getSessionStats: () => BodyDoublingStats;
    completeGeoFenceTask: (fenceId: string, task: string) => void;
}

// Default geo-fences
const DEFAULT_GEOFENCES: GeoFence[] = [
    {
        id: '1',
        name: '超市',
        icon: '🛒',
        latitude: 31.2304,
        longitude: 121.4737,
        radius: 100,
        tasks: ['买牛奶', '买鸡蛋', '买面包'],
        isActive: true,
    },
    {
        id: '2',
        name: '药店',
        icon: '💊',
        latitude: 31.2310,
        longitude: 121.4750,
        radius: 50,
        tasks: ['Omega-3 鱼油', '维生素D'],
        isActive: true,
    },
    {
        id: '3',
        name: '公司',
        icon: '🏢',
        latitude: 31.2350,
        longitude: 121.4800,
        radius: 200,
        tasks: ['提交周报', '整理桌面'],
        isActive: true,
    },
];

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

export const useLocationStore = create<LocationState>((set, get) => ({
    currentLocation: null,
    geoFences: DEFAULT_GEOFENCES,
    bodyDoublingActive: false,
    partnerOnline: false,
    lastPartnerActivity: null,
    partnerActivity: 'idle',
    partnerHeartbeat: null,
    currentSession: null,
    sessionHistory: [],
    bodyDoublingStats: {
        totalSessions: 0,
        totalMinutes: 0,
        avgSessionLength: 0,
        longestSession: 0,
        thisWeekMinutes: 0,
        streak: 0,
    },
    supporterMessage: '',

    setCurrentLocation: (latitude, longitude) => {
        set({ currentLocation: { latitude, longitude } });
    },

    addGeoFence: (fence) => {
        const newFence: GeoFence = {
            ...fence,
            id: Date.now().toString(),
            completedTasks: [],
        };
        set((state) => ({
            geoFences: [...state.geoFences, newFence],
        }));
    },

    removeGeoFence: (id) => {
        set((state) => ({
            geoFences: state.geoFences.filter((f) => f.id !== id),
        }));
    },

    updateGeoFence: (id, updates) => {
        set((state) => ({
            geoFences: state.geoFences.map((f) =>
                f.id === id ? { ...f, ...updates } : f
            ),
        }));
    },

    toggleBodyDoubling: () => {
        const { bodyDoublingActive, currentSession, sessionHistory, bodyDoublingStats } = get();

        if (!bodyDoublingActive) {
            // Starting a new session
            const newSession: BodyDoublingSession = {
                id: Date.now().toString(),
                startTime: new Date(),
                durationMinutes: 0,
            };
            set({
                bodyDoublingActive: true,
                currentSession: newSession,
            });
        } else {
            // Ending current session
            if (currentSession) {
                const duration = Math.round(
                    (Date.now() - new Date(currentSession.startTime).getTime()) / 60000
                );
                const completedSession = {
                    ...currentSession,
                    endTime: new Date(),
                    durationMinutes: duration,
                };

                const newHistory = [...sessionHistory, completedSession];
                const newTotalMinutes = bodyDoublingStats.totalMinutes + duration;
                const newTotalSessions = bodyDoublingStats.totalSessions + 1;

                set({
                    bodyDoublingActive: false,
                    partnerOnline: false,
                    currentSession: null,
                    sessionHistory: newHistory,
                    bodyDoublingStats: {
                        ...bodyDoublingStats,
                        totalSessions: newTotalSessions,
                        totalMinutes: newTotalMinutes,
                        avgSessionLength: Math.round(newTotalMinutes / newTotalSessions),
                        longestSession: Math.max(bodyDoublingStats.longestSession, duration),
                        thisWeekMinutes: bodyDoublingStats.thisWeekMinutes + duration,
                    },
                });
            } else {
                set({ bodyDoublingActive: false, partnerOnline: false });
            }
        }
    },

    setPartnerOnline: (online) => {
        const { currentSession } = get();
        set({
            partnerOnline: online,
            lastPartnerActivity: online ? new Date() : get().lastPartnerActivity,
            partnerActivity: online ? 'working' : 'away',
            currentSession: online && currentSession && !currentSession.partnerJoinedAt
                ? { ...currentSession, partnerJoinedAt: new Date() }
                : currentSession,
        });
    },

    checkGeoFences: () => {
        const { currentLocation, geoFences } = get();
        if (!currentLocation) return [];

        return geoFences.filter((fence) => {
            if (!fence.isActive) return false;
            const distance = calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                fence.latitude,
                fence.longitude
            );
            return distance <= fence.radius;
        });
    },

    updatePartnerActivity: (activity) => {
        set({
            partnerActivity: activity,
            lastPartnerActivity: new Date(),
        });
    },

    sendHeartbeat: () => {
        set({ partnerHeartbeat: new Date() });
    },

    endSession: (focusScore) => {
        const { currentSession, sessionHistory, bodyDoublingStats } = get();

        if (currentSession) {
            const duration = Math.round(
                (Date.now() - new Date(currentSession.startTime).getTime()) / 60000
            );
            const completedSession = {
                ...currentSession,
                endTime: new Date(),
                durationMinutes: duration,
                focusScore,
            };

            const newHistory = [...sessionHistory, completedSession];
            const newTotalMinutes = bodyDoublingStats.totalMinutes + duration;
            const newTotalSessions = bodyDoublingStats.totalSessions + 1;

            set({
                bodyDoublingActive: false,
                partnerOnline: false,
                currentSession: null,
                sessionHistory: newHistory,
                bodyDoublingStats: {
                    ...bodyDoublingStats,
                    totalSessions: newTotalSessions,
                    totalMinutes: newTotalMinutes,
                    avgSessionLength: Math.round(newTotalMinutes / newTotalSessions),
                    longestSession: Math.max(bodyDoublingStats.longestSession, duration),
                    thisWeekMinutes: bodyDoublingStats.thisWeekMinutes + duration,
                },
            });
        }
    },

    setSupporterMessage: (message) => {
        set({ supporterMessage: message });
    },

    getSessionStats: () => {
        return get().bodyDoublingStats;
    },

    completeGeoFenceTask: (fenceId, task) => {
        set((state) => ({
            geoFences: state.geoFences.map((f) =>
                f.id === fenceId
                    ? { ...f, completedTasks: [...(f.completedTasks || []), task] }
                    : f
            ),
        }));
    },
}));
