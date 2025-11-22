import mongoose from "mongoose"


export const db = async () => {
    try {
        const link = await mongoose.connect(process.env.MONGODB_URI)
        console.log(`Db connected ${link.connection.host}`)
    } catch (error) {
        console.log("DB connection err" , error);
        process.exit(1);
    }
}