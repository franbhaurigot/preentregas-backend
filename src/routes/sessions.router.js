import { Router } from "express";
import { register, login, current, logout } from "../controllers/sessions.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/current", authenticate, current);
router.post("/logout", authenticate, logout);

export default router;
