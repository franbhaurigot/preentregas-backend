import { Router } from "express";
import passport from "passport";
import { register, login, current, logout } from "../controllers/sessions.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { errors } from "../utils/errors.js";

const router = Router();

// El registro delega toda la validacion/creacion en la estrategia "register".
// Si la estrategia llama a done(err), Passport propaga automaticamente a next(err).
router.post("/register", passport.authenticate("register", { session: false }), register);

// El login necesita un callback custom para responder "Credenciales invalidas"
// con nuestro formato de error, en vez del 401 generico que da Passport por defecto.
router.post("/login", (req, res, next) =>
  passport.authenticate("login", { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) return next(errors.unauthorized(info?.message || "Credenciales invalidas"));
    req.user = user;
    return next();
  })(req, res, next)
, login);

router.get("/current", authenticate, current);

// Logout no requiere pasar por Passport: solo limpia la cookie.
router.post("/logout", logout);

export default router;
