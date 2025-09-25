import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Node from "@/models/Node";
import { deleteFromS3 } from "@/utils/s3";

// 📌 GET node by id
export async function GET(_, context) {
  await dbConnect();
  const { id } = await context.params;
  const node = await Node.findById(id).populate("children");
  if (!node) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(node);
}

// 📌 UPDATE node
export async function PUT(req, context) {
  try {
    await dbConnect();
    const { id } = await context.params;
    const node = await Node.findById(id);
    if (!node)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();

    // Build update object dynamically
    const updates = {};

    if (body.title !== undefined) updates.title = body.title;
    if (body.order !== undefined) updates.order = body.order;
    if (body.x !== undefined) updates.x = body.x;
    if (body.y !== undefined) updates.y = body.y;

    // 🎥 Video: replace only if new video provided
    if (body.video) {
      if (node.video?.s3Key && node.video?.s3Key !== body.video.s3Key) {
        await deleteFromS3(node.video.s3Key);
      }
      updates.video = body.video;
    }

    // 🎬 Action
    if (body.action) {
      updates.action = { ...node.action?.toObject(), ...body.action };

      // Handle popup separately so it merges
      if (body.action.popup) {
        updates.action.popup = {
          ...node.action?.popup?.toObject(),
          ...body.action.popup,
        };
      }

      // If replacing non-slideshow media (pdf/image), clean old file
      if (
        body.action.type &&
        body.action.type !== "slideshow" &&
        node.action?.s3Key &&
        node.action.s3Key !== body.action.s3Key
      ) {
        await deleteFromS3(node.action.s3Key);
      }

    }

    const updatedNode = await Node.findByIdAndUpdate(id, updates, {
      new: true,
    });

    return NextResponse.json(updatedNode);
  } catch (err) {
    console.error("❌ Update error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 📌 DELETE node
export async function DELETE(_, context) {
  try {
    await dbConnect();
    const { id } = await context.params;

    const node = await Node.findById(id);
    if (!node) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await deleteFromS3(node.video?.s3Key);

    if (node.action?.type === "slideshow") {
      for (const img of node.action.images || []) {
        await deleteFromS3(img.s3Key);
      }
    } else {
      await deleteFromS3(node.action?.s3Key);
    }

    await Node.findByIdAndDelete(id);

    if (node.parent) {
      await Node.findByIdAndUpdate(node.parent, {
        $pull: { children: node._id },
      });
    }

    return NextResponse.json({ message: "Node and media deleted" });
  } catch (err) {
    console.error("❌ Delete error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 📌 DELETE a specific slideshow image
export async function PATCH(req, context) {
  try {
    await dbConnect();
    const { id } = await context.params;
    const { imageId } = await req.json(); // pass _id of the image to remove

    const node = await Node.findById(id);
    if (!node || node.action?.type !== "slideshow") {
      return NextResponse.json({ error: "Not a slideshow node" }, { status: 400 });
    }

    const img = node.action.images.id(imageId);
    if (!img) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // delete from S3 and pull from array
    await deleteFromS3(img.s3Key);
    img.remove();

    await node.save();
    return NextResponse.json(node);
  } catch (err) {
    console.error("❌ Slideshow image delete error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
