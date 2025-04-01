import { supabase } from './supabase';
import { toast } from 'sonner';

export interface MatchedUser {
  matched_user_id: string;
  match_score: number;
  username: string;
  avatar_url: string;
  bio: string;
}

// Keep track of polling interval
let matchPollingInterval: NodeJS.Timeout | null = null;

// Enhanced logging for matching operations
const logMatchingEvent = async (event: string, details: any) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('matching_presence_logs').insert({
      event_type: `matching_${event}`,
      user_id: user.id,
      details: {
        timestamp: new Date().toISOString(),
        ...details
      }
    });

    console.log(`🔄 Matching Event [${event}]:`, details);
  } catch (error) {
    console.error('Failed to log matching event:', error);
  }
};

export async function findMatch(role: 'hero' | 'uplifter'): Promise<MatchedUser | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    await logMatchingEvent('search_start', { 
      role, 
      userId: user.id
    });

    // First ensure user's role is set in users table
    const { error: roleError } = await supabase
      .from('users')
      .update({ role })
      .eq('id', user.id);

    if (roleError) {
      await logMatchingEvent('role_update_error', { error: roleError });
      throw roleError;
    }

    // Clean up any existing presence
    await cleanupPresence();

    // Add a delay to ensure cleanup is complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    await logMatchingEvent('presence_cleanup_complete', {
      userId: user.id
    });

    // Call the Supabase function to find a match
    const { data: matches, error: matchError } = await supabase
      .rpc('find_active_match', {
        search_user_id: user.id,
        search_role: role
      });

    if (matchError) {
      await logMatchingEvent('match_query_error', { error: matchError });
      throw matchError;
    }

    await logMatchingEvent('potential_matches', {
      count: matches?.length || 0,
      matches: matches?.map(m => ({
        id: m.matched_user_id,
        username: m.username,
        score: m.match_score
      }))
    });

    if (!matches || matches.length === 0) {
      await logMatchingEvent('no_immediate_match', {
        userId: user.id,
        role
      });
      startPolling(user.id, role);
      return null;
    }

    const match = matches[0];
    if (!match) return null;

    // Double-check match is still available
    const { data: matchPresence } = await supabase
      .from('matching_presence')
      .select('status, role')
      .eq('user_id', match.matched_user_id)
      .single();

    if (!matchPresence || matchPresence.status !== 'searching') {
      await logMatchingEvent('match_no_longer_available', {
        matchId: match.matched_user_id,
        status: matchPresence?.status,
        role: matchPresence?.role
      });
      return null;
    }

    await logMatchingEvent('match_established', {
      user1: {
        id: user.id,
        role: role
      },
      user2: {
        id: match.matched_user_id,
        username: match.username,
        role: matchPresence.role
      }
    });

    stopPolling();
    return match;

  } catch (error) {
    await logMatchingEvent('error', { error: error.message });
    await cleanupPresence();
    stopPolling();
    toast.error('Failed to find match. Please try again.');
    return null;
  }
}

function startPolling(userId: string, role: string) {
  stopPolling();

  console.log('⏱️ Starting match polling:', {
    userId,
    role,
    timestamp: new Date().toISOString()
  });

  matchPollingInterval = setInterval(async () => {
    try {
      // Call the Supabase function to find a match
      const { data: matches, error: matchError } = await supabase
        .rpc('find_active_match', {
          search_user_id: userId,
          search_role: role
        });

      if (matchError) throw matchError;

      if (matches && matches.length > 0) {
        const match = matches[0];

        // Double-check match is still available
        const { data: matchPresence } = await supabase
          .from('matching_presence')
          .select('status, role')
          .eq('user_id', match.matched_user_id)
          .single();

        if (!matchPresence || matchPresence.status !== 'searching') {
          await logMatchingEvent('polling_match_unavailable', {
            matchId: match.matched_user_id,
            status: matchPresence?.status
          });
          return;
        }

        await logMatchingEvent('polling_match_found', {
          matchId: match.matched_user_id,
          username: match.username
        });

        // Trigger match found event
        const event = new CustomEvent('matchFound', { 
          detail: match
        });
        window.dispatchEvent(event);
        stopPolling();
      }
    } catch (error) {
      await logMatchingEvent('polling_error', { error: error.message });
    }
  }, 2000);
}

function stopPolling() {
  if (matchPollingInterval) {
    clearInterval(matchPollingInterval);
    matchPollingInterval = null;
    console.log('⏹️ Stopped match polling:', {
      timestamp: new Date().toISOString()
    });
  }
}

export async function cleanupPresence() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await logMatchingEvent('cleanup_start', {
      userId: user.id
    });

    // Delete existing presence record
    const { error } = await supabase
      .from('matching_presence')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      await logMatchingEvent('cleanup_error', { error: error.message });
      throw error;
    }

    await logMatchingEvent('cleanup_complete', {
      userId: user.id
    });
  } catch (error) {
    await logMatchingEvent('cleanup_error', { error: error.message });
  }
}