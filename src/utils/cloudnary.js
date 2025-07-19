import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        const normalizedPath = path.resolve(localFilePath);
        console.log("📌 Uploading from:", normalizedPath);
        console.log("✅ Cloudinary Config:", cloudinary.config());

        const response = await cloudinary.uploader.upload(normalizedPath, {
            resource_type: "auto",
        });

        //console.log("✅ Uploaded successfully:", response.url);
        fs.unlinkSync(localFilePath);
        return response;

    } catch (error) {
        console.error("❌ Cloudinary upload failed:", error);
        if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
        return null;
    }
};

export { uploadOnCloudinary };
