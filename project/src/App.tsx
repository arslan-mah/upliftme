import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import WelcomeScreen from "./components/WelcomeScreen";
import Dashboard from "./components/Dashboard";
import LobbyScreen from "./components/Lobby";
import RoomPage from "./components/Room";
import { initializePresence, cleanupPresence } from "./lib/supabase";

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);

  useEffect(() => {
    initializePresence();
    return () => {
      cleanupPresence();
    };
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? "dark" : ""}`}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        {!isOnboarded ? (
          <WelcomeScreen onComplete={() => setIsOnboarded(true)} />
        ) : (
          <>
            <Routes>
              <Route path="/" element={<LobbyScreen />} />
              <Route path="/room/:roomId" element={<RoomPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </>
        )}
        <button
          onClick={toggleDarkMode}
          className="fixed bottom-24 right-6 p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-yellow-500" />
          ) : (
            <Moon className="w-5 h-5 text-gray-700" />
          )}
        </button>
      </div>
    </div>
  );
};

export default App;