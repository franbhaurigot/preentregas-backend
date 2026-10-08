import { Router } from "express";
import passport from "passport";
import { register, login, current, logout } from "../controllers/sessions.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { errors } from "../utils/errors.js";

const router = Router();

// El registro delega toda la validacion/creacion en la estrategia "register".
// Si la estrategia llama a done(err), Passport propaga automaticamente a next(err).
router.post("/register", (req, res, next) =>
  passport.authenticate("register", { session: false }, (err, user) => {
    if (err) return next(err);
    // passport-local descarta el request sin llamar a la estrategia si faltan email o password.
    if (!user) return next(errors.badRequest("Faltan campos obligatorios"));
    req.user = user;
    return next();
  })(req, res, next)
, register);

// El login necesita un callback custom para responder "Credenciales inválidas"
// con nuestro formato de error, en vez del 401 generico que da Passport por defecto.
router.post("/login", (req, res, next) => {
  if (!req.body?.email || !req.body?.password) {
    return next(errors.badRequest("Faltan campos obligatorios"));
  }
  return next();
}, (req, res, next) =>
  passport.authenticate("login", { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) return next(errors.unauthorized(info?.message || "Credenciales inválidas"));
    req.user = user;
    return next();
  })(req, res, next)
, login);

router.get("/current", authenticate, current);

// Logout no requiere pasar por Passport: solo limpia la cookie.
router.post("/logout", logout);

export default router;
