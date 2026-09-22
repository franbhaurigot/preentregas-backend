import jwt from "jsonwebtoken";
import { config } from "../config/config.js";

/**
 * Unico lugar donde se firma y verifica el JWT de sesion.
 * Payload minimo pedido por la consigna: { id, email, role }.
 */
export const signToken = ({ id, email, role }) =>
  jwt.sign({ id, email, role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

export const verifyToken = (token) => jwt.verify(token, config.jwt.secret);
