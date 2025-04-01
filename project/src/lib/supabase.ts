import { createClient } from '@supabase/supabase-js';
import { RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Track user presence
let presenceChannel: RealtimeChannel | null = null;

export async function initializePresence() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // First, ensure we're not already in any channels
  if (presenceChannel) {
    await presenceChannel.unsubscribe();
    presenceChannel = null;
  }

  // Get user's current role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  // Create a new presence channel
  presenceChannel = supabase.channel('online-users', {
    config: {
      presence: {
        key: user.id,
      },
    },
  });

  // Set up presence tracking
  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const state = presenceChannel?.presenceState() || {};
      console.log('👥 Online users:', Object.keys(state).length);
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('🟢 User joined:', key, newPresences);
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('🔴 User left:', key, leftPresences);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel?.track({
          user_id: user.id,
          role: userData?.role || 'hero',
          online_at: new Date().toISOString(),
          client_id: Math.random().toString(36).substring(7)
        });
      }
    });
}

export function cleanupPresence() {
  if (presenceChannel) {
    presenceChannel.unsubscribe();
    presenceChannel = null;
  }
}