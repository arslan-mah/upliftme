import React, { createContext, useContext, useMemo, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
const serverUri = import.meta.env.VITE_SERVER_URI;
type SocketContextType = Socket | null;

const SocketContext = createContext<SocketContextType>(null);

export const useSocket = (): Socket => {
  const socket = useContext(SocketContext);
  if (!socket) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return socket;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const socket = useMemo(() => io(`http://${serverUri}`), []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};