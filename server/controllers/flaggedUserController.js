import FlaggedUser from "../models/flaggedUser.model.js"
import User from "../models/user.model.js";

// Report a user
export const reportUser = async (req, res) => {
    try {
        const { reportedUserId, reporterId, reason } = req.body;

        // Ensure reported user exists
        const reportedUser = await User.findById(reportedUserId);
        if (!reportedUser) {
            return res.status(404).json({ message: "Reported user not found." });
        }

        let flaggedUser = await FlaggedUser.findOne({ reportedUserId });
        if (!flaggedUser) {
            flaggedUser = new FlaggedUser({ reportedUserId, reports: [], totalFlags: 0 });
        }

        flaggedUser.reports.push({ reporterId, reason });
        flaggedUser.totalFlags += 1;
        await flaggedUser.save();

        res.status(201).json({ message: "User reported successfully." });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get all flagged users
export const getFlaggedUsers = async (req, res) => {
    try {
        const flaggedUsers = await FlaggedUser.find().populate("reportedUserId reports.reporterId");
        res.status(200).json(flaggedUsers);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get a flagged user by ID
export const getFlaggedUserById = async (req, res) => {
    try {
        const flaggedUser = await FlaggedUser.findById(req.params.id).populate("reportedUserId reports.reporterId");
        if (!flaggedUser) {
            return res.status(404).json({ message: "Flagged user not found." });
        }
        res.status(200).json(flaggedUser);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Mark a flagged user as reviewed by admin
export const reviewFlaggedUser = async (req, res) => {
    try {
        const flaggedUser = await FlaggedUser.findByIdAndUpdate(
            req.params.id,
            { adminReviewed: true },
            { new: true }
        );
        if (!flaggedUser) {
            return res.status(404).json({ message: "Flagged user not found." });
        }
        res.status(200).json({ message: "Flagged user reviewed.", flaggedUser });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete a flagged user report
export const deleteFlaggedUser = async (req, res) => {
    try {
        const flaggedUser = await FlaggedUser.findByIdAndDelete(req.params.id);
        if (!flaggedUser) {
            return res.status(404).json({ message: "Flagged user not found." });
        }
        res.status(200).json({ message: "Flagged user report deleted." });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
