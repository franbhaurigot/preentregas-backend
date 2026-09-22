import { eventService } from "../services/index.js";
import { ok, created, asyncHandler } from "../utils/http.js";

export const listEvents = asyncHandler(async (req, res) =>
  ok(res, await eventService.listPublished(req.query))
);

export const listMyEvents = asyncHandler(async (req, res) =>
  ok(res, await eventService.listMine(req.user, req.query))
);

export const getEvent = asyncHandler(async (req, res) =>
  ok(res, await eventService.getById(req.params.eid, req.user))
);

export const createEvent = asyncHandler(async (req, res) =>
  created(res, await eventService.create(req.body, req.user))
);

export const updateEvent = asyncHandler(async (req, res) =>
  ok(res, await eventService.update(req.params.eid, req.body, req.user))
);

/** PATCH /:eid/status: unico endpoint de cambio de estado (draft/published/cancelled/finished). */
export const changeEventStatus = asyncHandler(async (req, res) =>
  ok(res, await eventService.changeStatus(req.params.eid, req.body.status, req.user))
);

export const listEventAttendees = asyncHandler(async (req, res) =>
  ok(res, await eventService.listAttendees(req.params.eid, req.user, req.query))
);
