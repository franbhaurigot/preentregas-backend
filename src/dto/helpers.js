/** true si el valor es un ObjectId (no un documento populado). */
const isObjectId = (value) =>
  Boolean(value && typeof value === "object" && value._bsontype === "ObjectId");

/** Devuelve el id como string, venga como ObjectId, string o documento populado. */
export const toId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (isObjectId(value)) return value.toString();
  if (value._id) return String(value._id);
  return String(value);
};

/** true si el campo fue populado (es un documento) y no un simple ObjectId. */
export const isPopulated = (value) =>
  Boolean(value && typeof value === "object" && !isObjectId(value) && value._id !== undefined);
