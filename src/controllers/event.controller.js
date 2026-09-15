import { eventService } from "../services/index.js";
import { ok, created, asyncHandler } from "../utils/http.js";

export const listEvents = asyncHandler(async (req, res) =>
  ok(res, await eventService.listPublished(req.query))
);

export const listMyEvents = asyncHandler(async (req, res) =>
  ok(res, await eventService.listMine(req.user, req.query))
);

export const getEvent = asyncHandler(async (req, res) =>
  ok(res, { event: await eventService.getById(req.params.eid, req.user) })
);

export const createEvent = asyncHandler(async (req, res) =>
  created(res, { event: await eventService.create(req.body, req.user) })
);

export const updateEvent = asyncHandler(async (req, res) =>
  ok(res, { event: await eventService.update(req.params.eid, req.body, req.user) })
);

export const publishEvent = asyncHandler(async (req, res) =>
  ok(res, { event: await eventService.publish(req.params.eid, req.user) })
);

export const cancelEvent = asyncHandler(async (req, res) =>
  ok(res, { event: await eventService.cancel(req.params.eid, req.user) })
);

export const deleteEvent = asyncHandler(async (req, res) =>
  ok(res, await eventService.remove(req.params.eid, req.user))
);

export const listEventAttendees = asyncHandler(async (req, res) =>
  ok(res, await eventService.listAttendees(req.params.eid, req.user, req.query))
);
