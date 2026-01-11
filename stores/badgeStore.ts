import { create } from 'zustand';

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    requirement: number; // days or count
    requirementType: 'peaceful_days' | 'tasks_completed' | 'streak' | 'support_points' | 'body_doubling' | 'communication';
    isUnlocked: boolean;
    unlockedAt?: Date;
    progress?: number; // current progress towards requirement
    reward?: {
        title: string;
        description: string;
        icon: string;
        isRedeemed?: boolean;
        redeemedAt?: Date;
    };
    tier: 'bronze' | 'silver' | 'gold' | 'platinum'; // Badge tier for visual distinction
}

export interface Milestone {
    id: string;
    title: string;
    description: string;
    target: number;
    current: number;
    icon: string;
    celebrationMessage: string;
}

export interface SharedReward {
    id: string;
    title: string;
    description: string;
    icon: string;
    requiredBadges: string[]; // Badge IDs required to unlock
    isUnlocked: boolean;
    isRedeemed: boolean;
    redeemedAt?: Date;
}

interface BadgeState {
    badges: Badge[];
    currentStreak: number;
    totalTasksCompleted: number;
    peacefulDays: number;
    supportPointsTotal: number;
    bodyDoublingMinutes: number;
    communicationScore: number;
    milestones: Milestone[];
    sharedRewards: SharedReward[];
    celebrationQueue: Badge[];

    checkAndUnlockBadges: () => Badge[];
    incrementStreak: () => void;
    resetStreak: () => void;
    incrementTasksCompleted: () => void;
    setPeacefulDays: (days: number) => void;
    addSupportPoints: (points: number) => void;
    addBodyDoublingMinutes: (minutes: number) => void;
    updateCommunicationScore: (score: number) => void;
    redeemReward: (badgeId: string) => void;
    redeemSharedReward: (rewardId: string) => void;
    getNextMilestone: () => Milestone | null;
    getUnredeemedBadges: () => Badge[];
    popCelebration: () => Badge | null;
}

const DEFAULT_BADGES: Badge[] = [
    // Peace badges (Bronze -> Platinum progression)
    {
        id: 'peace-1',
        name: '和平使者',
        description: '连续 3 天无冲突沟通',
        icon: '🕊️',
        requirement: 3,
        requirementType: 'peaceful_days',
        isUnlocked: false,
        tier: 'bronze',
        reward: {
            title: '一起看电影',
            description: '选一部你们都喜欢的电影，享受二人时光',
            icon: '🎬',
        },
    },
    {
        id: 'peace-2',
        name: '黄金伴侣',
        description: '连续 7 天无冲突沟通',
        icon: '💛',
        requirement: 7,
        requirementType: 'peaceful_days',
        isUnlocked: false,
        tier: 'silver',
        reward: {
            title: '约会晚餐',
            description: '去一家新餐厅，享受美食和彼此的陪伴',
            icon: '🍽️',
        },
    },
    {
        id: 'peace-3',
        name: '同频达人',
        description: '连续 14 天无冲突沟通',
        icon: '💎',
        requirement: 14,
        requirementType: 'peaceful_days',
        isUnlocked: false,
        tier: 'gold',
        reward: {
            title: '周末小旅行',
            description: '计划一次短途旅行，创造美好回忆',
            icon: '✈️',
        },
    },
    {
        id: 'peace-4',
        name: '心灵契合',
        description: '连续 30 天无冲突沟通',
        icon: '💖',
        requirement: 30,
        requirementType: 'peaceful_days',
        isUnlocked: false,
        tier: 'platinum',
        reward: {
            title: '特别纪念日',
            description: '一次难忘的庆祝活动，纪念你们的成长',
            icon: '🎊',
        },
    },
    // Task completion badges
    {
        id: 'task-1',
        name: '任务新手',
        description: '完成 10 个任务',
        icon: '🌱',
        requirement: 10,
        requirementType: 'tasks_completed',
        isUnlocked: false,
        tier: 'bronze',
    },
    {
        id: 'task-2',
        name: '执行高手',
        description: '完成 50 个任务',
        icon: '⭐',
        requirement: 50,
        requirementType: 'tasks_completed',
        isUnlocked: false,
        tier: 'silver',
    },
    {
        id: 'task-3',
        name: '任务大师',
        description: '完成 100 个任务',
        icon: '👑',
        requirement: 100,
        requirementType: 'tasks_completed',
        isUnlocked: false,
        tier: 'gold',
        reward: {
            title: '心愿礼物',
            description: '获得一份你期待已久的礼物',
            icon: '🎁',
        },
    },
    // Streak badges
    {
        id: 'streak-1',
        name: '连续作战',
        description: '连续 5 天完成任务',
        icon: '🔥',
        requirement: 5,
        requirementType: 'streak',
        isUnlocked: false,
        tier: 'bronze',
    },
    {
        id: 'streak-2',
        name: '习惯养成',
        description: '连续 21 天完成任务',
        icon: '🏆',
        requirement: 21,
        requirementType: 'streak',
        isUnlocked: false,
        tier: 'gold',
        reward: {
            title: '庆祝派对',
            description: '邀请朋友一起庆祝这个里程碑！',
            icon: '🎉',
        },
    },
    // Support badges
    {
        id: 'support-1',
        name: '贴心支持',
        description: '累计获得 100 支持点',
        icon: '💝',
        requirement: 100,
        requirementType: 'support_points',
        isUnlocked: false,
        tier: 'bronze',
    },
    {
        id: 'support-2',
        name: '超级后盾',
        description: '累计获得 500 支持点',
        icon: '🛡️',
        requirement: 500,
        requirementType: 'support_points',
        isUnlocked: false,
        tier: 'silver',
        reward: {
            title: 'SPA放松',
            description: '一次放松的按摩或SPA体验',
            icon: '💆',
        },
    },
    // Body doubling badges
    {
        id: 'double-1',
        name: '陪伴新手',
        description: '累计远程陪同 60 分钟',
        icon: '👥',
        requirement: 60,
        requirementType: 'body_doubling',
        isUnlocked: false,
        tier: 'bronze',
    },
    {
        id: 'double-2',
        name: '陪伴达人',
        description: '累计远程陪同 300 分钟',
        icon: '🤝',
        requirement: 300,
        requirementType: 'body_doubling',
        isUnlocked: false,
        tier: 'silver',
    },
    // Communication badges
    {
        id: 'comm-1',
        name: '沟通新星',
        description: '使用 10 次建议表达',
        icon: '💬',
        requirement: 10,
        requirementType: 'communication',
        isUnlocked: false,
        tier: 'bronze',
    },
    {
        id: 'comm-2',
        name: '沟通专家',
        description: '使用 50 次建议表达',
        icon: '🗣️',
        requirement: 50,
        requirementType: 'communication',
        isUnlocked: false,
        tier: 'gold',
        reward: {
            title: '亲密对话',
            description: '安排一次不带手机的深度交流时光',
            icon: '❤️‍🔥',
        },
    },
];

