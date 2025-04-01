import Subscription from "../models/subscription.model.js";
import User from "../models/user.model.js";

// Create or update a subscription
export const createOrUpdateSubscription = async (req, res) => {
    try {
        const { userId, bundleSize, amountPaid, specialKeyAccess } = req.body;

        // Ensure user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Check if a subscription exists for the user
        let subscription = await Subscription.findOne({ userId });

        if (subscription) {
            // Update existing subscription
            subscription.sessionBalance += bundleSize;
            subscription.totalSpent += amountPaid;
            subscription.purchasedBundles.push({ bundleSize, amountPaid });
            if (specialKeyAccess !== undefined) {
                subscription.specialKeyAccess = specialKeyAccess;
            }
        } else {
            // Create a new subscription
            subscription = new Subscription({
                userId,
                sessionBalance: bundleSize,
                totalSpent: amountPaid,
                purchasedBundles: [{ bundleSize, amountPaid }],
                specialKeyAccess
            });
        }

        await subscription.save();
        res.status(201).json({ message: "Subscription updated successfully.", subscription });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get all subscriptions
export const getAllSubscriptions = async (req, res) => {
    try {
        const subscriptions = await Subscription.find().populate("userId");
        res.status(200).json(subscriptions);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get subscription by user ID
export const getSubscriptionByUserId = async (req, res) => {
    try {
        const subscription = await Subscription.findOne({ userId: req.params.userId }).populate("userId");
        if (!subscription) {
            return res.status(404).json({ message: "Subscription not found." });
        }
        res.status(200).json(subscription);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Deduct session balance when a session is used
export const useSession = async (req, res) => {
    try {
        const { userId } = req.params;

        const subscription = await Subscription.findOne({ userId });
        if (!subscription) {
            return res.status(404).json({ message: "Subscription not found." });
        }

        if (subscription.sessionBalance <= 0) {
            return res.status(400).json({ message: "No available sessions. Please purchase a bundle." });
        }

        subscription.sessionBalance -= 1;
        await subscription.save();

        res.status(200).json({ message: "Session deducted successfully.", subscription });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete a subscription
export const deleteSubscription = async (req, res) => {
    try {
        const subscription = await Subscription.findOneAndDelete({ userId: req.params.userId });
        if (!subscription) {
            return res.status(404).json({ message: "Subscription not found." });
        }
        res.status(200).json({ message: "Subscription deleted successfully." });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
