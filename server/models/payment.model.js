import mongoose, { Schema } from "mongoose";

const paymentSchema = new Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: "USD" },
        paymentMethod: { type: String, required: true },
        transactionId: { type: String, unique: true, required: true },
        status: { type: String, enum: ["success", "failed", "pending"], required: true }
    },
    {
        timestamps: true
    }
);

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
