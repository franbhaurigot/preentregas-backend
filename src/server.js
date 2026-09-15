import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { config } from "./config/config.js";
import { logger } from "./utils/logger.js";

const start = async () => {
  try {
    await connectDB();
    createApp().listen(config.port, () =>
      logger.info(`Servidor escuchando en http://localhost:${config.port}`)
    );
  } catch (error) {
    logger.error("No se pudo iniciar el servidor:", error.message);
    process.exit(1);
  }
};

start();
