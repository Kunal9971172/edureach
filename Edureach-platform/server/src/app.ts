import express from "express";
import type { Application, Request, Response } from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.ts";
import errorHandler from "./middleware/error-handler.middleware.ts";
import chatRoutes from "./routes/chat.routes.ts";

import expressWs from "express-ws";

const baseApp = express();
const wsInstance = expressWs(baseApp);
const app = wsInstance.app as any;

app.use((req: Request, res: Response, next: express.NextFunction) => {
    console.log(`Incoming ${req.method} request to ${req.url}`);
    next();
});

app.use(
    cors({
        origin: (origin, callback) => {
            console.log("CORS Origin:", origin);
            const allowedOrigins = [
                process.env.CLIENT_URL || "http://localhost:5173",
                "http://localhost:3000",
                "http://localhost:8000",
                "http://localhost:5000",
                "http://localhost:8787",
                "http://localhost:8788",
                "http://localhost:8789"
            ];

            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                console.warn("CORS Blocked for origin:", origin);
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"],
    }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));


app.get("/", (_req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "EduReach Backend Running Successfully"
    });
});

import { getRAGResponse } from "./services/rag.service.ts";
import adminRoutes from "./routes/admin.routes.ts";

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);



app.use((_req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: "Route not found."
    });
});

app.use(errorHandler);

export default app;

