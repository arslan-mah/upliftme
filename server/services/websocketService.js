import { Server } from "socket.io";
import mongoose from "mongoose";
import Session from "../models/session.model.js"; // Using Session model

const MAX_CALL_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

const SocketSetup = (server) => {
    const io = new Server(server, {
        cors: { origin: [`http://${process.env.FRONT_END_URL}`], credentials: true }
    });

 
    const emailToSocketIdMap = new Map();
const socketidToEmailMap = new Map();


    io.on("connection", (socket) => {
      console.log(`Socket Connected`, socket.id);
      socket.on("room:join", (data) => {
        const { email, room } = data;
        emailToSocketIdMap.set(email, socket.id);
        socketidToEmailMap.set(socket.id, email);
        io.to(room).emit("user:joined", { email, id: socket.id });
        socket.join(room);
        io.to(socket.id).emit("room:join", data);
      });
    
      socket.on("user:call", ({ to, offer }) => {
        io.to(to).emit("incomming:call", { from: socket.id, offer });
      });
    
      socket.on("call:accepted", ({ to, ans }) => {
        io.to(to).emit("call:accepted", { from: socket.id, ans });
        console.log("From", socket.id);
        
      });
    
      socket.on("peer:nego:needed", ({ to, offer }) => {
        console.log("peer:nego:needed", offer);
        io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
      });
    
      socket.on("peer:nego:done", ({ to, ans }) => {
        console.log("peer:nego:done", ans);
        io.to(to).emit("peer:nego:final", { from: socket.id, ans });
      });
    });

    return io;
};

export default SocketSetup;