const DEFAULT_MILESTONES: Milestone[] = [
    {
        id: 'm1',
        title: '第一周',
        description: '使用 Synapse 一周',
        target: 7,
        current: 0,
        icon: '📅',
        celebrationMessage: '恭喜你们坚持使用一周了！',
    },
    {
        id: 'm2',
        title: '任务小能手',
        description: '完成 25 个任务',
        target: 25,
        current: 0,
        icon: '✅',
        celebrationMessage: '已经完成 25 个任务，你们是很棒的团队！',
    },
    {
        id: 'm3',
        title: '首月达成',
        description: '使用 Synapse 一个月',
        target: 30,
        current: 0,
        icon: '🗓️',
        celebrationMessage: '一个月的陪伴，你们越来越默契了！',
    },
];

const DEFAULT_SHARED_REWARDS: SharedReward[] = [
    {
        id: 'sr1',
        title: '情侣电影之夜',
        description: '一起选一部电影，准备爆米花和饮料',
        icon: '🍿',
        requiredBadges: ['peace-1', 'task-1'],
        isUnlocked: false,
        isRedeemed: false,
    },
    {
        id: 'sr2',
        title: '美食探索',
        description: '尝试一家新餐厅或一起做一道新菜',
        icon: '👨‍🍳',
        requiredBadges: ['peace-2', 'streak-1'],
        isUnlocked: false,
        isRedeemed: false,
    },
    {
        id: 'sr3',
        title: '户外冒险',
        description: '一起去徒步、骑行或探索新地方',
        icon: '🏕️',
        requiredBadges: ['peace-3', 'task-2', 'double-1'],
        isUnlocked: false,
        isRedeemed: false,
    },
];

