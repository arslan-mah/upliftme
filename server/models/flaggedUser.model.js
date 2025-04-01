import mongoose, { Schema } from "mongoose";

const flaggedUserSchema = new Schema(
    {
        reportedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        reports: [
            {
                reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                reason: { type: String, required: true },
                date: { type: Date, default: Date.now }
            }
        ],
        totalFlags: { type: Number, default: 0 },
        adminReviewed: { type: Boolean, default: false }
    },
    {
        timestamps: true
    }
);

const FlaggedUser = mongoose.model("FlaggedUser", flaggedUserSchema);
export default FlaggedUser;
