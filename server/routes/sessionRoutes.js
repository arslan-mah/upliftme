import express from "express";
import {
    createSession,
    getAllSessions,
    getSessionById,
    updateSession,
    deleteSession
} from "../controllers/sessionController.js";

const router = express.Router();

// Define routes
router.post("/",  createSession);           // Create a new session
router.get("/", getAllSessions);           // Get all sessions
router.get("/:sessionId", getSessionById); // Get a session by ID
router.put("/:sessionId", updateSession);  // Update session details
router.delete("/:sessionId", deleteSession); // Delete a session

export default router;
