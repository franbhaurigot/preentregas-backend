import { eventRepository, ticketRepository } from "../repositories/index.js";
import { EventDTO, TicketDTO } from "../dto/index.js";
import { errors } from "../utils/errors.js";
import { requireFields, assertValidId, toPositiveInt, toFutureDate, parsePagination } from "../utils/validate.js";

const STATUSES = ["draft", "published", "cancelled", "finished"];
// Estados terminales: una vez ahi, el evento no admite mas cambios de estado.
const TERMINAL_STATUSES = ["cancelled", "finished"];

const isOwnerOrAdmin = (event, user) =>
  String(event.organizer?._id ?? event.organizer) === String(user.id ?? user._id) || user.role === "admin";

export class EventService {
  constructor(events = eventRepository, tickets = ticketRepository) {
    this.events = events;
    this.tickets = tickets;
  }

  /** Cupos disponibles: suma la cantidad (quantity) de los tickets confirmados, no solo la cuenta de documentos. */
  async #withAvailability(event) {
    const soldSeats = await this.tickets.sumConfirmedQuantityByEvent(String(event._id));
    return EventDTO.single(event, {
      soldTickets: soldSeats,
      availableSeats: Math.max(event.capacity - soldSeats, 0)
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
    const filterQuery = {
      search: query.search,
      category: query.category,
      location: query.location,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      sort: query.sort
    };
    const [events, total] = await Promise.all([
      this.events.findPublishedEvents(filterQuery, { limit, skip }),
      this.events.countPublishedEvents(filterQuery)
    ]);
    const data = await Promise.all(events.map((event) => this.#withAvailability(event)));
    return { data, page, limit, total, totalPages: Math.ceil(total / limit) || 1 };
  }

  async listMine(user, query = {}) {
    const { limit, page, skip } = parsePagination(query);
    const events = await this.events.findEventsByOrganizer(String(user.id ?? user._id), { limit, skip });
    const data = await Promise.all(events.map((event) => this.#withAvailability(event)));
    return { data, page, limit };
  }

  /** Un evento en borrador o cancelado solo lo ve su organizador (o un admin). */
  async getById(eventId, user = null) {
    const event = await this.#getRawEventOrFail(eventId);
    if (event.status !== "published") {
      if (!user) throw errors.unauthorized("No autenticado");
      if (!isOwnerOrAdmin(event, user)) {
        throw errors.forbidden("No tenes permisos para realizar esta accion");
      }
    }
    return this.#withAvailability(event);
  }

  async create(data, user) {
    requireFields(data, ["title", "description", "category", "date", "location", "capacity"]);
    if (Number(data.price) < 0) throw errors.badRequest("El precio no puede ser negativo");

    const event = await this.events.createEvent({
      title: String(data.title).trim(),
      description: String(data.description).trim(),
      category: String(data.category).trim(),
      date: toFutureDate(data.date, "date"),
      location: String(data.location).trim(),
      capacity: toPositiveInt(data.capacity, "capacity"),
      price: data.price !== undefined ? Math.max(Number(data.price) || 0, 0) : 0,
      status: "draft",
      // El organizador se asigna SIEMPRE desde el usuario autenticado, nunca desde el body.
      organizer: String(user.id ?? user._id)
    });
    return this.#withAvailability(event);
  }

  async update(eventId, data, user) {
    const event = await this.#getRawEventOrFail(eventId);
    if (!isOwnerOrAdmin(event, user)) {
      throw errors.forbidden("No tenes permisos para realizar esta accion");
    }
    if (TERMINAL_STATUSES.includes(event.status)) {
      throw errors.conflict(`Un evento en estado "${event.status}" no puede modificarse`);
    }

    const update = {};
    if (data.title !== undefined) update.title = String(data.title).trim();
    if (data.description !== undefined) update.description = String(data.description).trim();
    if (data.category !== undefined) update.category = String(data.category).trim();
    if (data.location !== undefined) update.location = String(data.location).trim();
    if (data.date !== undefined) update.date = toFutureDate(data.date, "date");
    if (data.price !== undefined) {
      if (Number(data.price) < 0) throw errors.badRequest("El precio no puede ser negativo");
      update.price = Math.max(Number(data.price) || 0, 0);
    }

    if (data.capacity !== undefined) {
      const capacity = toPositiveInt(data.capacity, "capacity");
      const sold = await this.tickets.sumConfirmedQuantityByEvent(String(event._id));
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

  /**
   * PATCH /:id/status: unico punto de cambio de estado (reemplaza los
   * antiguos endpoints separados de publish/cancel). Valida transiciones
   * validas segun la regla de negocio.
   */
  async changeStatus(eventId, status, user) {
    if (!STATUSES.includes(status)) {
      throw errors.badRequest(`El estado debe ser uno de: ${STATUSES.join(", ")}`);
    }
    const event = await this.#getRawEventOrFail(eventId);
    if (!isOwnerOrAdmin(event, user)) {
      throw errors.forbidden("No tenes permisos para realizar esta accion");
    }
    if (TERMINAL_STATUSES.includes(event.status)) {
      throw errors.conflict(`Un evento en estado "${event.status}" no puede cambiar de estado`);
    }
    if (event.status === status) {
      throw errors.conflict(`El evento ya estaba en estado "${status}"`);
    }
    if (status === "published" && new Date(event.date).getTime() <= Date.now()) {
      throw errors.conflict("No se puede publicar un evento cuya fecha ya paso");
    }
    if (status === "finished" && new Date(event.date).getTime() > Date.now()) {
      throw errors.conflict("El evento todavia no llego a su fecha: no puede marcarse como finalizado");
    }

    const updated = await this.events.changeStatus(String(event._id), status);
    return this.#withAvailability(updated);
  }

  /** Listado de inscriptos: reservado al organizador del evento (o admin). */
  async listAttendees(eventId, user, query = {}) {
    const event = await this.#getRawEventOrFail(eventId);
    if (!isOwnerOrAdmin(event, user)) {
      throw errors.forbidden("No tenes permisos para realizar esta accion");
    }
    const { limit, skip, page } = parsePagination(query);
    const tickets = await this.tickets.findTicketsByEvent(String(event._id), {
      status: query.status,
      limit,
      skip
    });
    return { data: TicketDTO.list(tickets), page, limit };
  }
}

export const eventService = new EventService();
