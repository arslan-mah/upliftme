import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import SocketSetup from "./services/websocketService.js"
import connectDB from "./db/index.js";
import userRoutes from "./routes/userRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import flaggedUserRoutes from "./routes/flaggedUserRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import referralRoutes from "./routes/referralRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import authMiddleware from "./middlewares/auth.middleware.js"



dotenv.config();

// Initialize Express app
const app = express();
const server = createServer(app);
SocketSetup(server, { 
  cors: { 
    origin: [`http://${process.env.FRONT_END_URL}`], // 
    credentials: true,
  } 
});

app.use(cors({
  origin: [`http://${process.env.FRONT_END_URL}`], 
  credentials: true, 
  methods: "GET,POST,PUT,DELETE,PATCH,OPTIONS",
  allowedHeaders: "Content-Type,Authorization",
}));

app.use(cookieParser()); 
app.use(express.json());



//Routes
app.use("/api/user", userRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/sessions",authMiddleware, sessionRoutes);
app.use("/api/flagged-users", authMiddleware, flaggedUserRoutes);
app.use("/api/payments", authMiddleware, paymentRoutes);
app.use("/api/referrals", authMiddleware, referralRoutes);
app.use("/api/subscriptions",authMiddleware, subscriptionRoutes);



connectDB().then(() => {
  server.listen(4141, () => console.log("Server running on port 4141"));
}).catch((err) => console.log("Error while connecting to DB", err));
