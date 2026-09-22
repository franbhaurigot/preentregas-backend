import { randomUUID } from "node:crypto";
import { ticketRepository, eventRepository, userRepository } from "../repositories/index.js";
import { TicketDTO } from "../dto/index.js";
import { errors } from "../utils/errors.js";
import { assertValidId, toPositiveInt, parsePagination } from "../utils/validate.js";
import { sendMail } from "../utils/mailer.js";

/**
 * Reglas de negocio de inscripciones:
 * existencia y estado del evento, cupos (por cantidad, no solo por ticket),
 * duplicados, propiedad del ticket y notificacion.
 */
export class TicketService {
  constructor(tickets = ticketRepository, events = eventRepository, users = userRepository) {
    this.tickets = tickets;
    this.events = events;
    this.users = users;
  }

  #buildReservationCode() {
    return `TCK-${randomUUID().split("-")[0].toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  }

  async #notifyInscription(user, event, ticket) {
    if (!user?.email) return;
    await sendMail({
      to: user.email,
      subject: `Inscripcion confirmada: ${event.title}`,
      html: `
        <h2>Hola ${user.first_name},</h2>
        <p>Tu inscripcion a <strong>${event.title}</strong> fue confirmada.</p>
        <ul>
          <li><strong>Codigo de reserva:</strong> ${ticket.reservationCode}</li>
          <li><strong>Cantidad:</strong> ${ticket.quantity}</li>
          <li><strong>Fecha:</strong> ${new Date(event.date).toLocaleString("es-AR")}</li>
          <li><strong>Lugar:</strong> ${event.location}</li>
          <li><strong>Precio unitario:</strong> $${ticket.price}</li>
        </ul>
        <p>Podes cancelar tu inscripcion desde tu cuenta.</p>
      `
    });
  }

  async createInscription(eventId, user, { quantity } = {}) {
    const id = assertValidId(eventId, "evento");
    const event = await this.events.findById(id);
    if (!event) throw errors.notFound("El evento solicitado no existe");

    if (event.status === "cancelled") throw errors.conflict("El evento fue cancelado");
    if (event.status === "finished") throw errors.conflict("El evento ya finalizo");
    if (event.status !== "published") throw errors.conflict("El evento todavia no esta publicado");
    if (new Date(event.date).getTime() <= Date.now()) {
      throw errors.conflict("El evento ya finalizo: no admite nuevas inscripciones");
    }

    const requestedQuantity = quantity === undefined ? 1 : toPositiveInt(quantity, "quantity");

    const userId = String(user.id ?? user._id);
    if (String(event.organizer?._id ?? event.organizer) === userId) {
      throw errors.conflict("El organizador no puede inscribirse a su propio evento");
    }

    const existing = await this.tickets.findConfirmedTicketByUserAndEvent(userId, id);
    if (existing) throw errors.conflict("Ya estas inscripto en este evento");

    const sold = await this.tickets.sumConfirmedQuantityByEvent(id);
    if (sold + requestedQuantity > event.capacity) {
      throw errors.conflict("No quedan cupos disponibles para este evento");
    }

    const created = await this.tickets.createTicket({
      reservationCode: this.#buildReservationCode(),
      user: userId,
      event: id,
      quantity: requestedQuantity,
      price: event.price ?? 0,
      status: "confirmed"
    });

    const fullUser = await this.users.findById(userId);
    await this.#notifyInscription(fullUser, event, created);

    const ticket = await this.tickets.findById(String(created._id));
    return TicketDTO.single(ticket);
  }

  async listMyTickets(user, query = {}) {
    const { limit, page, skip } = parsePagination(query);
    if (query.status && !["pending", "confirmed", "cancelled"].includes(query.status)) {
      throw errors.badRequest('El filtro "status" debe ser "pending", "confirmed" o "cancelled"');
    }
    const tickets = await this.tickets.findTicketsByUser(String(user.id ?? user._id), {
      status: query.status,
      limit,
      skip
    });
    return { data: TicketDTO.list(tickets), page, limit };
  }

  async getById(ticketId, user) {
    const id = assertValidId(ticketId, "ticket");
    const ticket = await this.tickets.findById(id);
    if (!ticket) throw errors.notFound("El ticket solicitado no existe");

    const ownerId = String(ticket.user?._id ?? ticket.user);
    if (ownerId !== String(user.id ?? user._id) && user.role !== "admin") {
      throw errors.forbidden("No tenes permisos para realizar esta accion");
    }
    return TicketDTO.single(ticket);
  }

  async cancel(ticketId, user) {
    const id = assertValidId(ticketId, "ticket");
    const ticket = await this.tickets.findById(id);
    if (!ticket) throw errors.notFound("El ticket solicitado no existe");

    const ownerId = String(ticket.user?._id ?? ticket.user);
    if (ownerId !== String(user.id ?? user._id) && user.role !== "admin") {
      throw errors.forbidden("No tenes permisos para realizar esta accion");
    }
    if (ticket.status === "cancelled") throw errors.conflict("El ticket ya estaba cancelado");

    const eventDate = ticket.event?.date ? new Date(ticket.event.date).getTime() : null;
    if (eventDate && eventDate <= Date.now()) {
      throw errors.conflict("No se puede cancelar la inscripcion de un evento que ya ocurrio");
    }

    const cancelled = await this.tickets.cancelTicket(id);
    return TicketDTO.single(cancelled);
  }
}

export const ticketService = new TicketService();
