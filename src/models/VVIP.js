import mongoose from "mongoose";

const VVIPSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    video: {
      s3Key: { type: String, required: true },
      s3Url: { type: String, required: true },
      subtitle: {
        s3Key: { type: String },
        s3Url: { type: String },
      },
    },
    play: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.models.VVIP || mongoose.model("VVIP", VVIPSchema);
