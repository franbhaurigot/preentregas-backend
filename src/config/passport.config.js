import passport from "passport";
import { Strategy as JwtStrategy } from "passport-jwt";
import { config } from "./config.js";
import { userRepository } from "../repositories/index.js";

/** Lee el JWT desde la cookie httpOnly y, como alternativa, desde el header Authorization. */
const cookieExtractor = (req) => {
  if (req?.cookies?.[config.jwt.cookieName]) return req.cookies[config.jwt.cookieName];
  const header = req?.headers?.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
};

export const initializePassport = () => {
  passport.use(
    "jwt",
    new JwtStrategy(
      { jwtFromRequest: cookieExtractor, secretOrKey: config.jwt.secret },
      async (payload, done) => {
        try {
          const user = await userRepository.findById(payload.sub);
          if (!user) return done(null, false, { message: "Sesion invalida o usuario inexistente" });
          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );
};
