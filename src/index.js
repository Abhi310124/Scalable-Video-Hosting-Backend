import { connect } from 'mongoose'
import {app} from './app.js'
import dotenv from "dotenv"
import connectDB from './database/index.js'


dotenv.config({
    path:'./.env'
})


const PORT=process.env.PORT || 7000

connectDB()
.then(()=>{
    app.listen(PORT,()=>{
        console.log(`Server is Connceted to the ${PORT}`)
    })
    
})
.catch((err)=>{
    console.log("MongoDB is not Connected!")
})