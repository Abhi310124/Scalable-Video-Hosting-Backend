import {asyncHandler}  from "../utils/asynchandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.models.js"

import { uploadOnCloudinary,deleteFromCloudinary } from "../utils/cloudinary.js"

import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"


//Helper Function to generate Tokens.
const generateAccessAndRefreshToken = async (userId)=>{
    try {
        const user = await User.findById(userId)
        if(!user){
            throw new ApiError(404,"User Not Found") //if user not found
        }
    
        const accesssToken = user.generateAccesssToken();
        const refreshToken = user.generateRefreshToken();
        
        user.refreshToken=refreshToken
        await user.save({validateBeforeSave : false})
        return {accesssToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating access and refresh tokens")

        
    }
    

}

const registerUser = asyncHandler(async (req,res) => {
    const {fullName,email,username,password} = req.body

    //validation

    // if(fullName?.trim()===""){
    //     throw new ApiError(400,"All Fields are Required")
    // } this can be one method  you should do this for each field...

    if(
        [fullName,email,username,password].some((field)=> field ?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required")
    }//here we are checking all the fileds at a time so that if any filed is missing it immediately throws error,this is a good practice instead of doing it for each filed.


    const existedUser = await User.findOne({
        $or : [{username},{email}]
    })
    // console.log(existedUser)
    if(existedUser){
        throw new ApiError(409,"User with email or username already exists!")
    }

    console.warn(req.body)
    console.warn(req.files)

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if (!avatarLocalPath) {
        throw new ApiError(410, "Avatar file is missing!");
    }
    if (!coverImageLocalPath) {
        throw new ApiError(410, "Cover image file is missing!");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    
    try {
        const user = await User.create({
            fullName,
            avatar : avatar.url,
            coverImage : coverImage?.url || "",
            email,
            password,
            username : username.toLowerCase()
        })
    
        const createduser = await User.findById(user._id).select("-password -refreshToken")
        if(!createduser){
            throw new ApiError(412, "Something went wrong while creating the account!");
    
        }
    
        return res
        .status(201)
        .json(new ApiResponse(200,createduser,"User registered Successfully!"))
    } catch (error) {
        console.log("User creation failed")

        if(avatar){
            await deleteFromCloudinary(avatar.public_id)
        }
        if(coverImage){
            await deleteFromCloudinary(coverImage.public_id)
        }
        throw new ApiError(412, "Something went wrong while creating the account and the images were deleted.");
        
    }

})


const loginUser = asyncHandler(async(registerUser,res)=>{
    //get data from body

    const {email,username,password}=req.body

    if(!email || !password){
        throw new ApiError(400,"Missed Email or Password !")
    }
    const user = await User.findOne({
        $or : [{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"User is not found ")
    }

    //validate password
    const isPassValid = await user.isPasswordCorrect(password)
    if(!isPassValid){
        throw new ApiError(401,"Invalid Password")
    }

    const {accesssToken,refreshToken}=await
    generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    if(!loggedInUser){
        throw new ApiError(400,"User Not Detected..")
    }
    const options ={
        httpOnly : true,
        secure : process.env.NODE_ENV==="production"
    }


    return res
    .status(200)
    .cookie("accessToken",accesssToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(new ApiResponse(200,
        {user : loggedInUser,accesssToken,refreshToken},
        "User Logged in successfully"
    ))

})

const refreshAccessToken = asyncHandler( async (req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Refresh Token is Required")
    }
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if(!user){
            throw new ApiError(401,"Invalid Refresh Token")
        }

        if(user.refreshToken !== user?.refreshToken){
            throw new ApiError(401,"Invalid Refresh Token")
        }

        const options ={
            httpOnly : true,
            secure : process.env.NODE_ENV==="production"
        }

        const {accesssToken,refreshToken : newRefreshToken} = await generateAccessAndRefreshToken(user._id)

        return res
        .status(200)
        .cookie("accessToken",accesssToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(new ApiResponse(200,
            {refreshToken : newRefreshToken},
            "Access token refreshed Successfully"
        ))

    } catch (error) {
        throw new ApiError(500,"Something went wrong while refreshing the access token")
    }
}) 

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body
    const user = await User.findById(req.user?._id)

    user.isPasswordValid = await user.isPasswordCorrect(oldPassword)

    if(!isPassValid){
        throw new ApiError(401,"Old password is incorrect")
    }

    user.password = newPassword
    await user.save({validateBeforeSave : false})
    return res.status(200).json(new ApiResponse(200,"Password is changed"))

})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200).json(new ApiResponse(200,req.user,"Current user details"))
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName,email} = req.body

    if(!fullName || !email){
        throw new ApiError(400,"Fullname and email are required")
    }
    const user= User.findByIdAndUpdate(
        req.user._id,
        {
            $set :{
                fullName,
                email:email
            }
        },
        {new : true}

    ).select("-password -refreshToke")

    return res.status(200).json(new ApiResponse(200,user,"Account details updated Succesfully"))

})


const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO: delete old image - assignment

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})


const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}