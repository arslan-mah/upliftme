import React, { useState, useEffect } from 'react';
import { Heart, Shield, Crown, History as HistoryIcon, Settings as SettingsIcon, Loader, Star, RefreshCw, AlertCircle, BarChart as ChartBar, Code } from 'lucide-react';
import { useSessionStore } from '../store/session';
import VideoSession from './VideoSession';
import Settings from './Settings';
import History from './History';
import AdminDashboard from './AdminDashboard';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import EmotionalSlider from './EmotionalSlider';
import VideoCall from '../components/CallComponent';
const serverUri = import.meta.env.VITE_SERVER_URI;

interface UserStats {
  total_sessions: number;
  total_duration: number;
  average_rating: number;
  impact_score: number;
}

  


const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [wellbeingScore, setWellbeingScore] = useState<number | null>(null);
  const [showEmotionalModal, setShowEmotionalModal] = useState(false);
  const {
    startSession,
    isActive,
    isSearching,
    matchedUser,
    cancelMatch,
    currentRole,
    switchRole,
    loadCurrentRole,
    loadUserSubscription,
    hasSubscription,
    sessionCredits,
    checkSessionAvailability,
    isDevelopment,
    toggleDevelopmentMode
  } = useSessionStore();
  const [showVideoSession, setShowVideoSession] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);
  const [showSubscribePrompt, setShowSubscribePrompt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats>({
    total_sessions: 0,
    total_duration: 0,
    average_rating: 0,
    impact_score: 0
  });




  useEffect(() => {
    loadCurrentRole();
    loadUserSubscription();
    loadUserStats();
  }, [loadCurrentRole, loadUserSubscription]);

  const handleLogOut = async () => {
    console.log("Clicked Logout");

    try {
      const response = await fetch(`http://${serverUri}/api/user/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      // Clear stored user data
      // Redirect to login page
      window.location.href = "/login";

    } catch (error) {
      console.error("Logout error:", error);
      alert("Failed to log out. Please try again.");
    }
  };

  const loadUserStats = async () => {
    try {
      const response = await fetch(`http://${process.env.SERVER_URI}/api/hero/stats`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Ensures cookies (auth token) are sent with the request
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user statistics");
      }

      const userStats = await response.json();

      if (userStats) {
        setStats({
          total_sessions: userStats.total_sessions || 0,
          total_duration: Math.round(userStats.total_duration / 60) || 0,
          average_rating: userStats.average_rating || 0,
          impact_score: userStats.total_ratings || 0,
        });
      }
    } catch (error) {
      console.error("Error loading user stats:", error);
      toast.error("Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };


  const handleFindMatch = async () => {
    if (!currentRole) {
      toast.error('Please select a role first');
      return;
    }

    if (currentRole === 'hero' && wellbeingScore === null) {
      setShowEmotionalModal(true);
      return;
    }

    try {
      const availability = await checkSessionAvailability();

      if (!availability.canStart && !isDevelopment) {
        setShowSubscribePrompt(true);
        return;
      }

      if (availability.reason === 'free_trial') {
        toast.info('Using your free trial session!');
      }

      // Store initial wellbeing score for heroes
      if (currentRole === 'hero' && wellbeingScore !== null) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('emotional_tracking').insert({
            user_id: user.id,
            score: wellbeingScore,
            type: 'pre_session'
          });
        }
      }

      await startSession(currentRole);
      setShowVideoSession(true);
    } catch (error) {
      console.error('Failed to find match:', error);
      toast.error('Failed to find a match. Please try again.');
    }
  };

  const handleCloseSession = async () => {
    try {
      await cancelMatch();
      setShowVideoSession(false);
      loadUserStats(); // Reload stats after session
    } catch (error) {
      console.error('Error closing session:', error);
      toast.error('Error closing session');
      setShowVideoSession(false);
    }
  };

  const handleSwitchRole = async () => {
    try {
      setSwitchingRole(true);
      await switchRole();
      toast.success(`Switched to ${currentRole === 'hero' ? 'Uplifter' : 'Hero'} mode`);
    } catch (error) {
      console.error('Failed to switch role:', error);
      toast.error('Failed to switch role. Please try again.');
    } finally {
      setSwitchingRole(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'settings':
        return <Settings />;
      case 'history':
        return <History />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return (
          
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-8 flex justify-between items-center">
              <div>
                    
                <h1 className="text-3xl font-bold mb-2">Welcome Back!</h1>
                <p className="text-gray-600 dark:text-gray-300">Ready to make a difference today?</p>
              </div>
              <div>
                <button onClick={() => {
                  handleLogOut()
                }} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition">
                  Logout
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 8l4 4-4 4"></path>
                  </svg>
                </button>
              </div>
            </div>
            







                {<VideoCall />}









            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Start Session Card */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-white">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Start a Session</h2>
                  {currentRole === 'uplifter' ? (
                    <Heart className="w-6 h-6" />
                  ) : (
                    <Shield className="w-6 h-6" />
                  )}
                </div>
                <p className="mb-4 text-white/90">
                  {currentRole === 'uplifter'
                    ? 'Connect instantly with someone who needs your support'
                    : 'Connect with a supportive Uplifter who will motivate you'}
                </p>
                <button
                  onClick={handleFindMatch}
                  disabled={isSearching || isActive}
                  className="w-full py-3 px-4 bg-white text-purple-500 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {isSearching ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Finding Match...
                    </>
                  ) : isActive ? (
                    'Session in Progress'
                  ) : (
                    'Find Match'
                  )}
                </button>
              </div>

              {/* Role Switch Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Current Role</h2>
                  <button
                    onClick={handleSwitchRole}
                    disabled={isActive || isSearching || switchingRole}
                    className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center"
                  >
                    {switchingRole ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Switching...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Switch Role
                      </>
                    )}
                  </button>
                </div>
                <div className="flex items-center space-x-3">
                  {currentRole === 'uplifter' ? (
                    <Heart className="w-8 h-8 text-pink-500" />
                  ) : (
                    <Shield className="w-8 h-8 text-purple-500" />
                  )}
                  <div>
                    <p className="text-2xl font-bold capitalize">{currentRole || 'Hero'}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {currentRole === 'uplifter'
                        ? 'You are helping others'
                        : 'You are seeking support'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Your Stats</h2>
                  <Shield className="w-6 h-6 text-purple-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Sessions</p>
                    <p className="text-2xl font-bold">{stats.total_sessions}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Rating</p>
                    <p className="text-2xl font-bold">{stats.average_rating.toFixed(1)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Impact</p>
                    <p className="text-2xl font-bold">{stats.impact_score}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Hours</p>
                    <p className="text-2xl font-bold">{stats.total_duration.toFixed(1)}</p>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Emotional State Modal */}
      {showEmotionalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4 text-center">How are you feeling?</h3>
            <EmotionalSlider
              value={wellbeingScore || 5}
              onChange={setWellbeingScore}
              label="Rate your current emotional state"
            />
            <div className="mt-6 space-y-3">
              <button
                onClick={() => {
                  setShowEmotionalModal(false);
                  handleFindMatch();
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                Continue
              </button>
              <button
                onClick={() => setShowEmotionalModal(false)}
                className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="pb-20">
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 shadow-lg">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-around py-3">
            {[
              { id: 'home', icon: Heart, label: 'Home' },
              { id: 'history', icon: HistoryIcon, label: 'History' },
              { id: 'admin', icon: ChartBar, label: 'Admin' },
              { id: 'settings', icon: SettingsIcon, label: 'Settings' },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-lg transition-colors ${activeTab === id
                  ? 'text-purple-500 bg-purple-50 dark:bg-gray-700'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Video Session Modal */}
      {showVideoSession && (
        <VideoSession onClose={handleCloseSession} />
      )}

      {/* Match Found Modal */}
      {matchedUser && !showVideoSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Match Found!</h3>
            <div className="flex items-center space-x-4 mb-6">
              <img
                src={matchedUser.avatar_url || 'https://via.placeholder.com/64'}
                alt={matchedUser.username}
                className="w-16 h-16 rounded-full"
              />
              <div>
                <p className="font-semibold">{matchedUser.username}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{matchedUser.bio}</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowVideoSession(true)}
                className="flex-1 py-2 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                Start Session
              </button>
              <button
                onClick={cancelMatch}
                className="py-2 px-4 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscribe Prompt Modal */}
      {showSubscribePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <AlertCircle className="w-12 h-12 text-purple-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Available Sessions</h3>
              <p className="text-gray-600 dark:text-gray-300">
                You need to subscribe or purchase session credits to continue.
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => {
                  setShowSubscribePrompt(false);
                  setActiveTab('settings');
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                View Subscription Options
              </button>
              <button
                onClick={() => setShowSubscribePrompt(false)}
                className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;