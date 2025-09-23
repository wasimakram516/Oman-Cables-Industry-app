import mongoose from "mongoose";

const HomeSchema = new mongoose.Schema(
  {
    video: {
      s3Key: { type: String },
      s3Url: { type: String },
    },
  },
  { timestamps: true }
);

export default mongoose.models.Home || mongoose.model("Home", HomeSchema);
