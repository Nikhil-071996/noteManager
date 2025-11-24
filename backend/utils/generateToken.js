import jwt from "jsonwebtoken";

const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });

  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: isProduction,                   
    sameSite: isProduction ? "none" : "lax",
    domain: isProduction ? ".vercel.app" : undefined,  
    path: "/",                                
    maxAge: 3 * 24 * 60 * 60 * 1000,          
  });

  return token;
};

export default generateToken;
