import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js"
import {
    reportUser,
    getFlaggedUsers,
    getFlaggedUserById,
    reviewFlaggedUser,
    deleteFlaggedUser
} from "../controllers/flaggedUserController.js";

const router = express.Router();

// Define routes
router.post("/report",authMiddleware, reportUser); // Report a user
router.get("/", getFlaggedUsers); // Get all flagged users
router.get("/:id", getFlaggedUserById); // Get a specific flagged user by ID
router.put("/:id/review", reviewFlaggedUser); // Mark flagged user as reviewed
router.delete("/:id", deleteFlaggedUser); // Delete a flagged user report

export default router;
