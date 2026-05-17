import { Router } from "express";
import { getUsers, updateUser, summarizeChat } from "../controllers/admin.controller.ts";
import authMiddleware from "../middleware/auth.middleware.ts";

const router = Router();
router.use(authMiddleware);

router.get("/users", getUsers);
router.patch("/users/:id", updateUser);
router.post("/users/:id/summarize", summarizeChat);

export default router;
