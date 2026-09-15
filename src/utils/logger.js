import { config } from "../config/config.js";

const write = (level, ...args) => {
  if (config.env === "test") return;
  process.stdout.write(`[${new Date().toISOString()}] [${level}] ${args.map(String).join(" ")}\n`);
};

export const logger = {
  info: (...args) => write("INFO", ...args),
  warn: (...args) => write("WARN", ...args),
  error: (...args) => process.stderr.write(`[${new Date().toISOString()}] [ERROR] ${args.map(String).join(" ")}\n`)
};
