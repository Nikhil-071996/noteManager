import jwt from "jsonwebtoken";

const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: false,     
    sameSite: "lax",   
    maxAge: 3 * 24 * 60 * 60 * 1000,
    domain: "192.168.0.231",  
  });

  return token;
};

export default generateToken;
