import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true, index: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "events", required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["active", "cancelled"], default: "active", index: true },
    purchase_datetime: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

ticketSchema.index({ user: 1, event: 1, status: 1 });

export const TicketModel = mongoose.model("tickets", ticketSchema);
