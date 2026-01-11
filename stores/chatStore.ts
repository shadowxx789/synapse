import { create } from 'zustand';

export interface Message {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    originalContent?: string;  // If message was modified
    wasIntercepted: boolean;
    interceptReason?: string;
    timestamp: Date;
    emotion?: EmotionType;
    supportPoints?: number; // Points earned for using suggested language
}

export type EmotionType = 'neutral' | 'positive' | 'negative' | 'frustrated' | 'supportive' | 'grateful';

export interface ConflictPattern {
    pattern: string;
    category: 'blame' | 'accusation' | 'criticism' | 'generalization';
    suggestion: string;
    severity: number; // 1-3, higher = more severe
}

export interface EmotionInsight {
    id: string;
    date: Date;
    emotion: EmotionType;
    trigger?: string;
    note?: string;
}

export interface CommunicationStats {
    totalMessages: number;
    interceptedCount: number;
    usedSuggestionCount: number;
    avgMessagesPerDay: number;
    mostCommonConflictType: string;
    improvementRate: number; // Percentage improvement over time
}

export interface CommunicationTip {
    id: string;
    title: string;
    content: string;
    category: 'nvc' | 'adhd' | 'general'; // Non-violent communication, ADHD-specific, general
    isCompleted: boolean;
}

interface ChatState {
    messages: Message[];
    conflictPatterns: ConflictPattern[];
    conflictCount: number;
    lastConflictDate: Date | null;
    peacefulDays: number;
    emotionInsights: EmotionInsight[];
    communicationStats: CommunicationStats;
    communicationTips: CommunicationTip[];
    currentMood: EmotionType;
    dailyReflectionDone: boolean;

    addMessage: (msg: Omit<Message, 'id' | 'timestamp' | 'wasIntercepted'>) => Message;
    checkForConflict: (content: string) => { isConflict: boolean; pattern?: ConflictPattern; severity?: number };
    getSuggestion: (pattern: ConflictPattern) => string;
    getAlternativeSuggestions: (pattern: ConflictPattern) => string[];
    incrementPeacefulDays: () => void;
    resetPeacefulDays: () => void;
    logEmotion: (emotion: EmotionType, trigger?: string, note?: string) => void;
    analyzeEmotionFromText: (text: string) => EmotionType;
    getWeeklyInsight: () => { trend: string; suggestion: string };
    markTipCompleted: (tipId: string) => void;
    setCurrentMood: (mood: EmotionType) => void;
    completeDailyReflection: () => void;
    getConflictHeatmap: () => { hour: number; count: number }[];
}

// Conflict detection patterns with severity levels
const DEFAULT_PATTERNS: ConflictPattern[] = [
    // Blame patterns - High severity
    { pattern: '你怎么又', category: 'blame', suggestion: '我注意到这件事又发生了，我们能一起想想怎么避免吗？', severity: 3 },
    { pattern: '你总是', category: 'generalization', suggestion: '我感觉这种情况发生过几次，让我担心...', severity: 3 },
    { pattern: '你从来不', category: 'generalization', suggestion: '我希望你能更多地...', severity: 3 },
    { pattern: '你就是', category: 'criticism', suggestion: '我注意到一个情况，想和你讨论一下', severity: 3 },
    { pattern: '说了多少遍', category: 'blame', suggestion: '这件事对我来说很重要，我想找个时间认真讨论', severity: 3 },
    // Medium severity
    { pattern: '你能不能', category: 'accusation', suggestion: '我需要你的帮助，可以...', severity: 2 },
    { pattern: '烦死了', category: 'criticism', suggestion: '我现在感到有些沮丧，需要一点时间', severity: 2 },
    { pattern: '你看看你', category: 'criticism', suggestion: '我想和你分享我的感受', severity: 2 },
    { pattern: '怎么回事', category: 'accusation', suggestion: '发生了什么情况？我想了解一下', severity: 2 },
    { pattern: '又忘了', category: 'blame', suggestion: '这件事情还没完成，我们一起看看怎么解决？', severity: 2 },
    // Lower severity
    { pattern: '算了吧', category: 'criticism', suggestion: '虽然有些失望，但我们可以一起想办法', severity: 1 },
    { pattern: '无所谓', category: 'criticism', suggestion: '我理解你可能累了，我们稍后再讨论？', severity: 1 },
    // English patterns
    { pattern: 'you always', category: 'generalization', suggestion: 'I\'ve noticed this happens sometimes, and I\'d like to talk about it', severity: 3 },
    { pattern: 'you never', category: 'generalization', suggestion: 'I would appreciate if you could...', severity: 3 },
    { pattern: 'why can\'t you', category: 'accusation', suggestion: 'I need your help with...', severity: 2 },
    { pattern: 'so frustrating', category: 'criticism', suggestion: 'I\'m feeling a bit overwhelmed right now', severity: 1 },
];

