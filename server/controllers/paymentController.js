import Payment from "../models/payment.model.js";
import User from "../models/user.model.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Process a new payment using Stripe
export const createPayment = async (req, res) => {
    try {
        const { userId, amount, currency, paymentMethod } = req.body;

        // Ensure the user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Create Stripe charge
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Stripe uses cents
            currency,
            payment_method: paymentMethod,
            confirm: true
        });

        // Save payment details to DB
        const newPayment = new Payment({
            userId,
            amount,
            currency,
            paymentMethod,
            transactionId: paymentIntent.id,
            status: paymentIntent.status
        });
        await newPayment.save();

        res.status(201).json({ message: "Payment recorded successfully.", payment: newPayment });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get all payments
export const getAllPayments = async (req, res) => {
    try {
        const payments = await Payment.find().populate("userId");
        res.status(200).json(payments);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get a payment by transaction ID
export const getPaymentByTransactionId = async (req, res) => {
    try {
        const payment = await Payment.findOne({ transactionId: req.params.transactionId }).populate("userId");
        if (!payment) {
            return res.status(404).json({ message: "Payment not found." });
        }
        res.status(200).json(payment);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update payment status
export const updatePaymentStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const payment = await Payment.findOneAndUpdate(
            { transactionId: req.params.transactionId },
            { status },
            { new: true }
        );
        if (!payment) {
            return res.status(404).json({ message: "Payment not found." });
        }
        res.status(200).json({ message: "Payment status updated successfully.", payment });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete a payment record
export const deletePayment = async (req, res) => {
    try {
        const payment = await Payment.findOneAndDelete({ transactionId: req.params.transactionId });
        if (!payment) {
            return res.status(404).json({ message: "Payment not found." });
        }
        res.status(200).json({ message: "Payment record deleted successfully." });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
