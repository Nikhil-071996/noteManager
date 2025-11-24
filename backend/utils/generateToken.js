import jwt from "jsonwebtoken";

const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });


  res.cookie("jwt", token, {
    httpOnly: true,
    secure: true,             // secure only on HTTPS (production)
    sameSite: "none", 
    maxAge: 3 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  return token;
};

export default generateToken;
