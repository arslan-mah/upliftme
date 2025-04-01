import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
const serverUri = import.meta.env.VITE_SERVER_URI;


const socket = io(`http://${serverUri}`);

interface User {
  username: string;
  socketId: string;
}

const CallComponent: React.FC = () => {
  const [me, setMe] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [stream, setStream] = useState<any>(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState<string>("");
  const [callerOffer, setCallerOffer] = useState<RTCSessionDescriptionInit | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [listCall, setListCall] = useState(false);
  const [idToCall, setIdToCall] = useState<string>("")
  const [users, setUsers] = useState<User[]>([]);

  const myVideo = useRef<HTMLVideoElement | null>(null);
  const userVideo = useRef<HTMLVideoElement | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    if (stream) {
      console.log("Stream updated", stream);
      if (myVideo.current) {
        myVideo.current.srcObject = stream;
      }
    }
  }, [stream]); 


  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
    if(mediaStream){
      setStream(mediaStream);
    }
      console.log('mediastream',mediaStream)
      console.log('stream',stream);	
      if (myVideo.current)
        {
          console.log('myVideo.current',myVideo.current)
       myVideo.current.srcObject = mediaStream;
        }
        
    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
  };


  const stopCamera = () => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
  };


  useEffect(() => {
    

    socket.on("me", (id: string) => {
      setMe(id)
      console.log(id);

    }
    );

    socket.on("usersList", (users) => {
      console.log(users);
      setUsers(users)
    })



    socket.on("callUser", async (data: any) => {


      setReceivingCall(true);
      setCaller(data.from);
      setCallerOffer(data.offer);
    });

    return () => {
      socket.off("me");
      socket.off("callUser");
      socket.off('userList')
    };
  }, []);
  useEffect(() => {
    if (username) {
      socket.emit("registerUser", username);
      console.log(username);
    }

  }, [username])






  const callUser = async (id: string) => {
    await startCamera()
    setListCall(true);
    peerConnection.current = new RTCPeerConnection();
    console.log('streaming is ',stream)
    stream?.getTracks().forEach((track) => peerConnection.current?.addTrack(track, stream));

    peerConnection.current.ontrack = (event) => {
      if (userVideo.current) userVideo.current.srcObject = event.streams[0];
    };

    const offer = await peerConnection.current.createOffer();
    console.log(offer)
    await peerConnection.current.setLocalDescription(offer);
    

    socket.emit("callUser", { userToCall: id, offer });
 
    socket.on("callAccepted", async (answer) => {
      setCallAccepted(true);
      await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(answer));
    });
  };

  const answerCall = async () => {
    setListCall(true);
    setCallAccepted(true);

    let localStream = stream; // Store existing stream

    if (!localStream) {
        console.log("Stream is null, starting camera...");
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(localStream);
        console.log("Stream started:", localStream);
    }

    peerConnection.current = new RTCPeerConnection();

    if (localStream) {
        console.log("Adding local tracks to peer connection");
        localStream.getTracks().forEach((track) => {
            peerConnection.current?.addTrack(track, localStream);
        });

        if (myVideo.current) {
            myVideo.current.srcObject = localStream;
            console.log("Assigned local stream to myVideo");
        }
    } else {
        console.error("Stream is still null after starting camera");
    }

    peerConnection.current.ontrack = (event) => {
        console.log("Received remote stream:", event.streams[0]);
        if (userVideo.current) {
            userVideo.current.srcObject = event.streams[0];
            console.log("Assigned remote stream to userVideo");
        } else {
            console.error("userVideo ref is null");
        }
    };

    if (callerOffer) {
        console.log("Setting remote description with caller offer:", callerOffer);
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(callerOffer));

        const answer = await peerConnection.current.createAnswer();
        console.log("Generated Answer:", answer);

        await peerConnection.current.setLocalDescription(answer);
        console.log("Local description set successfully");

        socket.emit("answerCall", { to: caller, answer });
    } else {
        console.error("No caller offer available in answerCall");
    }
};



  const leaveCall = () => {
    stopCamera()
    setListCall(false);
    setCallEnded(true);
    peerConnection.current?.close();
  };



  (async () => {


    try {
      const response = await fetch(`http://${serverUri}/api/user/me`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await response.json();



      if (!response.ok) {
        throw new Error(data.message || "Invalid email or password");
      }

      // If login successful, verify user has a profile
      if (data?.username) {
        setUsername(data.username);
      }
      else {
        throw new Error("User login failed or invalid response");
      }
    } catch (err) {
      throw new Error("User login failed");
    }

  })()





  return (


    <div className="text-black" style={{ textAlign: "center", padding: "20px" }}>
      <h2>Welcome {username}</h2>
      {!listCall ?
        <div>
          {users.length > 0 ? (
            users.map((user, index) => (
              user.username !== username ?
                <p className="bg-blue-200 rounded m-3 p-3" key={index}>
                  <div>
                    <img src="" alt="" />
                  </div> <strong>{user.username} </strong> |  <button className="bg-blue-600 rounded m-3 p-3" onClick={() => callUser(user.socketId)}>call</button>
                </p> : null
            ))
          ) : (
            <p>No users connected</p>
          )}
        </div> :
        <div>
          <h1>Video Call</h1>
          <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
            <video ref={myVideo} autoPlay muted style={{ width: "300px", background: "black" }} />
            {callAccepted && !callEnded && <video ref={userVideo} autoPlay style={{ width: "300px", background: "black" }} />}
          </div>

        

          <div style={{ marginTop: "10px" }}>
           
           
            {listCall? (
              <button className="bg-red-600 text-black rounded p-3" onClick={leaveCall} style={{ backgroundColor: "red", color: "white" }}>End Call</button>
            ) : (
              null
            )}
          </div>
        </div>
      }




      {receivingCall && !callAccepted && (
        <div style={{ marginTop: "20px" }}>
          <h3>Incoming Call...</h3>
          <button onClick={answerCall} style={{ backgroundColor: "blue", color: "white" }}>Answer</button>
        </div>
      )}
    </div>
  );
};

export default CallComponent;
