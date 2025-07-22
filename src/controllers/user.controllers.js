import { asyncHandler } from "../utils/asyncHandler.js";
import {apierror} from "../utils/apierror.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudnary.js";
import { apiresponse } from "../utils/apiresponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

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
       if (!incomingRefreshToken) {
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
    const changeCurrentPassword = asyncHandler(async(req,res)=>{
        const{oldPassword,newPassword} = req.body
        
       const user =  User.findById(req.user?._id)
       const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
       if (!isPasswordCorrect) {
         throw new apierror(400,"Invalid old pass")
       }
       user.password = newPassword
       await user.save({validateBeforeSave:false})
       return res.status(200)
       .json(new apiresponse(200,{},"Password chnaged succesfully"))
    })
    const getCurrentUser = asyncHandler(async(req,res) =>{
        return res.status(200)
        .json(200,req.user,"current user fetched succesfully")
    })  
        const updateAccountDetails = asyncHandler(async(req,res)=>{
            const {fullname ,email} = req.body
            if (!fullname || !email) {
                throw new apierror(400,"all fields are ")
            }
        const user = await  User.findByIdAndUpdate(
            req.user?._id,
           {
             $set:{
                fullname:fullname,
                emai:email
             }
           },
           {new:true}    
        ).select("-password")

        return res.status(200)
        .json(new apiresponse(200,user,"accounts details succssfully"))
    })
    const updateUseravatar = asyncHandler(async(req,res)=>{
      const avatarlocalpath = req.file?.path
      if (!avatarlocalpath) {
        throw new apierror(400,"avatar file is missing")
      }
      const avatar = uploadOnCloudinary(avatarlocalpath)
      if (!avatar.url) {
        throw new apierror(400,"error while uploading on avatar")
      }
      const  user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new : true}
      ).select("-password")
       return res.status(200)
      .json(
        new apiresponse(200,user,"avatar image updated successfully")
      )
    })
    const UpdateCoverImage = asyncHandler(async(req,res) => {
        const coverimagelocalpath = req.file?.path
         if (!coverimagelocalpath) {
        throw new apierror(400,"coverimage file is missing")
      }
      const coverImage = uploadOnCloudinary(coverimagelocalpath)
      if (!coverImage.url) {
        throw new apierror(400,"error while uploading on cover image")
      }
        const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new : true}
      ).select("-password")
      return res.status(200)
      .json(
        new apiresponse(200,user,"cover image updated successfully")
      )
    })
    const getChannelProfile = asyncHandler(async(req,res) => {
        const {username} = req.params
        if (!username?.trim()) {
          throw new apierror(400,"username is missing")
        }
      const channel = await User.aggregate([{
        $match:{
          username:userame?.toLowerCase()
        }
      },{
        $lookup:{
          from:"subscriptions",
          localField:"_id",
          foreignField:"channel",
          as: "subscribers"
        },
      },
      {
        $lookup:{
            from:"subscriptions",
          localField:"_id",
          foreignField:"subscriber",
          as: "subscriberTo"
        }
      },
      {
        $addFields:{
          subscriberCount:{
            $size: "$subscribers"
          },
          channelsSubscribedToCount:{
            $size:"$subscribedTo"
          },
          isSubscribed:{
            $cond:{
              if :{$in: [req.user?._id, "subscribers.subscriber"]},
              then:true,
              else:false
            }
          }
        }
      },
      {
        $project:{
          fullname:1,
          username: 1,
          subscriberCount:1,
          channelsSubscribedToCount:1,
          isSubscribed:1,
          avatar:1,
          coverImage:1,
          email:1
        }
      }
    ])
    if (!channel?.length) {
      throw new apierror(404, "Channel does not exits")  
    }
    return res.status(200)
    .json(new apiresponse(200,channel[0],"User channel fetched successfully"))
    })
    const getwatchhistory = asyncHandler(async(req,res)=>{
       const user = await User.aggregate([
        {
          $match: {
             _id: new mongoose.Types.ObjectId(req.user._id)

          }
        },
        {
        $lookup:{
          from: "videos",
          localField: "watchHistory",
          foreignField: "_id",
          as: "watchHistory",
          pipeline:[
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as:"owner",
                pipeline:[{
                  $project:{
                    fullname: 1,
                    userame: 1,
                    avatar: 1
                  }
                },{
                  $addFields:{
                    owner:{
                      $first:"$owner"
                    }
                  }
                }]
              }
            }
          ]
        }
      }
       ])
       return res.status(200)
       .json(
        new apiresponse(
          200,
          user[0].watchHistory,
          "Watch history fetched successfully"
        )
       )
    })
export {registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
   getCurrentUser,
   updateAccountDetails,
  updateUseravatar,
  UpdateCoverImage,
  getChannelProfile,
  getwatchhistory
}