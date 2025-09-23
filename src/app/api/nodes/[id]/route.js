import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Node from "@/models/Node";
import { uploadToS3, deleteFromS3, getFolderByMime } from "@/utils/s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function GET(_, context) {
  await dbConnect();
  const { id } = await context.params;
  const node = await Node.findById(id).populate("children");
  if (!node) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(node);
}

export async function PUT(req, context) {
  try {
    await dbConnect();
    const { id } = await context.params;
    const node = await Node.findById(id);
    if (!node)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const updates = {};

    if (body.title) updates.title = body.title;
    if (body.order !== undefined) updates.order = body.order;
    if (body.x !== undefined) updates.x = body.x;
    if (body.y !== undefined) updates.y = body.y;

    if (body.video) {
      await deleteFromS3(node.video?.s3Key);
      updates.video = body.video;
    }

    if (body.action) {
      await deleteFromS3(node.action?.s3Key);
      updates.action = body.action;
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

// 📌 DELETE node (and its media)
export async function DELETE(_, context) {
  try {
    await dbConnect();

    const { id } = await context.params;

    const node = await Node.findById(id);
    if (!node) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // delete video + action media
    await deleteFromS3(node.video?.s3Key);
    await deleteFromS3(node.action?.s3Key);

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
