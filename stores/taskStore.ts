import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TaskStatus = 'pending' | 'doing' | 'done';

export interface Task {
    id: string;
    parentTaskId?: string;
    title: string;
    description?: string;
    creatorId: string;
    executorId: string;
    visualTimerMinutes: number;
    status: TaskStatus;
    createdAt: Date;
    completedAt?: Date;
    subtasks?: Task[];
}

interface TaskState {
    // Local state
    tasks: Task[];
    currentTask: Task | null;
    currentSubtaskIndex: number;

    // Sync state
    isSyncing: boolean;
    lastSyncAt: Date | null;

    // Actions
    setTasks: (tasks: Task[]) => void;
    addTask: (task: Task) => void;
    updateTask: (id: string, updates: Partial<Task>) => void;
    removeTask: (id: string) => void;
    setCurrentTask: (task: Task | null) => void;
    nextSubtask: () => void;
    prevSubtask: () => void;
    completeCurrentSubtask: () => void;
    setSyncing: (syncing: boolean) => void;
    setLastSyncAt: (date: Date) => void;

    // Merge remote tasks with local (for offline-first sync)
    mergeRemoteTasks: (remoteTasks: Task[]) => void;
}

export const useTaskStore = create<TaskState>()(
    persist(
        (set, get) => ({
            tasks: [],
            currentTask: null,
            currentSubtaskIndex: 0,
            isSyncing: false,
            lastSyncAt: null,

            setTasks: (tasks) => set({ tasks }),

            addTask: (task) => set((state) => ({
                tasks: [...state.tasks, task]
            })),

            updateTask: (id, updates) => set((state) => ({
                tasks: state.tasks.map((t) =>
                    t.id === id ? { ...t, ...updates } : t
                ),
                // Also update currentTask if it's the one being updated
                currentTask: state.currentTask?.id === id
                    ? { ...state.currentTask, ...updates }
                    : state.currentTask,
            })),

            removeTask: (id) => set((state) => ({
                tasks: state.tasks.filter((t) => t.id !== id),
                currentTask: state.currentTask?.id === id ? null : state.currentTask,
            })),

            setCurrentTask: (task) => set({
                currentTask: task,
                currentSubtaskIndex: 0
            }),

            nextSubtask: () => set((state) => {
                const subtasks = state.currentTask?.subtasks || [];
                if (state.currentSubtaskIndex < subtasks.length - 1) {
                    return { currentSubtaskIndex: state.currentSubtaskIndex + 1 };
                }
                return state;
            }),

            prevSubtask: () => set((state) => {
                if (state.currentSubtaskIndex > 0) {
                    return { currentSubtaskIndex: state.currentSubtaskIndex - 1 };
                }
                return state;
            }),

            completeCurrentSubtask: () => {
                const state = get();
                const subtasks = state.currentTask?.subtasks || [];
                const currentSubtask = subtasks[state.currentSubtaskIndex];

                if (currentSubtask) {
                    // Update the subtask status
                    const updatedSubtasks = subtasks.map((s, i) =>
                        i === state.currentSubtaskIndex
                            ? { ...s, status: 'done' as TaskStatus, completedAt: new Date() }
                            : s
                    );

                    // Update currentTask with new subtasks
                    set((state) => ({
                        currentTask: state.currentTask
                            ? { ...state.currentTask, subtasks: updatedSubtasks }
                            : null,
                    }));

                    // Auto advance to next subtask
                    get().nextSubtask();
                }
            },

            setSyncing: (isSyncing) => set({ isSyncing }),

            setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),

            mergeRemoteTasks: (remoteTasks) => {
                const localTasks = get().tasks;
                const localTaskMap = new Map(localTasks.map((t) => [t.id, t]));

                // Merge strategy: remote wins for existing tasks, add new remote tasks
                const mergedTasks = remoteTasks.map((remoteTask) => {
                    const localTask = localTaskMap.get(remoteTask.id);
                    if (!localTask) return remoteTask;

                    // If local task was modified after last sync, keep local changes
                    // Otherwise, use remote version
                    return remoteTask;
                });

                // Add any local tasks that don't exist remotely (created offline)
                const remoteIds = new Set(remoteTasks.map((t) => t.id));
                const localOnlyTasks = localTasks.filter((t) => !remoteIds.has(t.id));

                set({
                    tasks: [...mergedTasks, ...localOnlyTasks],
                    lastSyncAt: new Date(),
                });
            },
        }),
        {
            name: 'synapse-task-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                tasks: state.tasks,
                lastSyncAt: state.lastSyncAt,
            }),
        }
    )
);
