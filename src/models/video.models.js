// id: string, primary key (pk)

// owner: ObjectId referencing users

// videoFile: string

// thumbnail: string

// title: string

// description: string

// duration: number

// views: number

// isPublished: boolean

// createdAt: Date

// updatedAt: Date


import mongoose ,{Schema}from "mongoose";
import { User } from "./user.models";

import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const videoSchema = new Schema ({
    videoFile :{
        type : String,
        required: true
    },
    thumbnail : {
        type : String, //Image URL
        required : true,
    },
    title :{
        type : String,
        required : true,
    },
    description :{
      type : String,  
    },
    views :{
        type : Number,
        default : 0 
    },
    isPublished :{
        type : Boolean,
        default : true
    },
    owner : {
        type : Schema.Types.ObjectId,
        ref : "User",
    },
    
}, {timeseries : true})

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video",videoSchema);