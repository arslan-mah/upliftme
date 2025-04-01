import mongoose, { Schema } from "mongoose";

const leaderboardSchema = new Schema(
    {
        uplifterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        averageRating: { type: Number, min: 0, max: 5, default: 0 },
        sessionCount: { type: Number, default: 0 },
        totalEarnings: { type: Number, default: 0 }
    },
    {
        timestamps: true
    }
);

const Leaderboard = mongoose.model("Leaderboard", leaderboardSchema);
