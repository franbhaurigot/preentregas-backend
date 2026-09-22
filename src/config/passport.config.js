import passport from "passport";
import { Strategy as JwtStrategy } from "passport-jwt";
import { Strategy as LocalStrategy } from "passport-local";
import { config } from "./config.js";
import { userRepository } from "../repositories/index.js";
import { authService } from "../services/auth.service.js";

/**
 * Estrategias centralizadas de Passport. Nada de esta logica vive en
 * app.js ni en las rutas: app.js solo llama a initializePassport() y
 * hace passport.initialize().
 *
 * - "register": valida y crea el usuario (delega en AuthService).
 * - "login": valida credenciales (delega en AuthService).
 * - "current": lee y verifica el JWT desde la cookie httpOnly.
 *
 * Dejar las estrategias en este archivo, cada una independiente, es lo
 * que permite sumar mas adelante providers externos (Google, GitHub, etc.)
 * sin tocar app.js: alcanza con agregar un passport.use(new GoogleStrategy(...))
 * aca y una ruta nueva que la use.
 */

/** Lee el JWT desde la cookie httpOnly y, como alternativa, desde el header Authorization. */
const cookieExtractor = (req) => {
  if (req?.cookies?.[config.jwt.cookieName]) return req.cookies[config.jwt.cookieName];
  const header = req?.headers?.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
};

export const initializePassport = () => {
  // Estrategia de registro: el controller solo llama a passport.authenticate("register", ...)
  passport.use(
    "register",
    new LocalStrategy(
      { usernameField: "email", passwordField: "password", passReqToCallback: true },
      async (req, _email, _password, done) => {
        try {
          const user = await authService.registerCore(req.body);
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Estrategia de login: solo valida credenciales; el JWT lo genera el controller.
  passport.use(
    "login",
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const user = await authService.validateCredentials(email, password);
          if (!user) return done(null, false, { message: "Credenciales invalidas" });
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Estrategia "current": verifica el JWT de la cookie y deja el usuario en req.user.
  passport.use(
    "current",
    new JwtStrategy(
      { jwtFromRequest: cookieExtractor, secretOrKey: config.jwt.secret },
      async (payload, done) => {
        try {
          const user = await userRepository.findById(payload.id);
          if (!user) return done(null, false, { message: "Sesion invalida o usuario inexistente" });
          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );
};
