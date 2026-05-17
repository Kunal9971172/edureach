import type { Request, Response, NextFunction } from "express";
import User from "../models/user.model.ts";

// GET /api/admin/users
export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const currentUser = (req as any).user;
        const adminUser = await User.findById(currentUser.userId);
        
        if (!adminUser || adminUser.role !== "admin") {
            res.status(403).json({ success: false, message: "Forbidden: Admin access required." });
            return;
        }

        const users = await User.find({ role: { $ne: "admin" } })
            .select("-password")
            .sort({ created_at: -1 });

        res.status(200).json({ success: true, data: { users } });
    } catch (error) { next(error); }
};

// PATCH /api/admin/users/:id
export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const currentUser = (req as any).user;
        const adminUser = await User.findById(currentUser.userId);
        
        if (!adminUser || adminUser.role !== "admin") {
            res.status(403).json({ success: false, message: "Forbidden: Admin access required." });
            return;
        }

        const { id } = req.params;
        const { callStatus, priority } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: { callStatus, priority } },
            { new: true, runValidators: true }
        ).select("-password");

        if (!updatedUser) {
            res.status(404).json({ success: false, message: "User not found." });
            return;
        }

        res.status(200).json({ success: true, data: { user: updatedUser } });
    } catch (error) { next(error); }
};

// POST /api/admin/users/:id/summarize
export const summarizeChat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const currentUser = (req as any).user;
        const adminUser = await User.findById(currentUser.userId);
        
        if (!adminUser || adminUser.role !== "admin") {
            res.status(403).json({ success: false, message: "Forbidden: Admin access required." });
            return;
        }

        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            res.status(404).json({ success: false, message: "User not found." });
            return;
        }

        if (!user.messages || user.messages.length === 0) {
            res.status(200).json({ success: true, data: { summary: "No chat history available." } });
            return;
        }

        // Prepare context
        const conversationText = user.messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
        const prompt = `Summarize the following chat between a student and a college counselor AI bot. Extract key interests, concerns, requested courses, and intent. Keep it concise (3-4 bullet points).\n\nChat:\n${conversationText}`;

        const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
        const response = await fetch("https://api.sarvam.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SARVAM_API_KEY || ""}`
            },
            body: JSON.stringify({
                model: "sarvam-105b",
                messages: [
                    { role: "system", content: "You are a summarization assistant for an admission counselor. Provide a professional, very brief summary in bullet points." },
                    { role: "user", content: prompt }
                ]
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(`Sarvam AI Error: ${JSON.stringify(err)}`);
        }

        const data: any = await response.json();
        const summary = data.choices[0].message.content;

        await User.findByIdAndUpdate(id, { $set: { chatSummary: summary } });

        res.status(200).json({ success: true, data: { summary } });
    } catch (error) { next(error); }
};
