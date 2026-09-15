import jwt from "jsonwebtoken";
import { userRepository } from "../repositories/index.js";
import { UserDTO } from "../dto/index.js";
import { hashPassword, comparePassword } from "../utils/hash.js";
import { errors } from "../utils/errors.js";
import { requireFields, isValidEmail } from "../utils/validate.js";
import { config } from "../config/config.js";

/**
 * Logica de negocio de autenticacion.
 * Habla solo con repositories y devuelve siempre DTOs.
 */
export class AuthService {
  constructor(repository = userRepository) {
    this.users = repository;
  }

  #buildToken(user) {
    return jwt.sign({ sub: String(user._id), role: user.role }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });
  }

  async register({ first_name, last_name, email, age, password, role }) {
    requireFields({ first_name, last_name, email, password }, [
      "first_name",
      "last_name",
      "email",
      "password"
    ]);

    if (!isValidEmail(email)) throw errors.badRequest("El email no tiene un formato valido");
    if (String(password).length < 6) {
      throw errors.badRequest("La contrasena debe tener al menos 6 caracteres");
    }
    if (age !== undefined && age !== null && (Number.isNaN(Number(age)) || Number(age) < 0)) {
      throw errors.badRequest("La edad debe ser un numero valido");
    }
    if (role && !["user", "organizer"].includes(role)) {
      throw errors.badRequest("El rol solicitado no es valido");
    }

    if (await this.users.existsByEmail(email)) {
      throw errors.conflict("Ya existe un usuario registrado con ese email");
    }

    const created = await this.users.createUser({
      first_name,
      last_name,
      email,
      age: age !== undefined ? Number(age) : undefined,
      password: await hashPassword(password),
      role: role ?? "user"
    });

    return { user: UserDTO.current(created), token: this.#buildToken(created) };
  }

  async login({ email, password }) {
    requireFields({ email, password }, ["email", "password"]);

    const user = await this.users.findByEmail(email);
    // Mismo mensaje para email inexistente o password incorrecta: no filtramos informacion.
    if (!user) throw errors.unauthorized("Email o contrasena incorrectos");

    const matches = await comparePassword(password, user.password);
    if (!matches) throw errors.unauthorized("Email o contrasena incorrectos");

    return { user: UserDTO.current(user), token: this.#buildToken(user) };
  }

  async getCurrent(userId) {
    const user = await this.users.findById(userId);
    if (!user) throw errors.notFound("Usuario no encontrado");
    return UserDTO.current(user);
  }
}

export const authService = new AuthService();
