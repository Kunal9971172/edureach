import { Router } from "express";
import { sendMessage, processAudioMessage, translateText } from "../controllers/chat.controller.ts";
import authMiddleware from "../middleware/auth.middleware.ts";

const router = Router();
router.use(authMiddleware);
router.post("/message", sendMessage);
router.post("/audio", processAudioMessage);
router.post("/translate", translateText);

export default router;