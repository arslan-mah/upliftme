import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { findMatch, MatchedUser, cleanupPresence } from '../lib/matching';
import { initializeDaily, cleanupDaily, initializeLocalVideo } from '../lib/daily';
import { toast } from 'sonner';

interface SessionState {
  isActive: boolean;
  timeRemaining: number;
  currentSession: any | null;
  matchedUser: MatchedUser | null;
  isSearching: boolean;
  currentRole: 'hero' | 'uplifter' | null;
  hasSubscription: boolean;
  sessionCredits: number;
  isDevelopment: boolean;
  videoClient: any | null;
  startSession: (role: 'hero' | 'uplifter') => Promise<void>;
  endSession: (rating?: number, payment?: any) => Promise<void>;
  cancelMatch: () => Promise<void>;
  initializeVideoCall: (container: HTMLElement) => Promise<any>;
  switchRole: () => Promise<void>;
  loadCurrentRole: () => Promise<void>;
  checkSessionAvailability: () => Promise<{ canStart: boolean; reason?: string }>;
  loadUserSubscription: () => Promise<void>;
  toggleDevelopmentMode: () => void;
}

const useSessionStore = create<SessionState>((set, get) => ({
  isActive: false,
  timeRemaining: 7 * 60,
  currentSession: null,
  matchedUser: null,
  isSearching: false,
  currentRole: null,
  hasSubscription: false,
  sessionCredits: 0,
  isDevelopment: false,
  videoClient: null,

  toggleDevelopmentMode: () => {
    set(state => ({ 
      isDevelopment: !state.isDevelopment,
      hasSubscription: !state.isDevelopment,
      sessionCredits: !state.isDevelopment ? 999 : 0
    }));
  },
 
  loadUserSubscription: async () => {
    const { isDevelopment } = get();
    if (isDevelopment) {
        set({ hasSubscription: true, sessionCredits: 999 });
        return;
    }

    try {
        const response = await fetch(`/api/subscription`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` // Pass JWT token
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch subscription data');
        }

        const data = await response.json();
        
        if (data) {
            set({
                hasSubscription: data.hasSubscription,
                sessionCredits: data.sessionCredits || 0
            });
        }
    } catch (error) {
        console.error('Failed to load subscription:', error);
    }
},

checkSessionAvailability: async () => {
  const { isDevelopment } = get();
  if (isDevelopment) {
      return { canStart: true, reason: 'development' };
  }

  try {
      const response = await fetch(`/api/session-availability`, {
          method: 'GET',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}` // Pass JWT token
          }
      });

      if (!response.ok) {
          throw new Error('Failed to check session availability');
      }

      const data = await response.json();

      if (!data) return { canStart: false, reason: 'no_user_data' };

      if (data.subscription_status === 'active') {
          return { canStart: true };
      }

      if (data.sessions_remaining > 0) {
          return { canStart: true, reason: 'free_trial' };
      }

      return { canStart: false, reason: 'no_subscription' };
  } catch (error) {
      console.error('Failed to check session availability:', error);
      return { canStart: false, reason: 'error' };
  }
},


  startSession: async (role: 'hero' | 'uplifter') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('🔍 Starting match search for role:', role);
      set({ isSearching: true, currentRole: role });

      // Update user's role
      const { error: updateError } = await supabase
        .from('users')
        .update({ role })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Clean up any existing presence first
      await cleanupPresence();

      // Add a delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Set up match found listener
      const handleMatchFound = async (event: CustomEvent<MatchedUser>) => {
        const match = event.detail;
        console.log('✨ Match found:', match);
        set({ matchedUser: match });

        // Create session record
        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .insert({
            hero_id: role === 'hero' ? user.id : match.matched_user_id,
            uplifter_id: role === 'uplifter' ? user.id : match.matched_user_id,
            status: 'active',
            started_at: new Date().toISOString()
          })
          .select('*, uplifter:uplifter_id(username)')
          .single();

        if (sessionError) throw sessionError;

        console.log('✅ Session created:', session);
        toast.success('Match found! Starting session...');

        set({
          isActive: true,
          timeRemaining: 7 * 60,
          currentSession: session,
          isSearching: false
        });

        // Remove listener
        window.removeEventListener('matchFound', handleMatchFound as EventListener);
      };

      window.addEventListener('matchFound', handleMatchFound as EventListener);

      // Start searching for match
      const match = await findMatch(role);
      if (match) {
        console.log('🎯 Direct match found:', match);
        await handleMatchFound(new CustomEvent('matchFound', { detail: match }));
      } else {
        console.log('⏳ No immediate match, polling started');
        toast.info('Searching for a match...', {
          description: 'Please wait while we find someone to connect with.'
        });
      }

    } catch (error) {
      await cleanupPresence(); // Clean up presence on error
      set({ isSearching: false, matchedUser: null });
      console.error('Failed to start session:', error);
      toast.error('Failed to start session. Please try again.');
      throw error;
    }
  },

  initializeVideoCall: async (container: HTMLElement) => {
    const { currentSession } = get();
    if (!currentSession?.id) {
      throw new Error('No session available');
    }

    try {
      console.log('🎥 Initializing video call for session:', currentSession.id);

      // First initialize local video preview
      await initializeLocalVideo(container);
      console.log('✅ Local video initialized');

      // Then initialize the full video call
      const client = await initializeDaily(container, currentSession.id);
      console.log('✅ Daily call initialized');
      
      set({ videoClient: client });
      return client;
    } catch (error) {
      console.error('Failed to initialize video call:', error);
      toast.error('Failed to start video call');
      throw error;
    }
  },

  endSession: async (rating?: number, payment?: any) => {
    const { currentSession, videoClient } = get();
    if (!currentSession) return;

    try {
      console.log('🔄 Ending session:', currentSession.id);

      // Clean up video call
      if (videoClient) {
        cleanupDaily();
      }

      // Clean up presence
      await cleanupPresence();

      // Update session record
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          rating,
          payment_intent_id: payment?.payment_intent_id,
          amount_paid: payment?.amount_paid,
          uplifter_earnings: payment?.uplifter_earnings,
          platform_fee: payment?.platform_fee
        })
        .eq('id', currentSession.id);

      if (updateError) throw updateError;

      console.log('✅ Session ended successfully');

      // Reset state but keep current role
      const currentRole = get().currentRole;
      set({
        isActive: false,
        timeRemaining: 0,
        currentSession: null,
        matchedUser: null,
        isSearching: false,
        currentRole,
        videoClient: null
      });
    } catch (error) {
      console.error('Failed to end session:', error);
      throw error;
    }
  },

  cancelMatch: async () => {
    try {
      console.log('🔄 Canceling match...');

      // Clean up presence
      await cleanupPresence();

      // Clean up video
      cleanupDaily();

      console.log('✅ Match canceled successfully');
      toast.info('Match canceled');

      // Reset state but keep current role
      const currentRole = get().currentRole;
      set({
        isActive: false,
        timeRemaining: 0,
        currentSession: null,
        matchedUser: null,
        isSearching: false,
        currentRole,
        videoClient: null
      });
    } catch (error) {
      console.error('Failed to cancel match:', error);
      // Still reset state even if cleanup fails
      const currentRole = get().currentRole;
      set({
        isActive: false,
        timeRemaining: 0,
        currentSession: null,
        matchedUser: null,
        isSearching: false,
        currentRole,
        videoClient: null
      });
    }
  },

  switchRole: async () => {
    const { currentRole } = get();
    if (!currentRole) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('🔄 Switching role from', currentRole);

      // Clean up any existing presence first
      await cleanupPresence();

      // Add a small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 1500));

      const newRole = currentRole === 'hero' ? 'uplifter' : 'hero';

      const { error: updateError } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', user.id);

      if (updateError) throw updateError;

      console.log('✅ Role switched to', newRole);
      set({ currentRole: newRole });
    } catch (error) {
      console.error('Failed to switch role:', error);
      throw error;
    }
  },

  loadCurrentRole: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userData?.role) {
        console.log('✅ Current role loaded:', userData.role);
        set({ currentRole: userData.role as 'hero' | 'uplifter' });
      }
    } catch (error) {
      console.error('Failed to load current role:', error);
    }
  }
}));

export { useSessionStore };