import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://asodefqkwvgbbnbupupk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Tm3oOK3iJE7R7ppGAFeqpQ_IN1A0hPa';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});