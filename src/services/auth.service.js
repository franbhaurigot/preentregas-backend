import { userRepository } from "../repositories/index.js";
import { UserDTO } from "../dto/index.js";
import { hashPassword, comparePassword } from "../utils/hash.js";
import { errors } from "../utils/errors.js";
import { requireFields, isValidEmail } from "../utils/validate.js";

/**
 * Logica de negocio de autenticacion. No conoce Express ni Passport:
 * las estrategias de src/config/passport.config.js son solo un punto
 * de entrada que llama a estos metodos y despues arma la respuesta.
 */
export class AuthService {
  constructor(repository = userRepository) {
    this.users = repository;
  }

  /**
   * Validacion, normalizacion, hash, unicidad y alta en base.
   * El rol SIEMPRE es "user": el registro publico nunca permite
   * elegir un rol distinto, ni siquiera si viene en el body.
   */
  async registerCore({ first_name, last_name, email, age, password }) {
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

    if (await this.users.existsByEmail(email)) {
      throw errors.conflict("Ya existe un usuario registrado con ese email");
    }

    const created = await this.users.createUser({
      first_name,
      last_name,
      email,
      age: age !== undefined ? Number(age) : undefined,
      password: await hashPassword(password),
      role: "user"
    });

    return UserDTO.current(created);
  }

  /**
   * Compara credenciales. Devuelve el usuario (documento crudo, con hash)
   * si son validas, o null si no. Nunca distingue "no existe el email"
   * de "contrasena incorrecta": ambos casos devuelven null.
   */
  async validateCredentials(email, password) {
    if (!email || !password) return null;
    const user = await this.users.findByEmail(email);
    if (!user) return null;
    const matches = await comparePassword(password, user.password);
    if (!matches) return null;
    return user;
  }

  async getById(userId) {
    const user = await this.users.findById(userId);
    if (!user) throw errors.notFound("Usuario no encontrado");
    return user;
  }
}

export const authService = new AuthService();
