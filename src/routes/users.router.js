import { Router } from "express";
import { listUsers } from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";

const router = Router();

// Ruta administrativa: exclusiva para role "admin" (401 sin sesion, 403 si no es admin).
router.get("/", authenticate, authorize("admin"), listUsers);

export default router;
