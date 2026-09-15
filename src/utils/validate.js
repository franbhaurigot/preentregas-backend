import { errors } from "./errors.js";

export const requireFields = (source = {}, fields = []) => {
  const missing = fields.filter((f) => {
    const value = source[f];
    return value === undefined || value === null || value === "";
  });
  if (missing.length) {
    throw errors.badRequest("Faltan campos obligatorios", { missing });
  }
};

export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email));

export const toPositiveInt = (value, field) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw errors.badRequest(`El campo "${field}" debe ser un entero positivo`);
  }
  return parsed;
};

export const toFutureDate = (value, field) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw errors.badRequest(`El campo "${field}" no es una fecha valida`);
  }
  if (parsed.getTime() <= Date.now()) {
    throw errors.badRequest(`El campo "${field}" debe ser una fecha futura`);
  }
  return parsed;
};

/** Valida el formato de un id de Mongo sin importar Mongoose fuera del DAO. */
export const assertValidId = (id, resource = "recurso") => {
  if (!/^[0-9a-fA-F]{24}$/.test(String(id ?? ""))) {
    throw errors.badRequest(`El id de ${resource} no tiene un formato valido`);
  }
  return String(id);
};

export const parsePagination = ({ limit, page } = {}) => {
  const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const parsedPage = Math.max(Number(page) || 1, 1);
  return { limit: parsedLimit, page: parsedPage, skip: (parsedPage - 1) * parsedLimit };
};
