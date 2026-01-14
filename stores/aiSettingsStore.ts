import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default system prompt for task shredding
export const DEFAULT_TASK_SHRED_PROMPT = `You are a task breakdown assistant designed for people with ADHD. 
Your job is to break down tasks into very small, atomic steps that take less than 2 minutes each.

Rules:
1. Each step must be concrete and actionable
2. Each step should take 1-2 minutes maximum
3. Use simple, clear language
4. Start each step with an action verb
5. Remove any ambiguity

Return a JSON array of steps in this format:
[{"title": "Step description", "estimatedMinutes": 1}]`;

// Default system prompt for AI reminder generation
export const DEFAULT_REMINDER_PROMPT = `你是一个温和的沟通助手，专门帮助 ADHD 伴侣之间进行非冲突性沟通。
你的任务是根据用户选择的风格，生成一条温和、鼓励性的提醒消息。

规则：
1. 语气要温和、支持性，避免任何指责或催促的感觉
2. 使用积极正面的语言
3. 可以适当使用 emoji 增加亲和力
4. 消息长度控制在 50 字以内
5. 要让接收者感到被理解和支持

直接返回生成的提醒消息文本，不要加任何额外说明。`;

// Default system prompt for safe communication (NVC-based)
export const DEFAULT_SAFE_COMMUNICATION_PROMPT = `你是一个专业的非暴力沟通（NVC）专家，帮助 ADHD 伴侣之间进行安全、有效的沟通。

用户会输入他们想表达的话，你需要生成三个不同版本的优化表达，帮助用户用更温和、更有建设性的方式传达同样的意思。

三个版本应该有不同的风格：
1. **温和询问版**：用"我"开头，表达感受和需求，询问对方的想法
2. **共情理解版**：先表达对对方的理解，再温和地提出自己的需求
3. **积极合作版**：强调一起解决问题，使用"我们"的视角

规则：
1. 保留用户原本想表达的核心意思
2. 去除任何指责、批评、以偏概全的语气
3. 使用"我感到..."、"我需要..."、"我希望..."等NVC句式
4. 每个版本控制在50字以内
5. 语言要自然，不要太正式
6. 可以适当使用emoji增加亲和力

返回JSON格式：
{
  "versions": [
    {"style": "温和询问", "text": "优化后的表达"},
    {"style": "共情理解", "text": "优化后的表达"},
    {"style": "积极合作", "text": "优化后的表达"}
  ]
}`;

export interface AIProvider {
    id: string;
    name: string;
    baseUrl: string;
    defaultModel: string;
}

// Pre-configured AI providers
export const AI_PROVIDERS: AIProvider[] = [
    {
        id: 'openai',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4o-mini',
    },
    {
        id: 'deepseek',
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        defaultModel: 'deepseek-chat',
    },
    {
        id: 'custom',
        name: '自定义 API',
        baseUrl: '',
        defaultModel: '',
    },
];

interface AISettingsState {
    // API Configuration
    providerId: string;
    apiKey: string;
    customBaseUrl: string;
    customModel: string;

    // Custom prompts
    taskShredPrompt: string;
    reminderPrompt: string;
    safeCommunicationPrompt: string;

    // Computed
    isConfigured: boolean;

    // Actions
    setProvider: (providerId: string) => void;
    setApiKey: (apiKey: string) => void;
    setCustomBaseUrl: (url: string) => void;
    setCustomModel: (model: string) => void;
    setTaskShredPrompt: (prompt: string) => void;
    setReminderPrompt: (prompt: string) => void;
    setSafeCommunicationPrompt: (prompt: string) => void;
    resetTaskShredPromptToDefault: () => void;
    resetReminderPromptToDefault: () => void;
    resetSafeCommunicationPromptToDefault: () => void;
    getEffectiveConfig: () => { baseUrl: string; model: string; apiKey: string };
}

export const useAISettingsStore = create<AISettingsState>()(
    persist(
        (set, get) => ({
            providerId: 'openai',
            apiKey: '',
            customBaseUrl: '',
            customModel: '',
            taskShredPrompt: DEFAULT_TASK_SHRED_PROMPT,
            reminderPrompt: DEFAULT_REMINDER_PROMPT,
            safeCommunicationPrompt: DEFAULT_SAFE_COMMUNICATION_PROMPT,

            get isConfigured() {
                const state = get();
                return !!state.apiKey;
            },

            setProvider: (providerId) => set({ providerId }),

            setApiKey: (apiKey) => set({ apiKey }),

            setCustomBaseUrl: (customBaseUrl) => set({ customBaseUrl }),

            setCustomModel: (customModel) => set({ customModel }),

            setTaskShredPrompt: (taskShredPrompt) => set({ taskShredPrompt }),

            setReminderPrompt: (reminderPrompt) => set({ reminderPrompt }),

            setSafeCommunicationPrompt: (safeCommunicationPrompt) => set({ safeCommunicationPrompt }),

            resetTaskShredPromptToDefault: () => set({ taskShredPrompt: DEFAULT_TASK_SHRED_PROMPT }),

            resetReminderPromptToDefault: () => set({ reminderPrompt: DEFAULT_REMINDER_PROMPT }),

            resetSafeCommunicationPromptToDefault: () => set({ safeCommunicationPrompt: DEFAULT_SAFE_COMMUNICATION_PROMPT }),

            getEffectiveConfig: () => {
                const state = get();
                const provider = AI_PROVIDERS.find(p => p.id === state.providerId);

                if (state.providerId === 'custom') {
                    return {
                        baseUrl: state.customBaseUrl || 'https://api.openai.com/v1',
                        model: state.customModel || 'gpt-4o-mini',
                        apiKey: state.apiKey,
                    };
                }

                return {
                    baseUrl: provider?.baseUrl || 'https://api.openai.com/v1',
                    model: state.customModel || provider?.defaultModel || 'gpt-4o-mini',
                    apiKey: state.apiKey,
                };
            },
        }),
        {
            name: 'synapse-ai-settings',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                providerId: state.providerId,
                apiKey: state.apiKey,
                customBaseUrl: state.customBaseUrl,
                customModel: state.customModel,
                taskShredPrompt: state.taskShredPrompt,
                reminderPrompt: state.reminderPrompt,
                safeCommunicationPrompt: state.safeCommunicationPrompt,
            }),
        }
    )
);
