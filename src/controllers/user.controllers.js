import { asyncHandler } from "../db/asyncHandler.js";
import {apierror} from "../utils/apierror.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudnary.js";
import { apiresponse } from "../utils/apiresponse.js";
const registerUser = asyncHandler( async (req ,res) => {
   //get user details from frontend
   //validation -not empty
   //check if user already exits :username email
   //check for images check for avatar
   //upload them for cloudinary
   //create user object -create entry in db
   //remove password and refresh token field from response
   //check for user creation
   //return res

   const {fullname,email,username,password} = req.body || {}
  // console.log("email",email);
   if([fullname,email,username,password].some((field)=>
    field?.trim() === "")){
        throw new apierror(400,"all fields are required")
   }
    const exitedUser = await User.findOne({
        $or:[{username},{email}]
    })
    if(exitedUser){
        throw new apierror(409, "userwith email or username")
    }
   const avatarlocalpath =  req.files?.avatar[0]?.path;
  // const coverimagelocalpath = req.files?.coverimage[0]?.path;
     let coverimagelocalpath;
    if (req.files && Array.isArray(req.files.coverimage) && req.files.coverimage.length > 0) {
        coverimagelocalpath = req.files.coverimage[0].path
    }
  if (!avatarlocalpath) {
      throw new apierror(400,"Avatar file is required")
   }

    const avatar =  await uploadOnCloudinary(avatarlocalpath)
    const coverimage = await uploadOnCloudinary(coverimagelocalpath)
    if(!avatar){
           throw new apierror(400,"Avatar file is required")
    }
    const user = await  User.create({
        fullname,
        avatar:avatar.url,
        coverimage: coverimage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
     })
    const createduser = await  User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createduser) {
        throw new apierror(500,"something went wrong while registration")
    }
    return res.status(200).json(
        new apiresponse(200,createduser,"user registred successfully")
    )
    })
export {registerUser}