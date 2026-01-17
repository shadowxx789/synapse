import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
const canUseAsyncStorage = Platform.OS !== 'web' || typeof window !== 'undefined';

if (!isSupabaseConfigured) {
    console.warn('[Supabase] Missing EXPO_PUBLIC_SUPABASE_* env vars.');
}

const clientUrl = supabaseUrl ?? 'http://localhost';
const clientKey = supabaseKey ?? 'public-anon-key';

export const supabase = createClient(clientUrl, clientKey, {
    auth: {
        storage: canUseAsyncStorage ? AsyncStorage : undefined,
        autoRefreshToken: canUseAsyncStorage,
        persistSession: canUseAsyncStorage,
        detectSessionInUrl: false,
    },
});
