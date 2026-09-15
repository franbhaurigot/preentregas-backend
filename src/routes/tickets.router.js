import { Router } from "express";
import {
  createInscription,
  listMyTickets,
  getTicket,
  cancelTicket
} from "../controllers/ticket.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/", authenticate, createInscription);
router.get("/mine", authenticate, listMyTickets);
router.get("/:tid", authenticate, getTicket);
router.put("/:tid/cancel", authenticate, cancelTicket);

export default router;
