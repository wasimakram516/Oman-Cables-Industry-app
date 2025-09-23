import mongoose from "mongoose";

const actionSchema = new mongoose.Schema({
  type: { type: String, enum: ["pdf", "image", "iframe", "link"], required: true },
  title: { type: String },
  s3Key: { type: String },
  s3Url: { type: String },
  externalUrl: { type: String }
});

const nodeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    order: { type: Number, default: 0 },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Node", default: null },

    video: {
      s3Key: { type: String, required: true },
      s3Url: { type: String, required: true },
      duration: { type: Number }
    },

    children: [{ type: mongoose.Schema.Types.ObjectId, ref: "Node" }],
    action: actionSchema,

    x: { type: Number, default: 50 }, // X position on screen
    y: { type: Number, default: 50 }, // Y position on screen

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.models.Node || mongoose.model("Node", nodeSchema);
