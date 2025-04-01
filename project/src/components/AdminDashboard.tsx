import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, UserCheck, Activity, CreditCard, Star, Clock, Heart, Shield } from 'lucide-react';

interface AdminStats {
  total_users: number;
  active_users: number;
  total_sessions: number;
  total_revenue: number;
  average_rating: number;
  active_sessions: number;
  total_uplifters: number;
  total_heroes: number;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // Refresh every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, []);

  const loadStats = async () => {
    try {
      // Get admin statistics
      const { data: adminStats, error: statsError } = await supabase.rpc('get_admin_statistics');
      if (statsError) throw statsError;

      // Get recent sessions
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select(`
          id,
          status,
          started_at,
          ended_at,
          rating,
          amount_paid,
          hero:hero_id(username),
          uplifter:uplifter_id(username)
        `)
        .order('started_at', { ascending: false })
        .limit(10);

      if (sessionError) throw sessionError;

      setStats(adminStats);
      setRecentSessions(sessionData || []);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-8">Admin Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* User Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Users</h3>
            <Users className="w-6 h-6 text-purple-500" />
          </div>
          <div className="space-y-2">
            <div>
              <div className="text-3xl font-bold">{stats?.total_users || 0}</div>
              <div className="text-sm text-gray-500">Total Users</div>
            </div>
            <div className="flex justify-between text-sm">
              <div>
                <div className="font-semibold">{stats?.total_heroes || 0}</div>
                <div className="text-gray-500">Heroes</div>
              </div>
              <div>
                <div className="font-semibold">{stats?.total_uplifters || 0}</div>
                <div className="text-gray-500">Uplifters</div>
              </div>
              <div>
                <div className="font-semibold">{stats?.active_users || 0}</div>
                <div className="text-gray-500">Online</div>
              </div>
            </div>
          </div>
        </div>

        {/* Session Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Sessions</h3>
            <Activity className="w-6 h-6 text-blue-500" />
          </div>
          <div className="space-y-2">
            <div>
              <div className="text-3xl font-bold">{stats?.total_sessions || 0}</div>
              <div className="text-sm text-gray-500">Total Sessions</div>
            </div>
            <div className="flex justify-between text-sm">
              <div>
                <div className="font-semibold">{stats?.active_sessions || 0}</div>
                <div className="text-gray-500">Active</div>
              </div>
              <div>
                <div className="font-semibold">{stats?.average_rating?.toFixed(1) || '0.0'}</div>
                <div className="text-gray-500">Avg Rating</div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Revenue</h3>
            <CreditCard className="w-6 h-6 text-green-500" />
          </div>
          <div className="space-y-2">
            <div>
              <div className="text-3xl font-bold">
                ${((stats?.total_revenue || 0) / 100).toFixed(2)}
              </div>
              <div className="text-sm text-gray-500">Total Revenue</div>
            </div>
            <div className="flex justify-between text-sm">
              <div>
                <div className="font-semibold">
                  ${((stats?.total_revenue || 0) * 0.9 / 100).toFixed(2)}
                </div>
                <div className="text-gray-500">Uplifter Earnings</div>
              </div>
              <div>
                <div className="font-semibold">{stats?.total_uplifters || 0}</div>
                <div className="text-gray-500">Active Uplifters</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Quick Stats</h3>
            <Star className="w-6 h-6 text-yellow-500" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">Conversion Rate</div>
              <div className="font-semibold">
                {stats?.total_users ? 
                  ((stats.total_sessions / stats.total_users) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">Avg Revenue/User</div>
              <div className="font-semibold">
                ${stats?.total_users ? 
                  ((stats.total_revenue / 100) / stats.total_users).toFixed(2) : '0.00'}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">Avg Sessions/Day</div>
              <div className="font-semibold">
                {Math.round((stats?.total_sessions || 0) / 30)} {/* Assuming last 30 days */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Sessions</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500">
                <th className="pb-4">Hero</th>
                <th className="pb-4">Uplifter</th>
                <th className="pb-4">Status</th>
                <th className="pb-4">Duration</th>
                <th className="pb-4">Rating</th>
                <th className="pb-4">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentSessions.map((session) => (
                <tr key={session.id} className="border-t dark:border-gray-700">
                  <td className="py-3">{session.hero?.username || 'Unknown'}</td>
                  <td className="py-3">{session.uplifter?.username || 'Unknown'}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      session.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {session.status}
                    </span>
                  </td>
                  <td className="py-3">
                    {session.ended_at ? 
                      Math.round((new Date(session.ended_at).getTime() - 
                        new Date(session.started_at).getTime()) / 1000 / 60) + 'm'
                      : 'In Progress'
                    }
                  </td>
                  <td className="py-3">
                    {session.rating ? 
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="ml-1">{session.rating}</span>
                      </div>
                      : '-'
                    }
                  </td>
                  <td className="py-3">
                    ${((session.amount_paid || 0) / 100).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;