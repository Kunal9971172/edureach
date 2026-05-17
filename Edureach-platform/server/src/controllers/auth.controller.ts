import type { Request, Response, NextFunction } from "express";
import User from "../models/user.model.ts";
import { hashPassword, comparePassword } from "../utils/password.utils.ts";
import { generateToken } from "../utils/jwt.util.ts";

// POST /api/auth/register — Public — Create new account
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password || !phone) {
            res.status(400).json({ success: false, message: "Name, email, password, and phone number are required." });
            return;
        }

        if (password.length < 6) {
            res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
            return;
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            res.status(409).json({ success: false, message: "An account with this email already exists." });
            return;
        }

        const hashedPassword = await hashPassword(password);
        const user = await User.create({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            phone: phone,
        });

        const token = generateToken({ userId: user._id.toString(), email: user.email });

        res.status(201).json({
            success: true,
            message: "Account created successfully.",
            data: {
                token,
                user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role },
            },
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/login — Public — Verify credentials, return JWT
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ success: false, message: "Email and password are required." });
            return;
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            res.status(401).json({ success: false, message: "Invalid email or password." });
            return;
        }

        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({ success: false, message: "Invalid email or password." });
            return;
        }

        const token = generateToken({ userId: user._id.toString(), email: user.email });

        res.status(200).json({
            success: true,
            message: "Login successful.",
            data: {
                token,
                user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role },
            },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/auth/me — Protected — Return current user profile
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const currentUser = (req as any).user;

        if (!currentUser) {
            res.status(401).json({ success: false, message: "Not authenticated." });
            return;
        }

        const user = await User.findById(currentUser.userId).select("-password");
        if (!user) {
            res.status(404).json({ success: false, message: "User not found." });
            return;
        }

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    created_at: user.created_at,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/google — Public — Authenticate with Google
export const googleAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { credential, phone, isMock, mockData } = req.body;
        
        let email = "";
        let name = "";
        
        if (isMock) {
            email = mockData?.email?.toLowerCase();
            name = mockData?.name;
        } else {
            if (!credential) {
                res.status(400).json({ success: false, message: "Google ID token (credential) is required." });
                return;
            }
            // Verify Google ID token using googleapis tokeninfo
            const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
            if (!verifyRes.ok) {
                res.status(400).json({ success: false, message: "Invalid Google ID token." });
                return;
            }
            const payload: any = await verifyRes.json();
            email = payload.email?.toLowerCase();
            name = payload.name;
        }

        if (!email) {
            res.status(400).json({ success: false, message: "Google account does not have an email address." });
            return;
        }

        // Check if user already exists
        let user = await User.findOne({ email });
        
        if (!user) {
            // If they don't exist, this is a signup, so we need a phone number!
            if (!phone) {
                res.status(200).json({
                    success: true,
                    requiresPhone: true,
                    data: { email, name }
                });
                return;
            }

            // Create user with a generated secure random password
            const randomPassword = Math.random().toString(36).slice(-10) + "A1!";
            const hashedPassword = await hashPassword(randomPassword);
            
            user = await User.create({
                name,
                email,
                password: hashedPassword,
                phone,
            });
        }

        // Generate JWT token
        const token = generateToken({ userId: user._id.toString(), email: user.email });

        res.status(200).json({
            success: true,
            message: "Google authentication successful.",
            data: {
                token,
                user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role },
            },
        });
    } catch (error) { next(error); }
};