const DEFAULT_TIPS: CommunicationTip[] = [
    {
        id: '1',
        title: '使用"我"开头的句子',
        content: '用"我感到..."代替"你让我..."，减少对方的防御心理。例如："我感到担心"比"你总是让我担心"更容易被接受。',
        category: 'nvc',
        isCompleted: false,
    },
    {
        id: '2',
        title: '理解ADHD的时间盲视',
        content: 'ADHD患者对时间的感知与常人不同，"5分钟"对他们来说可能感觉很短。试着使用具体的提醒方式而非责备。',
        category: 'adhd',
        isCompleted: false,
    },
    {
        id: '3',
        title: '选择合适的沟通时机',
        content: '避免在对方刚起床、疲惫或专注于其他事情时讨论重要问题。询问"现在方便聊一下吗？"是个好习惯。',
        category: 'general',
        isCompleted: false,
    },
    {
        id: '4',
        title: '表达需求而非抱怨',
        content: '将"你又忘了倒垃圾"转换为"我需要你帮我记住每周三倒垃圾，可以设个提醒吗？"',
        category: 'nvc',
        isCompleted: false,
    },
    {
        id: '5',
        title: '认可努力而非只看结果',
        content: 'ADHD伴侣在完成任务时付出的努力往往比常人更多。即使结果不完美，也要认可他们的努力。',
        category: 'adhd',
        isCompleted: false,
    },
];

// Alternative suggestions for each conflict type
const ALTERNATIVE_SUGGESTIONS: Record<string, string[]> = {
    blame: [
        '我注意到我们可能需要一起想办法解决这个问题',
        '这让我有些担心，我们能聊聊吗？',
        '我想理解发生了什么，可以告诉我吗？',
    ],
    accusation: [
        '我希望得到你的帮助',
        '如果你能...我会很感激',
        '我们可以一起想个办法吗？',
    ],
    criticism: [
        '我现在需要一点时间来整理情绪',
        '我想和你分享我的感受，但不是在指责你',
        '让我们冷静一下再讨论',
    ],
    generalization: [
        '最近几次发生的事让我有些困扰',
        '我希望我们能一起改善这个情况',
        '我理解可能有原因，但我想表达我的感受',
    ],
};

// Emotion keywords for analysis
const EMOTION_KEYWORDS: Record<EmotionType, string[]> = {
    positive: ['谢谢', '感谢', '爱你', '开心', '高兴', '太棒了', 'thank', 'love', 'happy', 'great', '❤️', '😊', '🥰'],
    negative: ['难过', '伤心', '失望', '不开心', 'sad', 'upset', 'disappointed', '😢', '😔'],
    frustrated: ['烦', '累了', '受够了', '崩溃', 'frustrated', 'tired', 'enough', '😤', '😩'],
    supportive: ['加油', '我在', '没关系', '慢慢来', '支持你', 'support', 'here for you', '💪', '🤗'],
    grateful: ['辛苦了', '谢谢你', '真好', 'appreciate', 'thankful', '🙏'],
    neutral: [],
};

