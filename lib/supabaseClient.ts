import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;
if (!supabaseUrl || !supabaseKey) {
	if (typeof window === 'undefined') {
		console.warn('[supabaseClient] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars. Supabase disabled.');
	}
} else {
	supabase = createClient(supabaseUrl, supabaseKey);
}

export { supabase };