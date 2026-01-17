import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

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

    // Presence connection
    _channel: RealtimeChannel | null;
    _role: 'executor' | 'supporter' | null;
    _coupleId: string | null;
    _userId: string | null;
    _heartbeatInterval: ReturnType<typeof setInterval> | null;

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

    // New Presence methods
    connectToPartner: (coupleId: string, userId: string, role: 'executor' | 'supporter') => void;
    disconnectFromPartner: () => void;
    supporterJoinSession: () => void;
    leaveSession: () => void;
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

    // Presence state
    _channel: null,
    _role: null,
    _coupleId: null,
    _userId: null,
    _heartbeatInterval: null,

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

    // ========================================================================
    // Presence Methods - Real-time connection with partner
    // ========================================================================

    connectToPartner: (coupleId, userId, role) => {
        const { _channel } = get();

        // Already connected
        if (_channel) {
            console.log('[Presence] Already connected');
            return;
        }

        if (!isSupabaseConfigured) {
            console.warn('[Presence] Supabase not configured, using mock mode');
            set({ _coupleId: coupleId, _userId: userId, _role: role });
            return;
        }

        console.log(`[Presence] Connecting as ${role} to couple:${coupleId}`);

        const channel = supabase.channel(`couple:${coupleId}`, {
            config: {
                presence: {
                    key: userId,
                },
            },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                console.log('[Presence] Sync:', state);

                // Find partner's presence
                const partnerPresence = Object.entries(state).find(
                    ([key]) => key !== userId
                );

                if (partnerPresence) {
                    const [, presences] = partnerPresence;
                    const latestPresence = (presences as unknown as Array<{ online_at: string; role: string; activity: PartnerActivity; body_doubling_active?: boolean }>)[0];
                    if (latestPresence) {
                        set({
                            partnerOnline: true,
                            partnerActivity: latestPresence.activity || 'idle',
                            lastPartnerActivity: new Date(latestPresence.online_at),
                            // If partner (executor) has body doubling active, we show it
                            bodyDoublingActive: latestPresence.body_doubling_active || get().bodyDoublingActive,
                        });
                    }
                } else {
                    set({ partnerOnline: false, partnerActivity: 'idle' });
                }
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                if (key !== userId) {
                    console.log('[Presence] Partner joined:', key);
                    const latest = newPresences[0] as { activity?: PartnerActivity; body_doubling_active?: boolean } | undefined;
                    set({
                        partnerOnline: true,
                        partnerActivity: latest?.activity || 'working',
                        lastPartnerActivity: new Date(),
                        bodyDoublingActive: latest?.body_doubling_active || get().bodyDoublingActive,
                    });
                }
            })
            .on('presence', { event: 'leave' }, ({ key }) => {
                if (key !== userId) {
                    console.log('[Presence] Partner left:', key);
                    // Wait 60 seconds before marking offline (per user requirement)
                    setTimeout(() => {
                        const currentState = get();
                        // Check if partner is still not online after 60s
                        if (currentState.lastPartnerActivity) {
                            const timeSinceLastActivity = Date.now() - currentState.lastPartnerActivity.getTime();
                            if (timeSinceLastActivity >= 60000) {
                                set({ partnerOnline: false, partnerActivity: 'away' });
                            }
                        }
                    }, 60000);
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[Presence] Subscribed, tracking presence');
                    await channel.track({
                        online_at: new Date().toISOString(),
                        role,
                        activity: 'idle',
                        body_doubling_active: false,
                    });

                    // Start heartbeat interval (every 30 seconds)
                    const heartbeatInterval = setInterval(async () => {
                        const state = get();
                        await channel.track({
                            online_at: new Date().toISOString(),
                            role: state._role,
                            activity: state._role === 'executor' ? 'working' : 'idle',
                            body_doubling_active: state.bodyDoublingActive,
                        });
                    }, 30000);

                    set({ _heartbeatInterval: heartbeatInterval });
                }
            });

        set({
            _channel: channel,
            _coupleId: coupleId,
            _userId: userId,
            _role: role,
        });
    },

    disconnectFromPartner: () => {
        const { _channel, _heartbeatInterval } = get();

        if (_heartbeatInterval) {
            clearInterval(_heartbeatInterval);
        }

        if (_channel) {
            console.log('[Presence] Disconnecting');
            _channel.unsubscribe();
        }

        set({
            _channel: null,
            _coupleId: null,
            _userId: null,
            _role: null,
            _heartbeatInterval: null,
            partnerOnline: false,
        });
    },

    supporterJoinSession: () => {
        const { _channel, _role, currentSession, bodyDoublingActive } = get();

        if (_role !== 'supporter') {
            console.warn('[Presence] Only supporter can join session');
            return;
        }

        console.log('[Presence] Supporter joining session');

        // Update local state
        set({
            currentSession: currentSession
                ? { ...currentSession, partnerJoinedAt: new Date() }
                : {
                    id: Date.now().toString(),
                    startTime: new Date(),
                    durationMinutes: 0,
                    partnerJoinedAt: new Date(),
                },
        });

        // Broadcast to partner
        if (_channel && isSupabaseConfigured) {
            _channel.track({
                online_at: new Date().toISOString(),
                role: 'supporter',
                activity: 'working',
                body_doubling_active: true,
                joined_session: true,
            });
        }
    },

    leaveSession: () => {
        const { _channel, _role, currentSession, sessionHistory, bodyDoublingStats } = get();

        console.log('[Presence] Leaving session');

        // Calculate session stats
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

        // Broadcast to partner
        if (_channel && isSupabaseConfigured) {
            _channel.track({
                online_at: new Date().toISOString(),
                role: _role,
                activity: 'idle',
                body_doubling_active: false,
                joined_session: false,
            });
        }
    },
}));
