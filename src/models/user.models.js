// id: string pk
// username: string
// email: string
// fullName: string
// avatar: string
// coverImage string
// watchHistory: Array of ObjectIds referencing videos
// password: string
// refreshToken: string
// createdAt: Date
// updatedAt: Date


import mongoose ,{Schema}from "mongoose";

import bcrypt from "bcrypt"

import jwt from "jsonwebtoken"

const userSchema = new Schema(
    {
    username : {
        type : String,
        required : true,
        unique : true,
        lowercase : true,
        trim : true,
        index : true,
    },
    email :{
        type : String,
        required : true,
        unique : true,
        lowercase : true,
        trim : true,
    },
    fullName : {
        type : String,
        required : true,
        trim : true,
        index : true,

    },
    avatar : {
        type : String,  //URL of the image
        required : true,  
    },
    coverImage :{
        type : String,  //URl of the image
        required : true
    },
    watchHistory: [
    {
      type: Schema.Types.ObjectId,
      ref: "Video",       // Assuming you have a Video model
    }
    ],
    password: {
        type: String,
        required: [true,"Password is Required."], //Here we are ensuring that the password block must be filled and if not filled it returns the error message which i have written.        
        select: false,         // Prevents password from being returned in queries by default
    },
    refreshToken: {
        type: String,
        select: false,         // Hide from queries unless explicitly selected
    }
},{timestamps : true}) //Here the created and updated At fields are cretaed automatically when ever the al the fields are filled.


userSchema.pre("save",async function (next) {
    
    if(!this.isModified("password"))  return next
    
    this.password=bcrypt.hash(this.password,12)

    next()
})


userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password,this.password)
    
}


userSchema.methods.generateAccessToken = function (){
    //short lived access token (we can describe the expiry time)
    return jwt.sign({
        _id :this._id,
        email : this.email,
        username : this.username,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_TIME }
    );
}



userSchema.methods.generateRefreshToken = function (){
    //short lived access token (we can describe the expiry time)
    return jwt.sign({
        _id :this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_TIME }
    );
}




export const User=mongoose.model("User",userSchema)