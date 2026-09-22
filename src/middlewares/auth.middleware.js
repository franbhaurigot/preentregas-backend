import passport from "passport";
import { errors } from "../utils/errors.js";

/** Autenticacion obligatoria: sin token valido -> 401 "No autenticado". */
export const authenticate = (req, res, next) =>
  passport.authenticate("current", { session: false }, (err, user) => {
    if (err) return next(err);
    if (!user) return next(errors.unauthorized("No autenticado"));
    req.user = user;
    return next();
  })(req, res, next);

/** Autenticacion opcional: si hay token lo usa, si no continua como anonimo. */
export const optionalAuthenticate = (req, res, next) =>
  passport.authenticate("current", { session: false }, (err, user) => {
    if (err) return next(err);
    req.user = user || null;
    return next();
  })(req, res, next);
