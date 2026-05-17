import { Router } from "express";
import { register, login, getMe, googleAuth } from "../controllers/auth.controller.ts";
import authMiddleware from "../middleware/auth.middleware.ts";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleAuth);
router.get("/me", authMiddleware, getMe);

export default router;