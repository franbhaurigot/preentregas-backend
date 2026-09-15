import { eventDAO } from "../dao/event.dao.js";

const ORGANIZER_POPULATE = { path: "organizer", select: "first_name last_name email role" };

export class EventRepository {
  constructor(dao = eventDAO) {
    this.dao = dao;
  }

  createEvent(data) {
    return this.dao.create(data);
  }

  findById(id) {
    return this.dao.findById(id, { populate: ORGANIZER_POPULATE });
  }

  findPublishedEvents({ search, location, limit, skip } = {}) {
    const filter = { status: "published" };
    if (location) filter.location = new RegExp(location, "i");
    if (search) filter.title = new RegExp(search, "i");
    return this.dao.find(filter, { limit, skip, sort: { date: 1 }, populate: ORGANIZER_POPULATE });
  }

  countPublishedEvents({ search, location } = {}) {
    const filter = { status: "published" };
    if (location) filter.location = new RegExp(location, "i");
    if (search) filter.title = new RegExp(search, "i");
    return this.dao.count(filter);
  }

  findEventsByOrganizer(organizerId, { limit, skip } = {}) {
    return this.dao.find({ organizer: organizerId }, { limit, skip, populate: ORGANIZER_POPULATE });
  }

  updateEvent(id, data) {
    return this.dao.updateById(id, data, { populate: ORGANIZER_POPULATE });
  }

  changeStatus(id, status) {
    return this.dao.updateById(id, { status }, { populate: ORGANIZER_POPULATE });
  }

  deleteEvent(id) {
    return this.dao.deleteById(id);
  }
}

export const eventRepository = new EventRepository();
