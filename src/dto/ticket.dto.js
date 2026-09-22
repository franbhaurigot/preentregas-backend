import { toId, isPopulated } from "./helpers.js";
import { UserDTO } from "./user.dto.js";
import { EventDTO } from "./event.dto.js";

export class TicketDTO {
  static single(ticket) {
    if (!ticket) return null;
    return {
      id: toId(ticket),
      reservationCode: ticket.reservationCode,
      status: ticket.status,
      quantity: ticket.quantity,
      price: ticket.price,
      createdAt: ticket.createdAt,
      cancelledAt: ticket.cancelledAt ?? null,
      // Si el usuario viene populado se filtra con el DTO: nunca sale el password.
      user: isPopulated(ticket.user)
        ? UserDTO.publicProfile(ticket.user)
        : { id: toId(ticket.user) },
      event: EventDTO.summary(ticket.event)
    };
  }

  static list(tickets = []) {
    return tickets.map((t) => TicketDTO.single(t));
  }
}
