import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from './database.types';
import { getEnv } from './env';

/**
 * The one Supabase client for the app, pointed at atlas-dev in development.
 * Sessions persist in AsyncStorage and refresh automatically while the app
 * is in the foreground.
 *
 * Usage: import { supabase } from '@/data/supabase';
 */
const { supabaseUrl, supabaseAnonKey } = getEnv();

// Typed from src/data/database.types.ts (regenerate: npx supabase gen types typescript --remote).
// The types list pin_hash, failed_pin_count and locked_until, but the database
// refuses them to every signed-in role. Never select them from the app.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// On a phone, timers pause in the background, so refresh only while the app
// is in front. The web handles this itself.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
