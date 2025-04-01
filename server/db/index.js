import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect( `mongodb+srv://arslanmahmood:mongodb123@cluster0.bsiv9.mongodb.net/upliftme?retryWrites=true&w=majority&connectTimeoutMS=30000`)
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MONGODB connection FAILED ", error);
        process.exit(1)
    }
}

export default connectDB