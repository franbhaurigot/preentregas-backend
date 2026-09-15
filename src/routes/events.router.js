import { Router } from "express";
import {
  listEvents,
  listMyEvents,
  getEvent,
  createEvent,
  updateEvent,
  publishEvent,
  cancelEvent,
  deleteEvent,
  listEventAttendees
} from "../controllers/event.controller.js";
import { createInscription } from "../controllers/ticket.controller.js";
import { authenticate, optionalAuthenticate, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", listEvents);
router.get("/mine", authenticate, authorize("organizer", "admin"), listMyEvents);
router.get("/:eid", optionalAuthenticate, getEvent);

router.post("/", authenticate, authorize("organizer", "admin"), createEvent);
router.put("/:eid", authenticate, authorize("organizer", "admin"), updateEvent);
router.post("/:eid/publish", authenticate, authorize("organizer", "admin"), publishEvent);
router.post("/:eid/cancel", authenticate, authorize("organizer", "admin"), cancelEvent);
router.delete("/:eid", authenticate, authorize("organizer", "admin"), deleteEvent);

router.get("/:eid/tickets", authenticate, authorize("organizer", "admin"), listEventAttendees);
router.post("/:eid/inscriptions", authenticate, createInscription);

export default router;
