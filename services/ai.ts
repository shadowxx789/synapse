// AI Service for Task Shredding
// Breaks down large tasks into <2 minute atomic steps

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

export interface ShredResult {
    originalTask: string;
    subtasks: {
        title: string;
        estimatedMinutes: number;
        order: number;
    }[];
}

export async function shredTask(taskDescription: string): Promise<ShredResult> {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a task breakdown assistant designed for people with ADHD. 
Your job is to break down tasks into very small, atomic steps that take less than 2 minutes each.

Rules:
1. Each step must be concrete and actionable
2. Each step should take 1-2 minutes maximum
3. Use simple, clear language
4. Start each step with an action verb
5. Remove any ambiguity

Return a JSON array of steps in this format:
[{"title": "Step description", "estimatedMinutes": 1}]`
                    },
                    {
                        role: 'user',
                        content: `Break down this task into atomic steps: "${taskDescription}"`
                    }
                ],
                temperature: 0.7,
                response_format: { type: "json_object" }
            }),
        });

        const data = await response.json();
        const parsed = JSON.parse(data.choices[0].message.content);

        return {
            originalTask: taskDescription,
            subtasks: (parsed.steps || parsed.subtasks || []).map((step: any, index: number) => ({
                title: step.title || step.step || step.description,
                estimatedMinutes: step.estimatedMinutes || step.minutes || 2,
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
