import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Home from "@/models/Home";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { deleteFromS3, getFolderByMime } from "@/utils/s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// 📌 GET home video
export async function GET() {
  await dbConnect();
  const home = await Home.findOne();
  return NextResponse.json(home || {});
}

// 📌 UPLOAD/REPLACE home video via presigned
export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();

    // Case A: client asks for presign
    if (body.presign) {
      const { fileName, fileType } = body;
      const folder = "videos";
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

    // Case B: client notifies after upload
    const { video } = body;
    if (!video) {
      return NextResponse.json({ error: "No video data provided" }, { status: 400 });
    }

    let home = await Home.findOne();
    if (home?.video?.s3Key) {
      await deleteFromS3(home.video.s3Key);
    }

    if (!home) {
      home = await Home.create({ video });
    } else {
      home.video = video;
      await home.save();
    }

    return NextResponse.json(home);
  } catch (err) {
    console.error("❌ Home video error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 📌 DELETE home video
export async function DELETE() {
  try {
    await dbConnect();
    const home = await Home.findOne();

    if (!home) {
      return NextResponse.json({ message: "No home video exists" });
    }

    if (home.video?.s3Key) {
      await deleteFromS3(home.video.s3Key);
    }

    await Home.deleteMany({}); // wipe collection

    return NextResponse.json({ message: "Home video deleted" });
  } catch (err) {
    console.error("❌ Home video delete error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
