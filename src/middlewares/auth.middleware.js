import passport from "passport";
import { errors } from "../utils/errors.js";

/** Autenticacion obligatoria: sin token valido -> 401. */
export const authenticate = (req, res, next) =>
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) return next(errors.unauthorized(info?.message || "Necesitas iniciar sesion"));
    req.user = user;
    return next();
  })(req, res, next);

/** Autenticacion opcional: si hay token lo usa, si no continua como anonimo. */
export const optionalAuthenticate = (req, res, next) =>
  passport.authenticate("jwt", { session: false }, (err, user) => {
    if (err) return next(err);
    req.user = user || null;
    return next();
  })(req, res, next);

/** Autorizacion por rol: autenticado pero sin permisos -> 403. */
export const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(errors.unauthorized("Necesitas iniciar sesion"));
    if (roles.length && !roles.includes(req.user.role)) {
      return next(errors.forbidden("Tu rol no tiene permisos para realizar esta accion"));
    }
    return next();
  };
