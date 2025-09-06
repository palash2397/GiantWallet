import jwt from "jsonwebtoken";
import { ApiResponse } from "../utils/ApiReponse.js";

export const auth = (req, res, next) => {
  const token =  req.header("Authorization")?.replace("Bearer ", "").trim();

  if (!token)
    return res.status(401).json(new ApiResponse(401, {}, `No token provided`));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded:", decoded);
    req.user = decoded;
    next();
  } catch (error) {
    
    res.status(401).json(new ApiResponse(401, {}, `Invalid token`));
  }
};


export const isSuperAdmin = (req, res, next) => {
  console.log("User Role:", req.user.role);
  if (req.user.role !== 'superAdmin') {
   
     return res.status(401).json(new ApiResponse(401, {}, "Access is forbidden"));
  }
  next();
};


export const isAdmin = (req, res, next) => {
  console.log("User Role:", req.user.role);
  if (req.user.role !== 'admin') {
   
     return res.status(401).json(new ApiResponse(401, {}, "Access is forbidden"));
  }
  next();
};

