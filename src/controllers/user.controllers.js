import { asyncHandler } from "../utils/asyncHandler.js";
import {apierror} from "../utils/apierror.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudnary.js";
import { apiresponse } from "../utils/apiresponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async(userId) => {
    try{
      const user = await User.findById(userId)
      const accessToken = user.generateAccessToken()
      const refreshToken = user.generateRefreshToken()

      user.refreshToken = refreshToken
    await user.save({validateBeforeSave: false})
      
      return {accessToken, refreshToken}
    }catch(error){
        throw new apierror(500,"Something went wrong while genratin token")
    }
}
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
        throw new apierror(409, "userwith email or username already exits")
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
    const loginUser = asyncHandler(async(req,res) =>{
      const{email,username,password} = req.body
      if (!username && !email) {
          throw new apierror(400,"username or email is required")
      }
      const user = await User.findOne({
        $or :[{username}, {email}]
      })
      if (!user) {
        throw new apierror(404,"user does not exists")
      }
      const isPasswordValid = await user.isPasswordCorrect(password)
       if (!isPasswordValid) {
        throw new apierror(401,"password is incorrect")
      }
    const{accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)
    
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
     const options ={
        httpOnly:true,
        secure: true 
     }
     return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",refreshToken,options)
     .json(
        new apiresponse(200,
            {
                user: loggedInUser,accessToken,refreshToken
            },
            "user logged in succesfully"
        )
     )
    }) 
    const logoutUser = asyncHandler(async(req,res)=>{
        await  User.findByIdAndUpdate(
            req.user._id,{
                $set:{
                    refreshToken:undefined
                }
            },
            {
                new: true
            }
         )
          const options ={
        httpOnly:true,
        secure: true 
     }
     return res .status(200)
     .clearCookie("accessToken",options)
     .clearCookie("refreshToken",options)
     .json(new apiresponse(200,{},"User logged out"))
    })
    const refreshAccessToken = asyncHandler(async(req,res)=>{
       const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
       if (incomingRefreshToken) {
          throw new apierror(401,"unauthorized request")
       }
  try {
      const decodedToken = jwt.verify(
          incomingRefreshToken,
          process.env.REFRESH_TOKEN_SECRET
      )
       const user = await User.findById(decodedToken?._id)
       if (!user) {
          throw new apierror(401,"invlaid refresh token")
       }
       if (incomingRefreshToken !== user?.refreshToken) {
          throw new apierror(401,"Refresh token is expired")
       }
       const options ={
          httpOnly:true,
          secure:true
       }
      const{accessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
       return res
       .status(200)
       .cookie("accessToken",accessToken)
       .cookie("refreshToken",newRefreshToken)
       .json(
          new apiresponse(
              200,
              {accessToken,refreshToken,newRefreshToken},
              "Access token refreshed"
          )
       )
  } catch (error) {
     throw apierror(401,error?.message || "invalid refrsh token")
  }
    })
export {registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}