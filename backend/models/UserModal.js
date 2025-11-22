import mongoose from "mongoose";
import bcrypt from "bcryptjs";



const userSchema = mongoose.Schema({
    name:{
        type: String,
        required: true,
        trim: true,
    },
    email:{
        type: String,
        required: true,
        unique: true,
    },
    password:{
        type: String,
        required: true
    },
}, {
    timestamps: true
})


userSchema.pre('save' , async function (next){
    if(!this.isModified('password')){
        next()
    }

    const salt = await bcrypt.genSalt(10);

    this.password = await bcrypt.hash(this.password, salt)
})

userSchema.methods.comparePassword = async function (password) {
        const result =  await bcrypt.compare(password, this.password)

        return result;
}

const User = mongoose.model("User",  userSchema);

export default User;