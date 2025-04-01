import Referral from "../models/referral.model.js";
import User from "../models/user.model.js";

// Create a new referral
export const createReferral = async (req, res) => {
    try {
        const { referrerId, referredUserId } = req.body;

        // Ensure both users exist
        const referrer = await User.findById(referrerId);
        const referredUser = await User.findById(referredUserId);
        if (!referrer || !referredUser) {
            return res.status(404).json({ message: "Referrer or Referred User not found." });
        }

        // Prevent duplicate referrals
        const existingReferral = await Referral.findOne({ referrerId, referredUserId });
        if (existingReferral) {
            return res.status(400).json({ message: "User has already been referred by this referrer." });
        }

        // Create and save the referral
        const newReferral = new Referral({ referrerId, referredUserId });
        await newReferral.save();

        res.status(201).json({ message: "Referral recorded successfully.", referral: newReferral });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get all referrals
export const getAllReferrals = async (req, res) => {
    try {
        const referrals = await Referral.find().populate("referrerId referredUserId");
        res.status(200).json(referrals);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get referrals by referrer ID
export const getReferralsByReferrer = async (req, res) => {
    try {
        const referrals = await Referral.find({ referrerId: req.params.referrerId }).populate("referredUserId");
        res.status(200).json(referrals);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete a referral
export const deleteReferral = async (req, res) => {
    try {
        const referral = await Referral.findByIdAndDelete(req.params.referralId);
        if (!referral) {
            return res.status(404).json({ message: "Referral not found." });
        }
        res.status(200).json({ message: "Referral deleted successfully." });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
