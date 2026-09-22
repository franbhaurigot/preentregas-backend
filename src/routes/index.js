import { Router } from "express";
import sessionsRouter from "./sessions.router.js";
import eventsRouter from "./events.router.js";
import ticketsRouter from "./tickets.router.js";
import usersRouter from "./users.router.js";

const router = Router();

router.get("/health", (_req, res) => res.json({ status: "ok", message: "Servidor activo" }));
router.use("/sessions", sessionsRouter);
router.use("/events", eventsRouter);
router.use("/tickets", ticketsRouter);
router.use("/users", usersRouter);

export default router;
