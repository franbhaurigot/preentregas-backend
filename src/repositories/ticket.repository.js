import { ticketDAO } from "../dao/ticket.dao.js";

/**
 * El populate nunca trae el password: se restringe por select
 * y ademas el DTO vuelve a filtrar los campos expuestos.
 */
const FULL_POPULATE = [
  { path: "user", select: "first_name last_name email role" },
  { path: "event", select: "title date location price status organizer" }
];

export class TicketRepository {
  constructor(dao = ticketDAO) {
    this.dao = dao;
  }

  createTicket(data) {
    return this.dao.create(data);
  }

  findById(id) {
    return this.dao.findById(id, { populate: FULL_POPULATE });
  }

  findTicketsByUser(userId, { status, limit, skip } = {}) {
    const filter = { user: userId };
    if (status) filter.status = status;
    return this.dao.find(filter, { limit, skip, populate: FULL_POPULATE });
  }

  findTicketsByEvent(eventId, { status, limit, skip } = {}) {
    const filter = { event: eventId };
    if (status) filter.status = status;
    return this.dao.find(filter, { limit, skip, populate: FULL_POPULATE });
  }

  findActiveTicketByUserAndEvent(userId, eventId) {
    return this.dao.findOne({ user: userId, event: eventId, status: "active" });
  }

  countActiveTicketsByEvent(eventId) {
    return this.dao.count({ event: eventId, status: "active" });
  }

  cancelTicket(id) {
    return this.dao.updateById(id, { status: "cancelled" }, { populate: FULL_POPULATE });
  }
}

export const ticketRepository = new TicketRepository();