export const useBadgeStore = create<BadgeState>((set, get) => ({
    badges: DEFAULT_BADGES,
    currentStreak: 0,
    totalTasksCompleted: 0,
    peacefulDays: 3, // Demo value
    supportPointsTotal: 0,
    bodyDoublingMinutes: 0,
    communicationScore: 0,
    milestones: DEFAULT_MILESTONES,
    sharedRewards: DEFAULT_SHARED_REWARDS,
    celebrationQueue: [],

    checkAndUnlockBadges: () => {
        const {
            badges,
            currentStreak,
            totalTasksCompleted,
            peacefulDays,
            supportPointsTotal,
            bodyDoublingMinutes,
            communicationScore,
            sharedRewards,
        } = get();
        const newlyUnlocked: Badge[] = [];

        const updatedBadges = badges.map((badge) => {
            if (badge.isUnlocked) return badge;

            let shouldUnlock = false;
            let progress = 0;

            switch (badge.requirementType) {
                case 'peaceful_days':
                    progress = peacefulDays;
                    shouldUnlock = peacefulDays >= badge.requirement;
                    break;
                case 'tasks_completed':
                    progress = totalTasksCompleted;
                    shouldUnlock = totalTasksCompleted >= badge.requirement;
                    break;
                case 'streak':
                    progress = currentStreak;
                    shouldUnlock = currentStreak >= badge.requirement;
                    break;
                case 'support_points':
                    progress = supportPointsTotal;
                    shouldUnlock = supportPointsTotal >= badge.requirement;
                    break;
                case 'body_doubling':
                    progress = bodyDoublingMinutes;
                    shouldUnlock = bodyDoublingMinutes >= badge.requirement;
                    break;
                case 'communication':
                    progress = communicationScore;
                    shouldUnlock = communicationScore >= badge.requirement;
                    break;
            }

            if (shouldUnlock) {
                newlyUnlocked.push({ ...badge, isUnlocked: true, unlockedAt: new Date(), progress });
                return { ...badge, isUnlocked: true, unlockedAt: new Date(), progress };
            }

            return { ...badge, progress };
        });

        // Check shared rewards
        const updatedSharedRewards = sharedRewards.map(reward => {
            if (reward.isUnlocked) return reward;

            const allBadgesUnlocked = reward.requiredBadges.every(badgeId =>
                updatedBadges.find(b => b.id === badgeId)?.isUnlocked
            );

            if (allBadgesUnlocked) {
                return { ...reward, isUnlocked: true };
            }
            return reward;
        });

        set({
            badges: updatedBadges,
            sharedRewards: updatedSharedRewards,
            celebrationQueue: [...get().celebrationQueue, ...newlyUnlocked],
        });
        return newlyUnlocked;
    },

    incrementStreak: () => {
        set((state) => ({ currentStreak: state.currentStreak + 1 }));
        get().checkAndUnlockBadges();
    },

    resetStreak: () => {
        set({ currentStreak: 0 });
    },

    incrementTasksCompleted: () => {
        set((state) => ({
            totalTasksCompleted: state.totalTasksCompleted + 1,
            milestones: state.milestones.map(m =>
                m.id === 'm2' ? { ...m, current: state.totalTasksCompleted + 1 } : m
            ),
        }));
        get().checkAndUnlockBadges();
    },

    setPeacefulDays: (days) => {
        set({
            peacefulDays: days,
            milestones: get().milestones.map(m =>
                m.id === 'm1' || m.id === 'm3' ? { ...m, current: days } : m
            ),
        });
        get().checkAndUnlockBadges();
    },

    addSupportPoints: (points) => {
        set((state) => ({ supportPointsTotal: state.supportPointsTotal + points }));
        get().checkAndUnlockBadges();
    },

    addBodyDoublingMinutes: (minutes) => {
        set((state) => ({ bodyDoublingMinutes: state.bodyDoublingMinutes + minutes }));
        get().checkAndUnlockBadges();
    },

    updateCommunicationScore: (score) => {
        set((state) => ({ communicationScore: state.communicationScore + score }));
        get().checkAndUnlockBadges();
    },

    redeemReward: (badgeId) => {
        set((state) => ({
            badges: state.badges.map(badge =>
                badge.id === badgeId && badge.reward
                    ? {
                        ...badge,
                        reward: {
                            ...badge.reward,
                            isRedeemed: true,
                            redeemedAt: new Date()
                        }
                    }
                    : badge
            ),
        }));
    },

    redeemSharedReward: (rewardId) => {
        set((state) => ({
            sharedRewards: state.sharedRewards.map(reward =>
                reward.id === rewardId
                    ? { ...reward, isRedeemed: true, redeemedAt: new Date() }
                    : reward
            ),
        }));
    },

    getNextMilestone: () => {
        const { milestones } = get();
        return milestones.find(m => m.current < m.target) || null;
    },

    getUnredeemedBadges: () => {
        const { badges } = get();
        return badges.filter(b =>
            b.isUnlocked &&
            b.reward &&
            !b.reward.isRedeemed
        );
    },

    popCelebration: () => {
        const { celebrationQueue } = get();
        if (celebrationQueue.length === 0) return null;

        const [first, ...rest] = celebrationQueue;
        set({ celebrationQueue: rest });
        return first;
    },
}));
