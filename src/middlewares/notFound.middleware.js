import { errors } from "../utils/errors.js";

export const notFoundHandler = (req, _res, next) =>
  next(errors.notFound(`La ruta ${req.method} ${req.originalUrl} no existe`));
