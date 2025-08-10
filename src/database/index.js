//Steps
/* 1. While connecting the database we get aot of error
so its better to use try catch block..so that every time we can expect the erros and we can throw it
*/

/*
2.Always think Database is present in other continent so it takes time to connect
so that its better use async await
*/

import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB=async()=>{
    try {
        const connectionInstance=await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)

        console.log(`\n Mongo DB is Connected ! DB hosts : ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log('Connection Error',error.message)
        process.exit(1)        
    }
}

export default connectDB