import React, { useState, useEffect, useRef } from 'react';
import { useSessionStore } from '../store/session';
import { 
  X, Video, Mic, MicOff, VideoOff, Loader, AlertCircle, MessageCircle, 
  Camera, Maximize2, Minimize2, Volume2, VolumeX,
  Smile, ThumbsUp, Heart, Star as StarIcon, Coffee, Edit
} from 'lucide-react';
import SessionReview from './SessionReview';
import { toast } from 'sonner';
import { toggleVideo, toggleAudio, setVolume, initializeLocalVideo } from '../lib/daily';

interface VideoSessionProps {
  onClose: () => void;
}

const VideoSession: React.FC<VideoSessionProps> = ({ onClose }) => {
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const { timeRemaining, currentSession, initializeVideoCall } = useSessionStore();
  const [showReview, setShowReview] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isWaiting, setIsWaiting] = useState(true);
  const [hasMediaPermissions, setHasMediaPermissions] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<{ text: string; sender: string }[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolumeState] = useState(1);
  const [showReactions, setShowReactions] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [bothParticipantsJoined, setBothParticipantsJoined] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Format time for display
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formatTime = (time: number) => time.toString().padStart(2, '0');

  const reactions = [
    { icon: ThumbsUp, label: '👍' },
    { icon: Heart, label: '❤️' },
    { icon: StarIcon, label: '⭐' },
    { icon: Coffee, label: '☕' },
    { icon: Smile, label: '😊' }
  ];

  // Function to start the timer
  const startTimer = () => {
    if (!timerStarted) {
      console.log('⏱️ Starting 7-minute timer');
      setTimerStarted(true);
      timerRef.current = setInterval(() => {
        useSessionStore.setState(state => ({
          timeRemaining: Math.max(0, state.timeRemaining - 1)
        }));
      }, 1000);
    }
  };

  // Watch for timer reaching zero
  useEffect(() => {
    if (timeRemaining === 0 && timerStarted) {
      console.log('⏰ Timer reached zero, ending session');
      handleClose();
    }
  }, [timeRemaining, timerStarted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const sendReaction = async (reaction: string) => {
    try {
      // Show reaction animation
      const reactionEl = document.createElement('div');
      reactionEl.className = 'reaction-animation';
      reactionEl.textContent = reaction;
      videoContainerRef.current?.appendChild(reactionEl);
      
      setTimeout(() => reactionEl.remove(), 2000);
      
      // Hide reactions panel after sending
      setShowReactions(false);
    } catch (error) {
      console.error('Failed to send reaction:', error);
      toast.error('Failed to send reaction');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolumeState(newVolume);
    setVolume(newVolume);
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const requestMediaAccess = async () => {
    try {
      if (!videoContainerRef.current) return false;

      // First check if permissions are already granted
      try {
        const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (permissions.state === 'denied') {
          setMediaError('Camera access is blocked. Please allow access in your browser settings and refresh the page.');
          return false;
        }
      } catch (err) {
        // Some browsers don't support permissions API, continue anyway
        console.warn('Could not check camera permissions:', err);
      }

      // First initialize local video preview
      await initializeLocalVideo(videoContainerRef.current);
      
      setHasMediaPermissions(true);
      setMediaError(null);
      setShowPermissionPrompt(false);

      // Only initialize video call if we have a session
      if (currentSession) {
        try {
          const client = await initializeVideoCall(videoContainerRef.current);
          
          // Set up event listeners for participant changes
          client.on('participant-joined', () => {
            setBothParticipantsJoined(true);
            startTimer(); // Start timer when both participants are present
          });

          client.on('participant-left', () => {
            setBothParticipantsJoined(false);
          });

          setIsWaiting(false);
        } catch (error) {
          console.error('Failed to initialize video call:', error);
          if (error instanceof Error) {
            if (error.message.includes('NotAllowedError')) {
              setMediaError('Camera access was denied. Please allow access in your browser settings and refresh the page.');
            } else if (error.message.includes('NotFoundError')) {
              setMediaError('No camera found. Please ensure your camera is connected and working.');
            } else if (error.message.includes('NotReadableError')) {
              setMediaError('Camera is in use by another application. Please close other apps using the camera.');
            } else {
              setMediaError('Failed to initialize video call: ' + error.message);
            }
          } else {
            setMediaError('Failed to initialize video call');
          }
        }
      }

      return true;
    } catch (err) {
      console.error('Media permission error:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setMediaError('Camera access was denied. Please allow access in your browser settings and refresh the page.');
        } else if (err.name === 'NotFoundError') {
          setMediaError('No camera found. Please ensure your camera is connected and working.');
        } else if (err.name === 'NotReadableError') {
          setMediaError('Camera is in use by another application. Please close other apps using the camera.');
        } else {
          setMediaError(err.message);
        }
      } else {
        setMediaError('Failed to access camera and microphone');
      }
      return false;
    }
  };

  useEffect(() => {
    // Check if permissions are already granted
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const hasVideo = devices.some(device => device.kind === 'videoinput');
        const hasAudio = devices.some(device => device.kind === 'audioinput');
        
        if (!hasVideo || !hasAudio) {
          setShowPermissionPrompt(true);
        } else {
          requestMediaAccess();
        }
      })
      .catch(() => {
        setShowPermissionPrompt(true);
      });
  }, [currentSession]); // Re-run when session changes

  const handleClose = () => {
    setShowQuitConfirm(true);
  };

  const confirmQuit = async () => {
    try {
      // Clean up video session
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Cancel the match and clean up presence
      await useSessionStore.getState().cancelMatch();

      // Close the video session
      if (isWaiting || !currentSession?.uplifter_id) {
        setShowQuitConfirm(false);
        onClose();
      } else {
        setShowQuitConfirm(false);
        setShowReview(true);
      }
    } catch (error) {
      console.error('Error during session cleanup:', error);
      // Still close the session even if cleanup fails
      setShowQuitConfirm(false);
      onClose();
    }
  };

  const handleMuteToggle = () => {
    try {
      toggleAudio(!isMuted);
      setIsMuted(!isMuted);
    } catch (error) {
      console.error('Failed to toggle audio:', error);
      toast.error('Failed to toggle microphone');
    }
  };

  const handleVideoToggle = () => {
    try {
      toggleVideo(!isVideoOff);
      setIsVideoOff(!isVideoOff);
    } catch (error) {
      console.error('Failed to toggle video:', error);
      toast.error('Failed to toggle camera');
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setMessages([...messages, { text: newMessage, sender: 'You' }]);
    setNewMessage('');
  };

  if (showPermissionPrompt) {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-6 text-center">
          <Camera className="w-12 h-12 text-purple-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Camera Access Required</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            To participate in video sessions, we need access to your camera and microphone. 
            Please click below to enable access.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => void requestMediaAccess()}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Enable Camera & Microphone
            </button>
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mediaError) {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Camera Access Error</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {mediaError}
            <br />
            <span className="text-sm mt-2 block">
              Please check your browser settings and ensure camera access is enabled.
            </span>
          </p>
          <div className="space-y-3">
            <button
              onClick={() => void requestMediaAccess()}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-white dark:bg-gray-800 rounded-2xl overflow-hidden flex">
        {/* Main Video Area */}
        <div className="flex-1 relative">
          {/* Timer Overlay */}
          <div className="absolute top-4 left-4 z-10 bg-black/50 rounded-lg px-3 py-1 text-white font-mono">
            {formatTime(minutes)}:{formatTime(seconds)}
          </div>

          {/* Video Container */}
          <div 
            className="aspect-video bg-gray-900 relative" 
            id="video-container" 
            ref={videoContainerRef}
          >
            {isWaiting && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Loader className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
                  <p className="text-white text-lg font-medium">
                    Waiting for your match...
                  </p>
                  <p className="text-gray-400 text-sm">
                    We'll connect you as soon as possible
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleMuteToggle}
                  className={`p-2 rounded-full transition-colors ${
                    isMuted ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
                </button>

                <button
                  onClick={handleVideoToggle}
                  className={`p-2 rounded-full transition-colors ${
                    isVideoOff ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {isVideoOff ? <VideoOff className="w-5 h-5 text-white" /> : <Video className="w-5 h-5 text-white" />}
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 rounded-full bg-gray-700 hover:bg-gray-600"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-24"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowReactions(!showReactions)}
                  className="p-2 rounded-full bg-gray-700 hover:bg-gray-600"
                >
                  <Smile className="w-5 h-5 text-white" />
                </button>

                <button
                  onClick={() => setShowChat(!showChat)}
                  className={`p-2 rounded-full ${
                    showChat ? 'bg-purple-500' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <MessageCircle className="w-5 h-5 text-white" />
                </button>

                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className={`p-2 rounded-full ${
                    showNotes ? 'bg-purple-500' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <Edit className="w-5 h-5 text-white" />
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-full bg-gray-700 hover:bg-gray-600"
                >
                  {isFullscreen ? 
                    <Minimize2 className="w-5 h-5 text-white" /> : 
                    <Maximize2 className="w-5 h-5 text-white" />
                  }
                </button>

                <button
                  onClick={handleClose}
                  className="p-2 rounded-full bg-red-500 hover:bg-red-600"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Reactions Panel */}
          {showReactions && (
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-800/90 rounded-lg p-2">
              <div className="flex items-center space-x-2">
                {reactions.map((reaction, index) => (
                  <button
                    key={index}
                    onClick={() => sendReaction(reaction.label)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <span className="text-2xl">{reaction.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Side Panel (Chat or Notes) */}
        {(showChat || showNotes) && (
          <div className="w-80 border-l dark:border-gray-700 flex flex-col">
            {showChat ? (
              <>
                <div className="p-4 border-b dark:border-gray-700">
                  <h3 className="font-semibold">Chat</h3>
                </div>
                <div 
                  ref={chatRef}
                  className="flex-1 p-4 space-y-4 overflow-y-auto"
                  style={{ maxHeight: 'calc(100vh - 200px)' }}
                >
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${
                        msg.sender === 'You' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.sender === 'You'
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700'
                        }`}
                      >
                        <p className="text-sm">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} className="p-4 border-t dark:border-gray-700">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="p-4 border-b dark:border-gray-700">
                  <h3 className="font-semibold">Session Notes</h3>
                </div>
                <div className="p-4">
                  <textarea
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    placeholder="Take notes during your session..."
                    className="w-full h-full min-h-[300px] p-3 bg-gray-100 dark:bg-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Quit Confirmation Modal */}
      {showQuitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-semibold mb-4">End Session?</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to end this session early?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={confirmQuit}
                className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
              >
                End Session
              </button>
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 py-2 px-4 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show review only if there was a successful match and session */}
      {showReview && currentSession?.uplifter_id && (
        <SessionReview
          uplifterName={currentSession.uplifter_name}
          onClose={onClose}
        />
      )}
    </div>
  );
};

export default VideoSession;