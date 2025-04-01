import express from "express";
import {
    createReferral,
    getAllReferrals,
    getReferralsByReferrer,
    deleteReferral
} from "../controllers/referralController.js";

const router = express.Router();

// Define routes
router.post("/", createReferral); // Create a new referral
router.get("/", getAllReferrals); // Get all referrals
router.get("/:referrerId", getReferralsByReferrer); // Get referrals by referrer ID
router.delete("/:referralId", deleteReferral); // Delete a referral

export default router;
