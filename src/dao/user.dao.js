import { UserModel } from "../models/user.model.js";

/**
 * Capa DAO: unica capa que conoce Mongoose para la entidad User.
 * Metodos genericos de acceso a datos, sin reglas de negocio.
 */
export class UserDAO {
  create(data) {
    return UserModel.create(data).then((doc) => doc.toObject());
  }

  findById(id) {
    return UserModel.findById(id).lean();
  }

  findOne(filter = {}) {
    return UserModel.findOne(filter).lean();
  }

  find(filter = {}, { limit = 50, skip = 0, sort = { createdAt: -1 } } = {}) {
    return UserModel.find(filter).sort(sort).skip(skip).limit(limit).lean();
  }

  updateById(id, update) {
    return UserModel.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
  }

  deleteById(id) {
    return UserModel.findByIdAndDelete(id).lean();
  }

  count(filter = {}) {
    return UserModel.countDocuments(filter);
  }
}

export const userDAO = new UserDAO();
