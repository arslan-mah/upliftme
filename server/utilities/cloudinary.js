import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cloudinary Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Uploads an image from local storage to Cloudinary.
 * @param {string} imageName - The name of the image file in ../public/temp/
 * @returns {Promise<string>} - The Cloudinary URL of the uploaded image.
 */
const uploadToCloudinary = async (imageName) => {
    try {
        const imagePath = path.join(__dirname, '../public/temp/', imageName);

        // Check if the file exists
        try {
            await fs.access(imagePath);
        } catch {
            throw new Error(`File "${imageName}" not found in ../public/temp/`);
        }

        // Upload the image to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(imagePath, {
            folder: 'upliftme/temp', // Optional: Upload to a specific folder
            use_filename: true, 
            unique_filename: false,
        });

        // Remove the local file after upload (Async)
        fs.unlink(imagePath)
            .then(() => console.log(`Deleted local file: ${imagePath}`))
            .catch((err) => console.error(`Error deleting file: ${err.message}`));

       
        return uploadResult.secure_url;

    } catch (error) {
        
        throw error;
    }
};

export default uploadToCloudinary;
