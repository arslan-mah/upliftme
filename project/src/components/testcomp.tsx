import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
const serverUri = import.meta.env.VITE_SERVER_URI;

const socket = io(`http://${serverUri}`);

interface User {
  username: string;
  socketId: string;
}

const CallComponent: React.FC = () => {
  const [username, setUsername] = useState<string>("");
  const [users, setUsers] = useState<User[]>([]);
  const [incomingCall, setIncomingCall] = useState<{ from: string; callerName: string } | null>(null);
  const [ongoingCall, setOngoingCall] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const myVideo = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    socket.on("me", (id: string) => {
      console.log("Connected with ID:", id);
    });

    socket.on("usersList", (users: User[]) => {
      setUsers(users);
    });

    socket.on("incomingCall", ({ from, callerName }) => {
      setIncomingCall({ from, callerName });
    });

    return () => {
      socket.off("me");
      socket.off("usersList");
      socket.off("incomingCall");
    };
  }, []);

  useEffect(() => {
    if (username) {
      socket.emit("registerUser", username);
    }
  }, [username]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      if (myVideo.current) myVideo.current.srcObject = mediaStream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
  };

  const callUser = async (userToCall: string) => {
    await startCamera();
    setOngoingCall(true);
    socket.emit("callUser", { userToCall, from: socket.id, callerName: username });
  };

  const answerCall = async () => {
    if (incomingCall) {
      await startCamera();
      setOngoingCall(true);
      socket.emit("answerCall", { to: incomingCall.from });
      setIncomingCall(null);
    }
  };

  const endCall = () => {
    setOngoingCall(false);
    stopCamera();
    socket.emit("endCall");
  };

  return (
    <div className="text-black" style={{ textAlign: "center", padding: "20px" }}>
      <h2>Welcome {username}</h2>
      {!ongoingCall ? (
        <div>
          {users.length > 0 ? (
            users.map((user, index) =>
              user.username !== username ? (
                <p key={index} className="bg-blue-200 rounded m-3 p-3">
                  <strong>{user.username}</strong> |
                  <button className="bg-blue-600 rounded m-3 p-3" onClick={() => callUser(user.socketId)}>
                    Call
                  </button>
                </p>
              ) : null
            )
          ) : (
            <p>No users connected</p>
          )}
        </div>
      ) : (
        <div>
          <h1>In Call...</h1>
          <video ref={myVideo} autoPlay muted style={{ width: "300px", background: "black" }} />
          <button onClick={endCall} style={{ backgroundColor: "red", color: "white" }}>
            End Call
          </button>
        </div>
      )}

      {incomingCall && !ongoingCall && (
        <div style={{ marginTop: "20px" }}>
          <h3>Incoming Call from {incomingCall.callerName}...</h3>
          <button onClick={answerCall} style={{ backgroundColor: "blue", color: "white" }}>
            Answer
          </button>
        </div>
      )}
    </div>
  );
};

export default CallComponent;
