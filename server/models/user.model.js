import mongoose, { Schema } from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
const userSchema = new Schema(
    {
        userName: {
            type: String,
            required: true
        },
        role: {
            type: String,
            required: true,
            enum: ["hero", "uplifter", "admin"],
            required: true,
        },
        profile: {
            bio: { type: String, default: "" },
            avatar: { type: String, default: "" },
            referralCode: { type: String, unique: true,sparse: true },
            referredBy: { 
                type: mongoose.Schema.Types.ObjectId,
                ref: "User" 
            },
        },
        subscription: {
            sessionBalance: { type: Number, default: 0 },
            specialKeyAccess: { type: Boolean, default: false },
            purchasedBundles: [
                {
                    bundleSize: Number,
                    amountPaid: Number,
                    purchaseDate: { type: Date, default: Date.now }
                }
            ]
        },
        ratings: {
            givenRatings: [
                {
                    uplifterId: {
                        type: mongoose.Schema.Types.ObjectId, 
                        ref: "User"
                    },
                    rating: Number,
                    sessionId: mongoose.Schema.Types.ObjectId
                }
            ],
            receivedRatings: [
                {
                    heroId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "User"
                    },
                    rating: Number,
                    sessionId: mongoose.Schema.Types.ObjectId
                }
            ]
        },
        flags: [
            {
                reportedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User"
                },
                reason: String,
                date: { type: Date, default: Date.now }
            }
        ],
        status: {
            type: String,
            enum: ["active", "blocked", "banned"], // More appropriate names
            default: "active"
        },

        email: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
            required: true
        }

    },
    {
        timestamps: true
    }
)
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,

        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

const User = mongoose.model("User", userSchema)
export default User