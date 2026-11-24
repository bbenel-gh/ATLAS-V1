import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { getEnv } from './env';

/**
 * The one Supabase client for the app, pointed at atlas-dev in development.
 * Sessions persist in AsyncStorage and refresh automatically while the app
 * is in the foreground.
 *
 * Usage: import { supabase } from '@/data/supabase';
 */
const { supabaseUrl, supabaseAnonKey } = getEnv();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
