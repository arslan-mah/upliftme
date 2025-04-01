import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js"

import {
    registerAdmin,
    loginAdmin,
    getAllAdmins,
    getAdminById,
    updateAdmin,
    deleteAdmin
} from "../controllers/adminController.js";

const router = express.Router();

// Define routes
router.post("/register", registerAdmin); // Register a new admin
router.post("/login", loginAdmin); // Admin login
router.get("/",authMiddleware, getAllAdmins); // Get all admins
router.get("/:id",authMiddleware, getAdminById); // Get a single admin by ID
router.put("/:id",authMiddleware, updateAdmin); // Update admin details
router.delete("/:id",authMiddleware, deleteAdmin); // Delete an admin

export default router;
