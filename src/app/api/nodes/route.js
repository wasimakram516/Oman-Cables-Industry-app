import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Node from "@/models/Node";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Folder detection
function getFolderByMime(mime) {
  if (mime.startsWith("video/")) return "videos";
  if (mime.startsWith("image/")) return "images";
  if (mime === "application/pdf") return "pdfs";
  return "others";
}

// 📌 GET all root nodes
export async function GET() {
  await dbConnect();
  const nodes = await Node.find({ parent: null }).populate("children");
  return NextResponse.json(nodes);
}

// 📌 CREATE new node
export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();

    // Case A: request presigned URL
    if (body.presign) {
      const { fileName, fileType, folder } = body;
      const key = `${folder}/${Date.now()}-${fileName}`;
      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        ContentType: fileType,
      });
      const uploadURL = await getSignedUrl(s3, command, { expiresIn: 60 });

      return NextResponse.json({
        uploadURL,
        key,
        fileUrl: `${process.env.CLOUDFRONT_URL}/${key}`,
      });
    }

    // Case B: create node
    const { title, parent, order, video, action, x, y } = body;

    if (parent && !video?.s3Url) {
      return NextResponse.json(
        { error: "Video is required for child nodes" },
        { status: 400 }
      );
    }

    const node = new Node({
      title,
      order: order || 0,
      parent: parent || null,
      video: video || null,
      action: action || null,
      x: x ?? 0,
      y: y ?? 0,
    });

    await node.save();

    if (parent) {
      await Node.findByIdAndUpdate(parent, { $push: { children: node._id } });
    }

    return NextResponse.json(node, { status: 201 });
  } catch (err) {
    console.error("❌ Node create error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
