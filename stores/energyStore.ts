import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ActionType = 'instruction_shred' | 'item_finding' | 'body_doubling' | 'task_reminder';

interface EnergyAction {
    id: string;
    coupleId?: string;
    userId: string;
    actionType: ActionType;
    points: number;
    timestamp: Date;
    description?: string;
    synced?: boolean;
}

interface EnergyState {
    totalPoints: number;
    actions: EnergyAction[];
    isSyncing: boolean;

    addPoints: (action: Omit<EnergyAction, 'id' | 'timestamp' | 'synced'>) => void;
    resetPoints: () => void;
    getPointsByType: (type: ActionType) => number;
    setActions: (actions: EnergyAction[]) => void;
    markActionSynced: (id: string) => void;
    setSyncing: (syncing: boolean) => void;
    mergeRemoteActions: (remoteActions: EnergyAction[]) => void;
}

// Points for each action type
export const ACTION_POINTS: Record<ActionType, number> = {
    instruction_shred: 10,
    item_finding: 5,
    body_doubling: 15,
    task_reminder: 3,
};

export const useEnergyStore = create<EnergyState>()(
    persist(
        (set, get) => ({
            totalPoints: 0,
            actions: [],
            isSyncing: false,

            addPoints: (action) => {
                const newAction: EnergyAction = {
                    ...action,
                    id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: new Date(),
                    synced: false,
                };
                set((state) => ({
                    totalPoints: state.totalPoints + action.points,
                    actions: [...state.actions, newAction],
                }));
            },

            resetPoints: () => set({ totalPoints: 0, actions: [] }),

            getPointsByType: (type) => {
                return get().actions
                    .filter((a) => a.actionType === type)
                    .reduce((sum, a) => sum + a.points, 0);
            },

            setActions: (actions) => {
                const total = actions.reduce((sum, a) => sum + a.points, 0);
                set({ actions, totalPoints: total });
            },

            markActionSynced: (id) => {
                set((state) => ({
                    actions: state.actions.map((a) =>
                        a.id === id ? { ...a, synced: true } : a
                    ),
                }));
            },

            setSyncing: (isSyncing) => set({ isSyncing }),

            mergeRemoteActions: (remoteActions) => {
                const localActions = get().actions;

                // Get unsynced local actions
                const unsyncedLocal = localActions.filter((a) => !a.synced);

                // Remote actions + unsynced local actions
                const merged = [...remoteActions, ...unsyncedLocal];

                // Recalculate total
                const total = merged.reduce((sum, a) => sum + a.points, 0);

                set({
                    actions: merged,
                    totalPoints: total,
                });
            },
        }),
        {
            name: 'synapse-energy-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                actions: state.actions,
                totalPoints: state.totalPoints,
            }),
        }
    )
);
