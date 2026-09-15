import { Router } from "express";
import sessionsRouter from "./sessions.router.js";
import eventsRouter from "./events.router.js";
import ticketsRouter from "./tickets.router.js";

const router = Router();

router.get("/health", (_req, res) => res.json({ status: "success", payload: { up: true } }));
router.use("/sessions", sessionsRouter);
router.use("/events", eventsRouter);
router.use("/tickets", ticketsRouter);

export default router;
