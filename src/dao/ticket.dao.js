import { TicketModel } from "../models/ticket.model.js";

export class TicketDAO {
  create(data) {
    return TicketModel.create(data).then((doc) => doc.toObject());
  }

  findById(id, { populate = null } = {}) {
    const query = TicketModel.findById(id);
    if (populate) query.populate(populate);
    return query.lean();
  }

  findOne(filter = {}, { populate = null } = {}) {
    const query = TicketModel.findOne(filter);
    if (populate) query.populate(populate);
    return query.lean();
  }

  find(filter = {}, { limit = 50, skip = 0, sort = { createdAt: -1 }, populate = null } = {}) {
    const query = TicketModel.find(filter).sort(sort).skip(skip).limit(limit);
    if (populate) query.populate(populate);
    return query.lean();
  }

  updateById(id, update, { populate = null } = {}) {
    const query = TicketModel.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (populate) query.populate(populate);
    return query.lean();
  }

  deleteById(id) {
    return TicketModel.findByIdAndDelete(id).lean();
  }

  count(filter = {}) {
    return TicketModel.countDocuments(filter);
  }
}

export const ticketDAO = new TicketDAO();
