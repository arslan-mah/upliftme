import Admin from "../models/admin.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Register a new admin
export const registerAdmin = async (req, res) => {
    try {
        const { userName, email, password, privileges } = req.body;

        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ message: "Admin already exists." });
        }

        const newAdmin = new Admin({ userName, email, password, privileges });
        await newAdmin.save();

        res.status(201).json({ message: "Admin registered successfully." });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Admin login
export const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(404).json({ message: "Admin not found." });
        }

        const isMatch = await admin.isPasswordCorrect(password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        const accessToken = admin.generateAccessToken();
        const refreshToken = admin.generateRefreshToken();

        res.status(200).json({ message: "Login successful", accessToken, refreshToken });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get all admins
export const getAllAdmins = async (req, res) => {
    try {
        const admins = await Admin.find();
        res.status(200).json(admins);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get a single admin by ID
export const getAdminById = async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ message: "Admin not found." });
        }
        res.status(200).json(admin);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update admin details
export const updateAdmin = async (req, res) => {
    try {
        const updatedAdmin = await Admin.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedAdmin) {
            return res.status(404).json({ message: "Admin not found." });
        }
        res.status(200).json({ message: "Admin updated successfully", updatedAdmin });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete an admin
export const deleteAdmin = async (req, res) => {
    try {
        const deletedAdmin = await Admin.findByIdAndDelete(req.params.id);
        if (!deletedAdmin) {
            return res.status(404).json({ message: "Admin not found." });
        }
        res.status(200).json({ message: "Admin deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
