import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = "https://mfkjrpulfsnvzpsiclxx.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ma2pycHVsZnNudnpwc2ljbHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5OTk4NDIsImV4cCI6MjEwODU3NTg0Mn0.hm72ecXJuzA6e9Ab7Rx8KLJEcbKxAh-pAjab0dAJAOY";

// @ts-ignore
const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || (typeof process !== 'undefined' && process.env ? process.env.VITE_SUPABASE_URL : '') || DEFAULT_SUPABASE_URL;
// @ts-ignore
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' && process.env ? process.env.VITE_SUPABASE_ANON_KEY : '') || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

