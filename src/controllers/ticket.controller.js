import { ticketService } from "../services/index.js";
import { ok, created, asyncHandler } from "../utils/http.js";

export const createInscription = asyncHandler(async (req, res) => {
  const eventId = req.params.eid ?? req.body.eventId;
  return created(res, await ticketService.createInscription(eventId, req.user, { quantity: req.body.quantity }));
});

export const listMyTickets = asyncHandler(async (req, res) =>
  ok(res, await ticketService.listMyTickets(req.user, req.query))
);

export const getTicket = asyncHandler(async (req, res) =>
  ok(res, await ticketService.getById(req.params.tid, req.user))
);

export const cancelTicket = asyncHandler(async (req, res) =>
  ok(res, await ticketService.cancel(req.params.tid, req.user))
);
