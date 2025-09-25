import mongoose from "mongoose";

const actionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["pdf", "image", "iframe", "slideshow"], 
    required: true,
  },
  title: { type: String },

  // For single media (pdf, image, iframe)
  s3Key: { type: String },
  s3Url: { type: String },
  externalUrl: { type: String },

  // For slideshow (multiple images)
  images: [
    {
      s3Key: { type: String },
      s3Url: { type: String },
    },
  ],

  // Container sizing for frontend
  width: { type: Number, default: 85 },  // (%, vh, px)
  height: { type: Number, default: 95 }, // (%, vh, px)
});

const nodeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    order: { type: Number, default: 0 },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Node",
      default: null,
      set: (v) => (v === "" ? null : v),
    },

    video: {
      s3Key: {
        type: String,
        required: function () {
          return !!this.parent; // only required if this node has a parent
        },
      },
      s3Url: {
        type: String,
        required: function () {
          return !!this.parent;
        },
      },
      duration: { type: Number },
    },

    children: [{ type: mongoose.Schema.Types.ObjectId, ref: "Node" }],
    action: actionSchema,

    x: { type: Number, default: 50 }, // X position on screen
    y: { type: Number, default: 50 }, // Y position on screen

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Node || mongoose.model("Node", nodeSchema);
