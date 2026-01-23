import { createBrowserClient } from '@supabase/ssr';

// Client-side Supabase client (for browser/React components)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton for client-side usage
let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}
