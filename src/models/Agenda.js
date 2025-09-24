import mongoose from "mongoose";

const AgendaItemSchema = new mongoose.Schema({
  startTime: { type: String, required: true }, // "08:30"
  endTime: { type: String, required: true },   // "09:00"
  name: { type: String, required: true },      // speaker name
  title: String,                               // speaker title/position
  company: String,
  role: {
    type: String,
    enum: ["speaker", "moderator", "presenter"],
    default: "speaker",
  },
  photoUrl: String,       // profile/avatar image
  infoImageUrl: String,   // field for speaker info image
  isActive: { type: Boolean, default: false },
});

const AgendaSchema = new mongoose.Schema(
  {
    items: [AgendaItemSchema],
  },
  { timestamps: true }
);

export default mongoose.models.Agenda ||
  mongoose.model("Agenda", AgendaSchema);
