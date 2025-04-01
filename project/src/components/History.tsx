import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Star, Calendar, Clock, User, ChevronLeft, ChevronRight, MessageSquare, LineChart } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface SessionHistory {
  id: string;
  started_at: string;
  ended_at: string;
  rating: number;
  hero: { username: string; avatar_url: string } | null;
  uplifter: { username: string; avatar_url: string } | null;
  amount_paid: number;
  message: string;
  note: string;
  emotional_tracking: Array<{
    score: number;
    type: 'pre_session' | 'post_session';
  }>;
}

const ITEMS_PER_PAGE = 5;

const History: React.FC = () => {
  const [sessions, setSessions] = useState<SessionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const [selectedSession, setSelectedSession] = useState<SessionHistory | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get total count
        const { count } = await supabase
          .from('sessions')
          .select('id', { count: 'exact', head: true })
          .or(`hero_id.eq.${user.id},uplifter_id.eq.${user.id}`);

        setTotalSessions(count || 0);

        // Get paginated data with emotional scores
        const { data, error } = await supabase
          .from('sessions')
          .select(`
            id,
            started_at,
            ended_at,
            rating,
            amount_paid,
            message,
            note,
            hero:hero_id(username, avatar_url),
            uplifter:uplifter_id(username, avatar_url),
            emotional_tracking(score, type)
          `)
          .or(`hero_id.eq.${user.id},uplifter_id.eq.${user.id}`)
          .order('started_at', { ascending: false })
          .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

        if (error) throw error;
        setSessions(data || []);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [currentPage]);

  const totalPages = Math.ceil(totalSessions / ITEMS_PER_PAGE);

  const getEmotionalScores = (session: SessionHistory) => {
    const preSession = session.emotional_tracking?.find(t => t.type === 'pre_session')?.score;
    const postSession = session.emotional_tracking?.find(t => t.type === 'post_session')?.score;
    return { preSession, postSession };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">Session History</h2>
      
      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Sessions Yet</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Your completed sessions will appear here
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {sessions.map((session) => {
              const { preSession, postSession } = getEmotionalScores(session);
              return (
                <div
                  key={session.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => setSelectedSession(session)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <img
                        src={session.uplifter?.avatar_url || 'https://via.placeholder.com/40'}
                        alt={session.uplifter?.username || 'User'}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <h3 className="font-semibold">
                          Session with {session.uplifter?.username || 'Anonymous'}
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    {session.rating && (
                      <div className="flex items-center space-x-1">
                        <Star className="w-5 h-5 text-yellow-500 fill-current" />
                        <span>{session.rating}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-300">
                      Duration: {
                        Math.round(
                          (new Date(session.ended_at).getTime() - 
                           new Date(session.started_at).getTime()) / 1000 / 60
                        )
                      } minutes
                    </span>
                    {preSession !== undefined && postSession !== undefined && (
                      <div className="flex items-center space-x-2">
                        <LineChart className="w-4 h-4 text-purple-500" />
                        <span>Wellbeing: {preSession} → {postSession}</span>
                      </div>
                    )}
                  </div>

                  {session.message && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <MessageSquare className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-medium">Feedback</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{session.message}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-4 mt-8">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full">
            <div className="flex items-center space-x-4 mb-6">
              <img
                src={selectedSession.uplifter?.avatar_url || 'https://via.placeholder.com/64'}
                alt={selectedSession.uplifter?.username || 'User'}
                className="w-16 h-16 rounded-full"
              />
              <div>
                <h3 className="text-xl font-semibold">
                  Session with {selectedSession.uplifter?.username || 'Anonymous'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {format(new Date(selectedSession.started_at), 'PPpp')}
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-gray-600 dark:text-gray-300">Duration</span>
                <span className="font-medium">
                  {Math.round(
                    (new Date(selectedSession.ended_at).getTime() - 
                     new Date(selectedSession.started_at).getTime()) / 1000 / 60
                  )} minutes
                </span>
              </div>

              {selectedSession.rating && (
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-300">Rating</span>
                  <div className="flex items-center space-x-1">
                    <Star className="w-5 h-5 text-yellow-500 fill-current" />
                    <span className="font-medium">{selectedSession.rating}</span>
                  </div>
                </div>
              )}

              {selectedSession.emotional_tracking?.length > 0 && (
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-300">Emotional State</span>
                  <span className="font-medium">
                    {getEmotionalScores(selectedSession).preSession} → {getEmotionalScores(selectedSession).postSession}
                  </span>
                </div>
              )}

              {selectedSession.message && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-purple-500" />
                    <span className="font-medium">Feedback Message</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">{selectedSession.message}</p>
                </div>
              )}

              {selectedSession.note && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-purple-500" />
                    <span className="font-medium">Personal Note</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">{selectedSession.note}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedSession(null)}
              className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;