export const useChatStore = create<ChatState>((set, get) => ({
    messages: [],
    conflictPatterns: DEFAULT_PATTERNS,
    conflictCount: 0,
    lastConflictDate: null,
    peacefulDays: 3, // Start with some peaceful days for demo
    emotionInsights: [],
    communicationStats: {
        totalMessages: 0,
        interceptedCount: 0,
        usedSuggestionCount: 0,
        avgMessagesPerDay: 0,
        mostCommonConflictType: 'blame',
        improvementRate: 0,
    },
    communicationTips: DEFAULT_TIPS,
    currentMood: 'neutral',
    dailyReflectionDone: false,

    addMessage: (msg) => {
        const { checkForConflict, analyzeEmotionFromText, communicationStats } = get();
        const conflictCheck = checkForConflict(msg.content);
        const emotion = analyzeEmotionFromText(msg.content);

        const newMessage: Message = {
            ...msg,
            id: Date.now().toString(),
            timestamp: new Date(),
            wasIntercepted: conflictCheck.isConflict,
            interceptReason: conflictCheck.pattern?.category,
            originalContent: conflictCheck.isConflict ? msg.content : undefined,
            emotion,
        };

        const newStats = { ...communicationStats };
        newStats.totalMessages += 1;

        if (conflictCheck.isConflict) {
            newStats.interceptedCount += 1;
            set((state) => ({
                conflictCount: state.conflictCount + 1,
                lastConflictDate: new Date(),
                peacefulDays: 0,
                communicationStats: newStats,
            }));
        } else {
            set({ communicationStats: newStats });
        }

        set((state) => ({
            messages: [...state.messages, newMessage],
        }));

        return newMessage;
    },

    checkForConflict: (content) => {
        const { conflictPatterns } = get();
        const lowerContent = content.toLowerCase();

        for (const pattern of conflictPatterns) {
            if (lowerContent.includes(pattern.pattern.toLowerCase())) {
                return { isConflict: true, pattern, severity: pattern.severity };
            }
        }

        return { isConflict: false };
    },

    getSuggestion: (pattern) => {
        return pattern.suggestion;
    },

    getAlternativeSuggestions: (pattern) => {
        return ALTERNATIVE_SUGGESTIONS[pattern.category] || [];
    },

    incrementPeacefulDays: () => {
        set((state) => ({
            peacefulDays: state.peacefulDays + 1,
        }));
    },

    resetPeacefulDays: () => {
        set({ peacefulDays: 0 });
    },

    logEmotion: (emotion, trigger, note) => {
        const insight: EmotionInsight = {
            id: Date.now().toString(),
            date: new Date(),
            emotion,
            trigger,
            note,
        };
        set((state) => ({
            emotionInsights: [...state.emotionInsights, insight],
            currentMood: emotion,
        }));
    },

    analyzeEmotionFromText: (text) => {
        const lowerText = text.toLowerCase();

        // Check each emotion type in order of priority
        const emotionOrder: EmotionType[] = ['frustrated', 'negative', 'grateful', 'supportive', 'positive'];

        for (const emotion of emotionOrder) {
            const keywords = EMOTION_KEYWORDS[emotion];
            if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
                return emotion;
            }
        }

        return 'neutral';
    },

    getWeeklyInsight: () => {
        const { emotionInsights, communicationStats, peacefulDays } = get();

        // Analyze last 7 days
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const recentInsights = emotionInsights.filter(i => new Date(i.date) >= weekAgo);
        const frustrationCount = recentInsights.filter(i => i.emotion === 'frustrated').length;
        const positiveCount = recentInsights.filter(i => i.emotion === 'positive' || i.emotion === 'grateful').length;

        let trend = '稳定';
        let suggestion = '继续保持良好的沟通习惯！';

        if (peacefulDays >= 7) {
            trend = '非常好';
            suggestion = '你们的沟通越来越好了！考虑一起庆祝一下？';
        } else if (frustrationCount > positiveCount) {
            trend = '需要关注';
            suggestion = '这周可能有些压力，试着安排一些轻松的共处时光。';
        } else if (communicationStats.usedSuggestionCount > 3) {
            trend = '进步中';
            suggestion = '你在积极使用建议语言，这对改善沟通很有帮助！';
        }

        return { trend, suggestion };
    },

    markTipCompleted: (tipId) => {
        set((state) => ({
            communicationTips: state.communicationTips.map(tip =>
                tip.id === tipId ? { ...tip, isCompleted: true } : tip
            ),
        }));
    },

    setCurrentMood: (mood) => {
        set({ currentMood: mood });
    },

    completeDailyReflection: () => {
        set({ dailyReflectionDone: true });
    },

    getConflictHeatmap: () => {
        const { messages } = get();
        const hourlyConflicts: Record<number, number> = {};

        // Initialize all hours
        for (let i = 0; i < 24; i++) {
            hourlyConflicts[i] = 0;
        }

        // Count conflicts by hour
        messages.filter(m => m.wasIntercepted).forEach(msg => {
            const hour = new Date(msg.timestamp).getHours();
            hourlyConflicts[hour] = (hourlyConflicts[hour] || 0) + 1;
        });

        return Object.entries(hourlyConflicts).map(([hour, count]) => ({
            hour: parseInt(hour),
            count,
        }));
    },
}));
