import mongoose from "mongoose";

const SpeakerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  title: String,
  company: String,
  role: {
    type: String,
    enum: ["speaker", "moderator", "presenter"],
    default: "speaker",
  },
  photoUrl: String,
});

const AgendaItemSchema = new mongoose.Schema({
  startTime: { type: String, required: true }, // e.g. "08:30"
  endTime: { type: String, required: true }, // e.g. "09:30"
  title: { type: String, required: true },
  description: String,
  speakers: [SpeakerSchema],
  type: {
    type: String,
    enum: ["session", "panel", "break", "networking", "tour"],
    default: "session",
  },
  media: { videoUrl: String, pdfUrl: String },
  isActive: { type: Boolean, default: false },
});

const AgendaSchema = new mongoose.Schema(
  {
    items: [AgendaItemSchema],
    autoDetectActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Agenda || mongoose.model("Agenda", AgendaSchema);
