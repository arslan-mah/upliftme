import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        sessionBalance: { type: Number, default: 0 }, // Tracks available session count
        specialKeyAccess: { type: Boolean, default: false }, // For MVP exclusive access
        purchasedBundles: [
            {
                bundleSize: { type: Number, required: true },
                amountPaid: { type: Number, required: true },
                purchaseDate: { type: Date, default: Date.now }
            }
        ],
        totalSpent: { type: Number, default: 0 }, // Total amount spent on sessions
        lastUpdated: { type: Date, default: Date.now }
    },
    {
        timestamps: true
    }
);

// Middleware to update lastUpdated timestamp on save
subscriptionSchema.pre("save", function (next) {
    this.lastUpdated = Date.now();
    next();
});

const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;
