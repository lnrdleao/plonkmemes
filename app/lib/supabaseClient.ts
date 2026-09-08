import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bfwdlanqfokvmxhzfdie.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmd2RsYW5xZm9rdm14aHpmZGllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3OTM4NTcsImV4cCI6MjEwNDM2OTg1N30.uQEduoqmdNY9pErx0p8LUlJTADg_Rpg0CcNYs7QiB6E';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
