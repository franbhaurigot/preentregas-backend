import { Router } from "express";
import {
  listEvents,
  listMyEvents,
  getEvent,
  createEvent,
  updateEvent,
  changeEventStatus,
  listEventAttendees
} from "../controllers/event.controller.js";
import { createInscription } from "../controllers/ticket.controller.js";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";

const router = Router();

router.get("/", listEvents);
router.get("/mine", authenticate, authorize("organizer", "admin"), listMyEvents);
router.get("/:eid", optionalAuthenticate, getEvent);

router.post("/", authenticate, authorize("organizer", "admin"), createEvent);
router.put("/:eid", authenticate, authorize("organizer", "admin"), updateEvent);
router.patch("/:eid/status", authenticate, authorize("organizer", "admin"), changeEventStatus);

router.get("/:eid/tickets", authenticate, authorize("organizer", "admin"), listEventAttendees);
router.post("/:eid/tickets", authenticate, createInscription);

export default router;
