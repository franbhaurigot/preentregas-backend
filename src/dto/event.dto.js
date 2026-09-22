import { toId, isPopulated } from "./helpers.js";
import { UserDTO } from "./user.dto.js";

export class EventDTO {
  /**
   * @param {object} event documento plano del repository
   * @param {object} extra datos calculados por el service (ej. cupos disponibles)
   */
  static single(event, { availableSeats = null, soldTickets = null } = {}) {
    if (!event) return null;
    return {
      id: toId(event),
      title: event.title,
      description: event.description ?? "",
      category: event.category,
      date: event.date,
      location: event.location,
      price: event.price ?? 0,
      capacity: event.capacity,
      status: event.status,
      soldTickets,
      availableSeats,
      organizer: isPopulated(event.organizer)
        ? UserDTO.publicProfile(event.organizer)
        : { id: toId(event.organizer) },
      createdAt: event.createdAt
    };
  }

  /** Version compacta usada dentro del DTO de ticket. */
  static summary(event) {
    if (!event) return null;
    if (!isPopulated(event)) return { id: toId(event) };
    return {
      id: toId(event),
      title: event.title,
      date: event.date,
      location: event.location,
      price: event.price ?? 0,
      status: event.status
    };
  }

  static list(events = [], statsById = {}) {
    return events.map((event) => EventDTO.single(event, statsById[toId(event)] ?? {}));
  }
}
