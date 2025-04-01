import jwt from "jsonwebtoken";
import User from "../models/user.model.js";


 const authMiddleware = async (req, res, next) => {
  try {
    // Get token from cookies (use correct cookie name)
   

    const token = req.cookies.accessToken; 
   
    
    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
  

    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Find user in DB
    const user = await User.findOne({ _id: decoded._id });

    if (!user) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
  

    }

    req.user = user;
    next();
  } catch (error) {
   

    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};
export default authMiddleware;