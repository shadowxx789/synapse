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
            subtasks: (parsed.steps || parsed.subtasks || parsed || []).map((step: any, index: number) => ({
                title: step.title || step.step || step.description || step,
                estimatedMinutes: step.estimatedMinutes || step.minutes || step.time || 2,
                order: index + 1,
            })),
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
