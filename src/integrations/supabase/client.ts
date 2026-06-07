import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { mockSupabase } from '@/mocks/mockClient';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

const DEMO_MODE =
  import.meta.env.VITE_DEMO_MODE === 'true' ||
  !import.meta.env.VITE_SUPABASE_URL;

const realClient = DEMO_MODE
  ? null
  : createClient<Database>(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
      {
        auth: {
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    );

export const supabase = (DEMO_MODE ? mockSupabase : realClient) as ReturnType<
  typeof createClient<Database>
>;