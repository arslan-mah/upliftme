import express from "express";
import { userSignUp ,loginUser,updateUserProfile , getUserProfile,logoutUser } from "../controllers/userController.js";
import authMiddleware  from "../middlewares/auth.middleware.js";
import {upload} from "../middlewares/multer.middleware.js"
// import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// router.get("/createAccount", authenticate, getUserProfile);
router.post("/createAccount", userSignUp);
router.post("/login", loginUser);
router.get("/me", authMiddleware, getUserProfile);
router.post("/logout", authMiddleware, logoutUser);
router.post("/createProfile",authMiddleware, upload.single("file"),(req, res, next)=>{
    if(!req.file){
        res.status(400).json({message:"file is required"})
    }
    next()
}, updateUserProfile);

export default router;