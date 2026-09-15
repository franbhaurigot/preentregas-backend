import mongoose from "mongoose";
import { config } from "./config.js";
import { logger } from "../utils/logger.js";

export const connectDB = async () => {
  mongoose.set("strictQuery", true);
  await mongoose.connect(config.mongoUri);
  logger.info("MongoDB conectado");
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
  logger.info("MongoDB desconectado");
};
