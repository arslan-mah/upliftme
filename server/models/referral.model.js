import mongoose, { Schema } from "mongoose";

const referralSchema = new Schema(
    {
        referrerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        referredUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        sessionsRewarded: { type: Number, default: 5 }
    },
    {
        timestamps: true
    }
);

const Referral = mongoose.model("Referral", referralSchema);
export default Referral;
