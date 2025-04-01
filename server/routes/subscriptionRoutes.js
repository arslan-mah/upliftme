import express from "express";
import {
    createOrUpdateSubscription,
    getAllSubscriptions,
    getSubscriptionByUserId,
    useSession,
    deleteSubscription
} from "../controllers/subscriptionController.js";

const router = express.Router();

// Define subscription routes
router.post("/", createOrUpdateSubscription); // Create or update a subscription
router.get("/", getAllSubscriptions); // Get all subscriptions
router.get("/:userId", getSubscriptionByUserId); // Get subscription by user ID
router.put("/:userId/use-session", useSession); // Deduct a session balance
router.delete("/:userId", deleteSubscription); // Delete a subscription

export default router;
