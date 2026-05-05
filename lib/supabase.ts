import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type UserRole = 'user' | 'merchant';

export type Profile = {
  id: string;
  email: string | null;
  role: UserRole;
  display_name: string | null;
  avatar_key?: string | null;
  created_at?: string;
};

export type EventRecord = {
  id: string;
  merchant_id: string;
  title: string;
  location: string;
  date: string;
  description: string;
  cover_color: string;
  scan_secret: string;
  created_at?: string;
};

export type StampRecord = {
  id: string;
  event_id: string;
  name: string;
  img_key: string;
  position: number;
  created_at?: string;
};

export type UserStampRecord = {
  id: string;
  user_id: string;
  event_id: string;
  stamp_id: string;
  collected_at: string;
};

export type UserEventProgress = {
  id: string;
  user_id: string;
  event_id: string;
  joined_at: string;
};
