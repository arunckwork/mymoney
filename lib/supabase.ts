import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Client-side Supabase with auth cookies wired for middleware compatibility.
export const supabase = createClientComponentClient();

