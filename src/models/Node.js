import mongoose from "mongoose";

const actionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["pdf", "image", "video", "iframe", "slideshow"],
    required: function () {
      return !!this.parent; // only required if this node has a parent
    },
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

  // Optional popup overlay
  popup: {
    s3Key: { type: String },
    s3Url: { type: String },
    x: { type: Number, default: 50 }, // percentage position X
    y: { type: Number, default: 50 }, // percentage position Y
  },

  // Container sizing for frontend
  width: { type: Number, default: 85 },  // (% of viewport width)
  height: { type: Number, default: 95 }, // (% of viewport height)
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
          return !!this.parent;
        },
      },
      s3Url: {
        type: String,
        required: function () {
          return !!this.parent;
        },
      },
      duration: { type: Number },

      subtitle: {
        s3Key: { type: String },
        s3Url: { type: String },
      },
    },

    children: [{ type: mongoose.Schema.Types.ObjectId, ref: "Node" }],

    // Action is optional for parent, required for child
    action: {
      type: actionSchema,
      required: function () {
        return !!this.parent;
      },
    },

    x: { type: Number, default: 50 },
    y: { type: Number, default: 50 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Node || mongoose.model("Node", nodeSchema);
