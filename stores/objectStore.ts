import { create } from 'zustand';

export interface ObjectAnchor {
    id: string;
    name: string;
    icon: string;
    description?: string;
    imageUri?: string;
    location: string;
    category: 'keys' | 'medicine' | 'wallet' | 'documents' | 'electronics' | 'other';
    airtagId?: string;
    lastSeen?: Date;
    createdAt: Date;
}

interface ObjectState {
    objects: ObjectAnchor[];
    addObject: (obj: Omit<ObjectAnchor, 'id' | 'createdAt'>) => void;
    updateObject: (id: string, updates: Partial<ObjectAnchor>) => void;
    removeObject: (id: string) => void;
    findObject: (id: string) => ObjectAnchor | undefined;
    getByCategory: (category: ObjectAnchor['category']) => ObjectAnchor[];
}

// Default objects
const DEFAULT_OBJECTS: ObjectAnchor[] = [
    {
        id: '1',
        name: '钥匙',
        icon: '🔑',
        description: '家门钥匙和车钥匙',
        location: '玄关钥匙盒',
        category: 'keys',
        createdAt: new Date(),
    },
    {
        id: '2',
        name: '钱包',
        icon: '👛',
        description: '棕色皮钱包',
        location: '卧室床头柜',
        category: 'wallet',
        createdAt: new Date(),
    },
    {
        id: '3',
        name: '药物',
        icon: '💊',
        description: '每日服用的药物',
        location: '厨房最上层柜子',
        category: 'medicine',
        createdAt: new Date(),
    },
    {
        id: '4',
        name: '耳机',
        icon: '🎧',
        description: 'AirPods Pro',
        location: '书桌充电座',
        category: 'electronics',
        airtagId: 'airtag-001',
        createdAt: new Date(),
    },
];

export const useObjectStore = create<ObjectState>((set, get) => ({
    objects: DEFAULT_OBJECTS,

    addObject: (obj) => {
        const newObject: ObjectAnchor = {
            ...obj,
            id: Date.now().toString(),
            createdAt: new Date(),
        };
        set((state) => ({
            objects: [...state.objects, newObject],
        }));
    },

    updateObject: (id, updates) => {
        set((state) => ({
            objects: state.objects.map((o) =>
                o.id === id ? { ...o, ...updates } : o
            ),
        }));
    },

    removeObject: (id) => {
        set((state) => ({
            objects: state.objects.filter((o) => o.id !== id),
        }));
    },

    findObject: (id) => {
        return get().objects.find((o) => o.id === id);
    },

    getByCategory: (category) => {
        return get().objects.filter((o) => o.category === category);
    },
}));
