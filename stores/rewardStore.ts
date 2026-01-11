import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Reward {
    id: string;
    coupleId?: string;
    title: string;
    description: string;
    pointsCost: number;
    icon: string;
    createdBy: string;
    isRedeemed: boolean;
    redeemedAt?: Date;
    synced?: boolean;
}

interface RewardState {
    rewards: Reward[];
    isSyncing: boolean;

    addReward: (reward: Omit<Reward, 'id' | 'isRedeemed' | 'synced'>) => void;
    removeReward: (id: string) => void;
    redeemReward: (id: string) => void;
    getAvailableRewards: () => Reward[];
    setRewards: (rewards: Reward[]) => void;
    markRewardSynced: (id: string) => void;
    setSyncing: (syncing: boolean) => void;
    mergeRemoteRewards: (remoteRewards: Reward[]) => void;
}

// Default rewards (used when offline and no rewards exist)
const DEFAULT_REWARDS: Reward[] = [
    {
        id: 'default_1',
        title: '30分钟游戏时间',
        description: '可以不被打扰地玩游戏',
        pointsCost: 50,
        icon: '🎮',
        createdBy: 'supporter',
        isRedeemed: false,
        synced: true,
    },
    {
        id: 'default_2',
        title: '选择今晚晚餐',
        description: '今天你来决定吃什么',
        pointsCost: 30,
        icon: '🍜',
        createdBy: 'supporter',
        isRedeemed: false,
        synced: true,
    },
    {
        id: 'default_3',
        title: '一次按摩',
        description: '15分钟的肩颈按摩',
        pointsCost: 80,
        icon: '💆',
        createdBy: 'supporter',
        isRedeemed: false,
        synced: true,
    },
    {
        id: 'default_4',
        title: '周末睡懒觉',
        description: '可以睡到自然醒',
        pointsCost: 60,
        icon: '😴',
        createdBy: 'supporter',
        isRedeemed: false,
        synced: true,
    },
];

export const useRewardStore = create<RewardState>()(
    persist(
        (set, get) => ({
            rewards: DEFAULT_REWARDS,
            isSyncing: false,

            addReward: (reward) => {
                const newReward: Reward = {
                    ...reward,
                    id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    isRedeemed: false,
                    synced: false,
                };
                set((state) => ({
                    rewards: [...state.rewards, newReward],
                }));
            },

            removeReward: (id) => {
                set((state) => ({
                    rewards: state.rewards.filter((r) => r.id !== id),
                }));
            },

            redeemReward: (id) => {
                set((state) => ({
                    rewards: state.rewards.map((r) =>
                        r.id === id
                            ? { ...r, isRedeemed: true, redeemedAt: new Date(), synced: false }
                            : r
                    ),
                }));
            },

            getAvailableRewards: () => {
                return get().rewards.filter((r) => !r.isRedeemed);
            },

            setRewards: (rewards) => set({ rewards }),

            markRewardSynced: (id) => {
                set((state) => ({
                    rewards: state.rewards.map((r) =>
                        r.id === id ? { ...r, synced: true } : r
                    ),
                }));
            },

            setSyncing: (isSyncing) => set({ isSyncing }),

            mergeRemoteRewards: (remoteRewards) => {
                const localRewards = get().rewards;

                // Get unsynced local rewards (excluding defaults)
                const unsyncedLocal = localRewards.filter(
                    (r) => !r.synced && !r.id.startsWith('default_')
                );

                // Remote rewards + unsynced local rewards
                const merged = [...remoteRewards, ...unsyncedLocal];

                // If no rewards at all, use defaults
                if (merged.length === 0) {
                    set({ rewards: DEFAULT_REWARDS });
                } else {
                    set({ rewards: merged });
                }
            },
        }),
        {
            name: 'synapse-reward-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                rewards: state.rewards,
            }),
        }
    )
);
