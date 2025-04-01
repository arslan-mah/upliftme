import Session from "../models/session.model.js";
import User from "../models/user.model.js";

// Create a new session
export const createSession = async (req, res) => {
    try {
        const { heroId, uplifterId, initialMood, paymentStatus } = req.body;

        // Ensure both users exist
        const hero = await User.findById(heroId);
        const uplifter = await User.findById(uplifterId);
        if (!hero || !uplifter) {
            return res.status(404).json({ message: "Hero or Uplifter not found." });
        }

        // Create and save session
        const newSession = new Session({ heroId, uplifterId, initialMood, paymentStatus });
        await newSession.save();

        res.status(201).json({ message: "Session created successfully.", session: newSession });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get all sessions
export const getAllSessions = async (req, res) => {
    try {
        const sessions = await Session.find().populate("heroId uplifterId");
        res.status(200).json(sessions);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get session by ID
export const getSessionById = async (req, res) => {
    try {
        const session = await Session.findById(req.params.sessionId).populate("heroId uplifterId");
        if (!session) {
            return res.status(404).json({ message: "Session not found." });
        }
        res.status(200).json(session);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update session details (end time, moods, rating)
export const updateSession = async (req, res) => {
    try {
        const { endTime, finalMood, ratingGiven } = req.body;
        const session = await Session.findByIdAndUpdate(
            req.params.sessionId,
            { endTime, finalMood, ratingGiven },
            { new: true }
        );
        if (!session) {
            return res.status(404).json({ message: "Session not found." });
        }
        res.status(200).json({ message: "Session updated successfully.", session });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete a session
export const deleteSession = async (req, res) => {
    try {
        const session = await Session.findByIdAndDelete(req.params.sessionId);
        if (!session) {
            return res.status(404).json({ message: "Session not found." });
        }
        res.status(200).json({ message: "Session deleted successfully." });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
