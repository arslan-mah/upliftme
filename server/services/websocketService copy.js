import { Server } from "socket.io";
import mongoose from "mongoose";
import Session from "../models/session.model.js"; // Using Session model

const MAX_CALL_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

const SocketSetup = (server) => {
    const io = new Server(server, {
        cors: { origin: [`http://${process.env.FRONT_END_URL}`], credentials: true }
    });

    let activeCalls = {}; // Store ongoing call timers
    let users = []; // Array

    io.on("connection", (socket) => {
      // console.log(`New user connected: ${socket.id}`);
    
      socket.emit("me", socket.id);

      socket.on("registerUser",(username)=>{
        
        if(!users.find(user=>user.username===username) && !users.find(user=>user.socketId===socket.id ))
       {
         users.push({username,socketId:socket.id});
       }
        // console.log(users);
        io.emit("usersList",users)
        
      })
      io.emit("usersList",users)
      

      socket.on("callUser", (data) => {
        const {userToCall,offer,from} = data;
        

        io.to(userToCall).emit("callUser", { signal:offer,from });
        // console.log("calling to ",userToCall );
        
      });
    
      socket.on("answerCall", (data) => {
        io.to(data.to).emit("callAccepted", data.signal);
      });
    
      socket.on("disconnect", () => {
        users = users.filter(user => user.socketId !== socket.id);
        // console.log(`User disconnected: ${socket.id}`);
        io.emit("callEnded");
        
        io.emit("usersList",users)
      });
    });

    return io;
};

export default SocketSetup;
