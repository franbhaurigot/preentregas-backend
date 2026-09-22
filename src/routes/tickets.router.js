import { Router } from "express";
import {
  createInscription,
  listMyTickets,
  getTicket,
  cancelTicket
} from "../controllers/ticket.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

// Ruta principal pedida por la consigna: POST /api/events/:eid/tickets (ver events.router.js).
// Se deja tambien un alias plano por comodidad de pruebas manuales.
router.post("/", authenticate, createInscription);

router.get("/my-tickets", authenticate, listMyTickets);
router.get("/mine", authenticate, listMyTickets); // alias retrocompatible

router.get("/:tid", authenticate, getTicket);
router.patch("/:tid/cancel", authenticate, cancelTicket);

export default router;
