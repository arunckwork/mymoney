import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase-config';

export { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase-config';

export function createSupabaseBrowserClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
