import { userRepository } from "../repositories/index.js";
import { UserDTO } from "../dto/index.js";
import { parsePagination } from "../utils/validate.js";

/**
 * Servicio minimo para operaciones administrativas sobre usuarios.
 * Usado exclusivamente por la ruta admin-only GET /api/users.
 */
export class UserService {
  constructor(repository = userRepository) {
    this.users = repository;
  }

  async listAll(query = {}) {
    const { limit, page, skip } = parsePagination(query);
    const [users, total] = await Promise.all([
      this.users.findAll({ limit, skip }),
      this.users.countAll()
    ]);
    return {
      data: UserDTO.list(users),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    };
  }
}

export const userService = new UserService();
