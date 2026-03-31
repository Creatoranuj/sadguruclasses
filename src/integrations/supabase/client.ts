import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://wegamscqtvqhxowlskfm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZ2Ftc2NxdHZxaHhvd2xza2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MTk4OTIsImV4cCI6MjA4ODA5NTg5Mn0.PgGpSDtx1JpLRsV2w7RAoZ2Y-M3HeiBNVKWqAquc_zc";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
