import { EventModel } from "../models/event.model.js";

export class EventDAO {
  create(data) {
    return EventModel.create(data).then((doc) => doc.toObject());
  }

  findById(id, { populate = null } = {}) {
    const query = EventModel.findById(id);
    if (populate) query.populate(populate);
    return query.lean();
  }

  findOne(filter = {}, { populate = null } = {}) {
    const query = EventModel.findOne(filter);
    if (populate) query.populate(populate);
    return query.lean();
  }

  find(filter = {}, { limit = 50, skip = 0, sort = { date: 1 }, populate = null } = {}) {
    const query = EventModel.find(filter).sort(sort).skip(skip).limit(limit);
    if (populate) query.populate(populate);
    return query.lean();
  }

  updateById(id, update, { populate = null } = {}) {
    const query = EventModel.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (populate) query.populate(populate);
    return query.lean();
  }

  deleteById(id) {
    return EventModel.findByIdAndDelete(id).lean();
  }

  count(filter = {}) {
    return EventModel.countDocuments(filter);
  }
}

export const eventDAO = new EventDAO();
