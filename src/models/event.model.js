import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    date: { type: Date, required: true },
    location: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    price: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["draft", "published", "cancelled", "finished"],
      default: "draft",
      index: true
    },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true, index: true }
  },
  { timestamps: true }
);

export const EventModel = mongoose.model("events", eventSchema);
