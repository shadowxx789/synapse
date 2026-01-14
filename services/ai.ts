// AI Service for Task Shredding
// Breaks down large tasks into <2 minute atomic steps

import { useAISettingsStore } from '@/stores/aiSettingsStore';

export interface ShredResult {
    originalTask: string;
    subtasks: {
        title: string;
        estimatedMinutes: number;
        order: number;
    }[];
}

type ShredStep = {
    title?: string;
    step?: string;
    description?: string;
    estimatedMinutes?: number | string;
    minutes?: number | string;
    time?: number | string;
};

const normalizeShredStep = (step: unknown, index: number) => {
    const stepData = typeof step === 'object' && step !== null ? (step as ShredStep) : null;
    const rawMinutes = stepData
        ? Number(stepData.estimatedMinutes ?? stepData.minutes ?? stepData.time)
        : Number.NaN;
    const estimatedMinutes = Number.isFinite(rawMinutes) && rawMinutes > 0 ? rawMinutes : 2;

    return {
        title: stepData?.title || stepData?.step || stepData?.description || String(step),
        estimatedMinutes,
        order: index + 1,
    };
};

export async function shredTask(taskDescription: string): Promise<ShredResult> {
    const { getEffectiveConfig, taskShredPrompt } = useAISettingsStore.getState();
    const config = getEffectiveConfig();

    // Check if API is configured
    if (!config.apiKey) {
        console.warn('AI API not configured, returning original task');
        return {
            originalTask: taskDescription,
            subtasks: [{
                title: taskDescription,
                estimatedMinutes: 5,
                order: 1,
            }],
        };
    }

    try {
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    {
                        role: 'system',
                        content: taskShredPrompt,
                    },
                    {
                        role: 'user',
                        content: `Break down this task into atomic steps: "${taskDescription}"`,
                    }
                ],
                temperature: 0.7,
                response_format: { type: "json_object" }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('AI API error:', response.status, errorText);
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (!content) {
            throw new Error('No content in response');
        }

        const parsed = JSON.parse(content);

        return {
            originalTask: taskDescription,
            subtasks: (parsed.steps || parsed.subtasks || parsed || []).map(normalizeShredStep),
        };
    } catch (error) {
        console.error('Task shredding failed:', error);
        // Fallback: return original task as single step
        return {
            originalTask: taskDescription,
            subtasks: [{
                title: taskDescription,
                estimatedMinutes: 5,
                order: 1,
            }],
        };
    }
}

// Conflict detection for chat buffer (Phase 4)
export async function detectConflict(message: string): Promise<{
    isConflict: boolean;
    suggestion?: string;
}> {
    const conflictPatterns = [
        '你怎么又', '你总是', '你从来不', '你就是',
        'why can\'t you', 'you always', 'you never'
    ];

    const hasConflict = conflictPatterns.some(pattern =>
        message.toLowerCase().includes(pattern.toLowerCase())
    );

    if (!hasConflict) {
        return { isConflict: false };
    }

    // In production, use AI to generate better suggestions
    return {
        isConflict: true,
        suggestion: '试试用"我感觉..."开头来表达你的需求，而不是指责对方。',
    };
}

// Reminder style types
export type ReminderStyle = 'gentle' | 'time' | 'encourage' | 'inquiry' | 'custom';

export interface GenerateReminderResult {
    success: boolean;
    message: string;
    error?: string;
}

// Generate AI-powered reminder message
export async function generateReminder(
    style: ReminderStyle,
    context?: string
): Promise<GenerateReminderResult> {
    const { getEffectiveConfig, reminderPrompt } = useAISettingsStore.getState();
    const config = getEffectiveConfig();

    // Check if API is configured
    if (!config.apiKey) {
        return {
            success: false,
            message: '',
            error: '请先配置 AI API',
        };
    }

    const styleDescriptions: Record<ReminderStyle, string> = {
        gentle: '温和型：轻松友好，像朋友一样询问',
        time: '时间型：温和地提醒时间，但不要有压力感',
        encourage: '鼓励型：给予支持和信心，相信对方能做到',
        inquiry: '询问型：关心对方状态，询问是否需要帮助',
        custom: context || '根据具体情况生成合适的提醒',
    };

    try {
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    {
                        role: 'system',
                        content: reminderPrompt,
                    },
                    {
                        role: 'user',
                        content: `请生成一条${styleDescriptions[style]}风格的提醒消息。${context ? `额外上下文：${context}` : ''}`,
                    }
                ],
                temperature: 0.8,
                max_tokens: 100,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('AI API error:', response.status, errorText);
            return {
                success: false,
                message: '',
                error: `API 请求失败: ${response.status}`,
            };
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();

        if (!content) {
            return {
                success: false,
                message: '',
                error: '未能生成消息',
            };
        }

        return {
            success: true,
            message: content,
        };
    } catch (error) {
        console.error('Generate reminder failed:', error);
        return {
            success: false,
            message: '',
            error: error instanceof Error ? error.message : '生成失败',
        };
    }
}

// Safe Communication Options Result
export interface SafeCommunicationOption {
    style: string;
    text: string;
}

export interface GenerateSafeCommunicationResult {
    success: boolean;
    options: SafeCommunicationOption[];
    error?: string;
}

// Generate 3 safe communication versions for user's message
export async function generateSafeCommunicationOptions(
    originalMessage: string
): Promise<GenerateSafeCommunicationResult> {
    const { getEffectiveConfig, safeCommunicationPrompt } = useAISettingsStore.getState();
    const config = getEffectiveConfig();

    // Check if API is configured
    if (!config.apiKey) {
        // Return fallback options when API is not configured
        return {
            success: true,
            options: getFallbackOptions(originalMessage),
        };
    }

    try {
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    {
                        role: 'system',
                        content: safeCommunicationPrompt,
                    },
                    {
                        role: 'user',
                        content: `请帮我优化这句话，生成三个不同版本的安全表达：\n\n"${originalMessage}"`,
                    }
                ],
                temperature: 0.8,
                response_format: { type: "json_object" },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('AI API error:', response.status, errorText);
            return {
                success: true,
                options: getFallbackOptions(originalMessage),
            };
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            return {
                success: true,
                options: getFallbackOptions(originalMessage),
            };
        }

        const parsed = JSON.parse(content);
        const versions = parsed.versions || parsed.options || [];

        if (versions.length === 0) {
            return {
                success: true,
                options: getFallbackOptions(originalMessage),
            };
        }

        return {
            success: true,
            options: versions.map((v: { style?: string; text?: string; content?: string }) => ({
                style: v.style || '优化版本',
                text: v.text || v.content || originalMessage,
            })),
        };
    } catch (error) {
        console.error('Generate safe communication failed:', error);
        return {
            success: true,
            options: getFallbackOptions(originalMessage),
        };
    }
}

// Fallback options when AI is not available
function getFallbackOptions(originalMessage: string): SafeCommunicationOption[] {
    // Simple NVC-style transformations
    const baseMessage = originalMessage
        .replace(/你怎么又/g, '')
        .replace(/你总是/g, '')
        .replace(/你从来不/g, '')
        .replace(/你就是/g, '')
        .trim();

    return [
        {
            style: '温和询问',
            text: `我想和你聊一下，${baseMessage ? baseMessage : '最近的情况'}，你方便吗？`,
        },
        {
            style: '共情理解',
            text: `我理解你可能很忙，不过我希望我们能一起看看${baseMessage ? baseMessage : '这件事'}`,
        },
        {
            style: '积极合作',
            text: `我们一起想想办法${baseMessage ? '，关于' + baseMessage : ''}，好吗？💪`,
        },
    ];
}
