import type { Request, Response, NextFunction } from "express";

import fs from "fs";

const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    console.error("Error:", err.message);
    
    // Log to file for debugging
    try {
        fs.appendFileSync(
            "/Users/kunal/Desktop/Edureach Nxtwave/Edureach-platform/server/error.log", 
            `[${new Date().toISOString()}] ${err.message}\n${err.stack}\n\n`
        );
    } catch (e) {
        console.error("Failed to write to error.log", e);
    }

    res.status(500).json({
        success: false,
        message: err.message || "Internal server error.",
    });
};

export default errorHandler;