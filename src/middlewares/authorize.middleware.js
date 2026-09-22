import { errors } from "../utils/errors.js";

/**
 * Middleware de autorizacion por rol, reutilizable y separado del de
 * autenticacion: recibe los roles permitidos y compara contra req.user.role.
 * Requiere que "authenticate" haya corrido antes (asume req.user ya seteado).
 */
export const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(errors.unauthorized("No autenticado"));
    if (roles.length && !roles.includes(req.user.role)) {
      return next(errors.forbidden("No tenes permisos para realizar esta accion"));
    }
    return next();
  };
