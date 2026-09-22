import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    reservationCode: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true, index: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "events", required: true, index: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    price: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "confirmed", index: true },
    cancelledAt: { type: Date, default: null }
  },
  { timestamps: true }
);

ticketSchema.index({ user: 1, event: 1, status: 1 });

export const TicketModel = mongoose.model("tickets", ticketSchema);
