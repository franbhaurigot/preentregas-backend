import { eventDAO } from "../dao/event.dao.js";

const ORGANIZER_POPULATE = { path: "organizer", select: "first_name last_name email role" };

/** Traduce los filtros de dominio (category, location, rango de fechas) a un filtro de Mongo. */
const buildFilter = ({ status, search, category, location, dateFrom, dateTo } = {}) => {
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = new RegExp(`^${category}$`, "i");
  if (location) filter.location = new RegExp(location, "i");
  if (search) filter.title = new RegExp(search, "i");
  if (dateFrom || dateTo) {
    filter.date = {};
    if (dateFrom) filter.date.$gte = new Date(dateFrom);
    if (dateTo) filter.date.$lte = new Date(dateTo);
  }
  return filter;
};

/** Traduce sort=date / sort=-date / sort=price, etc. a la sintaxis de Mongoose. */
const buildSort = (sort) => {
  if (!sort) return { date: 1 };
  const direction = sort.startsWith("-") ? -1 : 1;
  const field = sort.replace(/^-/, "");
  const allowed = ["date", "price", "capacity", "createdAt"];
  return allowed.includes(field) ? { [field]: direction } : { date: 1 };
};

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

  findPublishedEvents(query = {}, { limit, skip } = {}) {
    const filter = buildFilter({ ...query, status: "published" });
    return this.dao.find(filter, { limit, skip, sort: buildSort(query.sort), populate: ORGANIZER_POPULATE });
  }

  countPublishedEvents(query = {}) {
    const filter = buildFilter({ ...query, status: "published" });
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
}

export const eventRepository = new EventRepository();
