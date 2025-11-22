import jwt  from "jsonwebtoken";
import { asyncHandler } from "../utils/asynchandler.js";
import User from "../models/UserModal.js";


export const protect = asyncHandler(async (req, res, next) => {
    let token;

    token = req.cookies.jwt;


    if(token){
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.userId).select("-password")
            next()
        } catch (e) {
            res.status(403);
            throw new Error("Not Authorised or Token Failed")
        }
    }else{
        res.status(401);
        throw new Error("Login Please")

    }

}) 

