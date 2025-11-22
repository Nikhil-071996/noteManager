import User from "../models/UserModal.js";
import { asyncHandler } from "../utils/asynchandler.js";
import generateToken from "../utils/generateToken.js";


export const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    const existUser = await User.findOne({ email });

    if(existUser){
        res.status(403);
        throw new Error("User Already Exist")
    }

    const user = await User.create({
        name,
        email,
        password,
    })
    if(user){
        res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
        })
    }else{
        res.status(400)
        throw Error("invalid Data try again")
    }
})


export const signIn = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if(!user){
        res.status(404);
        throw new Error("User doesn't Exist")
    }

    if(user && (await user.comparePassword(password))){
        const token =  generateToken(res, user._id)

        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            token: token,
        })
    }else{
        res.status(401)
        throw new Error('invalid Email Or Password !')
    }

})