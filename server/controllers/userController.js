import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import options from "../constants.js";
import jwt from "jsonwebtoken";
import Subscription from "../models/subscription.model.js";
import Referral from "../models/referral.model.js";
import uploadToCloudinary from "../utilities/cloudinary.js";

const generateTokens = async (userId) => {
    try {
        // console.log(userId);
        
        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        // console.log(user);
        

        // Call methods on the user instance, not the model
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // Save refreshToken to user
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token");
    }
};

export const userSignUp = async (req, res) => {
    const { email, password, referredBy } = req.body;
    try {
        console.log(email, password);

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        console.log(existingUser);
        
        const newUser = new User({ email, password });
        await newUser.save({ validateBeforeSave: false });
        console.log(newUser);
        
        if (!newUser) {
            return res.status(400).json({ message: "User not created" });
        }
        await new Subscription({ subscriber: newUser._id }).save({ validateBeforeSave: false });

        if (referredBy) {
            await new Referral({ referrerId: referredBy, referredUserId: newUser._id }).save({ validateBeforeSave: false });
        }

        const { accessToken, refreshToken } = await generateTokens(newUser._id);
        if (accessToken && refreshToken) {
            res.cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).status(201).json({
                message: "User created successfully",
                data: newUser,
                id: newUser._id,
            });
        }
        else
        {
            return res.status(400).json({massage:"Error while genration access and refresh token"})
        }
    } catch (error) {
        
        console.log(error);
        res.status(500).json({ message: "Signup failed", error: error.message });
    }
};

export const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {

        const user = await User.findOne({ email });

        if (!user || !(await user.isPasswordCorrect(password))) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const { accessToken, refreshToken } = await generateTokens(user);
        res.cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json({
            message: "Login successful",
            id: user._id,
            data: { email: user.email, username: user.userName },
        });
    } catch (error) {
        
        res.status(500).json({ message: "Login failed", error: error.message });
    }
};

export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ id: user._id, email: user.email, username: user.userName, avatar:user.profile.avatar || null });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch profile", error: error.message });
    }
};

export const updateUserProfile = async (req, res) => {
    const { bio, role, username } = req.body;
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        user.profile.bio = bio;
        user.userName = username;
        user.role = role;
        if (req.file) {
            user.profile.avatar = await uploadToCloudinary(req.file.filename);
        }
        await user.save({ validateBeforeSave: false });
        res.json({ message: "Profile updated successfully", user });
    } catch (error) {
        res.status(500).json({ message: "Update failed", error: error.message });
    }
};

export const logoutUser = async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });
    res.clearCookie("accessToken").clearCookie("refreshToken").json("User logged out");
};
