import { asyncHandler } from "../utils/asyncHandler.js";
import { apierror } from "../utils/apierror.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";




export const verifyJWT = asyncHandler(async (req, res, next) => {
   try {
     console.log("Cookies:", req.cookies);
     console.log("Authorization Header:", req.header("Authorization"));

     const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "").trim();

     if (!token) {
         console.log("No token found!");
         throw new apierror(401, "unauthorized request");
     }

     const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
     const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

     if (!user) {
         console.log("Token decoded but user not found!");
         throw new apierror(401, "Invalid access token - user not found");
     }

     req.user = user;
     next();
   } catch (error) {
     console.error("Auth error:", error.message);
     throw new apierror(401, error?.message || "Invalid access token");
   }
});
