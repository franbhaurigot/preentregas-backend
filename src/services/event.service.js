import { eventRepository, ticketRepository } from "../repositories/index.js";
import { EventDTO, TicketDTO } from "../dto/index.js";
import { errors } from "../utils/errors.js";
import { requireFields, assertValidId, toPositiveInt, toFutureDate, parsePagination } from "../utils/validate.js";

const isOwnerOrAdmin = (event, user) =>
  String(event.organizer?._id ?? event.organizer) === String(user.id ?? user._id) || user.role === "admin";

export class EventService {
  constructor(events = eventRepository, tickets = ticketRepository) {
    this.events = events;
    this.tickets = tickets;
  }

  /** Cupos disponibles: regla de negocio, vive en el service. */
  async #withAvailability(event) {
    const soldTickets = await this.tickets.countActiveTicketsByEvent(String(event._id));
    return EventDTO.single(event, {
      soldTickets,
      availableSeats: Math.max(event.capacity - soldTickets, 0)
    });
  }

  async #getRawEventOrFail(eventId) {
    const id = assertValidId(eventId, "evento");
    const event = await this.events.findById(id);
    if (!event) throw errors.notFound("El evento solicitado no existe");
    return event;
  }

  async listPublished(query = {}) {
    const { limit, page, skip } = parsePagination(query);
    const [events, total] = await Promise.all([
      this.events.findPublishedEvents({ search: query.search, location: query.location, limit, skip }),
      this.events.countPublishedEvents({ search: query.search, location: query.location })
    ]);
    const payload = await Promise.all(events.map((event) => this.#withAvailability(event)));
    return { events: payload, page, limit, total, totalPages: Math.ceil(total / limit) || 1 };
  }

  async listMine(user, query = {}) {
    const { limit, page, skip } = parsePagination(query);
    const events = await this.events.findEventsByOrganizer(String(user.id ?? user._id), { limit, skip });
    const payload = await Promise.all(events.map((event) => this.#withAvailability(event)));
    return { events: payload, page, limit };
  }

  /** Un evento en borrador o cancelado solo lo ve su organizador (o un admin). */
  async getById(eventId, user = null) {
    const event = await this.#getRawEventOrFail(eventId);
    if (event.status !== "published") {
      if (!user) throw errors.unauthorized("Necesitas iniciar sesion para ver este evento");
      if (!isOwnerOrAdmin(event, user)) {
        throw errors.forbidden("Solo el organizador puede ver un evento que no esta publicado");
      }
    }
    return this.#withAvailability(event);
  }

  async create(data, user) {
    requireFields(data, ["title", "date", "location", "capacity"]);
    const event = await this.events.createEvent({
      title: String(data.title).trim(),
      description: data.description ?? "",
      date: toFutureDate(data.date, "date"),
      location: String(data.location).trim(),
      capacity: toPositiveInt(data.capacity, "capacity"),
      price: data.price !== undefined ? Math.max(Number(data.price) || 0, 0) : 0,
      status: data.status === "published" ? "published" : "draft",
      organizer: String(user.id ?? user._id)
    });
    return this.#withAvailability(event);
  }

  async update(eventId, data, user) {
    const event = await this.#getRawEventOrFail(eventId);
    if (!isOwnerOrAdmin(event, user)) {
      throw errors.forbidden("Solo el organizador del evento puede modificarlo");
    }
    if (event.status === "cancelled") {
      throw errors.conflict("El evento esta cancelado y no puede modificarse");
    }

    const update = {};
    if (data.title !== undefined) update.title = String(data.title).trim();
    if (data.description !== undefined) update.description = String(data.description);
    if (data.location !== undefined) update.location = String(data.location).trim();
    if (data.date !== undefined) update.date = toFutureDate(data.date, "date");
    if (data.price !== undefined) update.price = Math.max(Number(data.price) || 0, 0);

    if (data.capacity !== undefined) {
      const capacity = toPositiveInt(data.capacity, "capacity");
      const sold = await this.tickets.countActiveTicketsByEvent(String(event._id));
      if (capacity < sold) {
        throw errors.conflict(
          `No se puede reducir el cupo por debajo de las inscripciones activas (${sold})`
        );
      }
      update.capacity = capacity;
    }

    if (!Object.keys(update).length) throw errors.badRequest("No se enviaron campos para actualizar");

    const updated = await this.events.updateEvent(String(event._id), update);
    return this.#withAvailability(updated);
  }

  async publish(eventId, user) {
    const event = await this.#getRawEventOrFail(eventId);
    if (!isOwnerOrAdmin(event, user)) {
      throw errors.forbidden("Solo el organizador del evento puede publicarlo");
    }
    if (event.status === "published") throw errors.conflict("El evento ya estaba publicado");
    if (event.status === "cancelled") throw errors.conflict("Un evento cancelado no puede publicarse");
    const updated = await this.events.changeStatus(String(event._id), "published");
    return this.#withAvailability(updated);
  }

  async cancel(eventId, user) {
    const event = await this.#getRawEventOrFail(eventId);
    if (!isOwnerOrAdmin(event, user)) {
      throw errors.forbidden("Solo el organizador del evento puede cancelarlo");
    }
    if (event.status === "cancelled") throw errors.conflict("El evento ya estaba cancelado");
    const updated = await this.events.changeStatus(String(event._id), "cancelled");
    return this.#withAvailability(updated);
  }

  async remove(eventId, user) {
    const event = await this.#getRawEventOrFail(eventId);
    if (!isOwnerOrAdmin(event, user)) {
      throw errors.forbidden("Solo el organizador del evento puede eliminarlo");
    }
    const sold = await this.tickets.countActiveTicketsByEvent(String(event._id));
    if (sold > 0) {
      throw errors.conflict("El evento tiene inscripciones activas: cancelalo en lugar de eliminarlo");
    }
    await this.events.deleteEvent(String(event._id));
    return { id: String(event._id), deleted: true };
  }

  /** Listado de inscriptos: reservado al organizador del evento. */
  async listAttendees(eventId, user, query = {}) {
    const event = await this.#getRawEventOrFail(eventId);
    if (!isOwnerOrAdmin(event, user)) {
      throw errors.forbidden("Solo el organizador puede ver los inscriptos del evento");
    }
    const { limit, skip, page } = parsePagination(query);
    const tickets = await this.tickets.findTicketsByEvent(String(event._id), {
      status: query.status,
      limit,
      skip
    });
    return { tickets: TicketDTO.list(tickets), page, limit };
  }
}

export const eventService = new EventService();
