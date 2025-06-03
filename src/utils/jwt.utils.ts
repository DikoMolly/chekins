require('dotenv').config();
import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.JWT_SECRET_KEY || 'secret';

export const generateToken = (payload: any) => {
    return jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });
};

export const verifyToken = (token: string) => {
    return jwt.verify(token, SECRET_KEY);
};

export const decodeToken = (token: string) => {
    return jwt.decode(token);
};

export const generateRefreshToken = (payload: any) => {
    return jwt.sign(payload, SECRET_KEY, { expiresIn: '7d' });
};

export const verifyRefreshToken = (token: string) => {
    return jwt.verify(token, SECRET_KEY);
};
