import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Home from "@/models/Home";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { deleteFromS3 } from "@/utils/s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// 📌 GET home video + subtitle
export async function GET() {
  try {
    await dbConnect();
    const home = await Home.findOne();
    return NextResponse.json({
      ok: true,
      video: home?.video || null,
      subtitle: home?.subtitle || null,
    });
  } catch (err) {
    console.error("❌ Home GET error:", err);
    return NextResponse.json(
      { ok: false, error: err.message, video: null, subtitle: null },
      { status: 500 }
    );
  }
}

// 📌 POST → presign OR save record
export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();

    // Case A: presign request
    if (body.presign) {
      const { fileName, fileType } = body;

      // folder name based on type (videos / subtitles)
      const isSubtitle = fileType.includes("vtt") || fileType.includes("srt");
      const folder = isSubtitle ? "subtitles" : "videos";
      const key = `${folder}/${Date.now()}-${fileName}`;

      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        ContentType: fileType,
      });

      const uploadURL = await getSignedUrl(s3, command, { expiresIn: 60 });

      return NextResponse.json({
        ok: true,
        uploadURL,
        key,
        fileUrl: `${process.env.CLOUDFRONT_URL}/${key}`,
      });
    }

    // Case B: client notifies after upload
    const { video, subtitle } = body;
    if (!video) {
      return NextResponse.json(
        { ok: false, error: "No video data provided" },
        { status: 400 }
      );
    }

    let home = await Home.findOne();

    // Delete old video/subtitle if exist
    if (home?.video?.s3Key && home.video.s3Key !== video.s3Key) {
      await deleteFromS3(home.video.s3Key);
    }
    if (home?.subtitle?.s3Key && subtitle && home.subtitle.s3Key !== subtitle.s3Key) {
      await deleteFromS3(home.subtitle.s3Key);
    }

    // Create or update
    if (!home) {
      home = await Home.create({ video, subtitle });
    } else {
      home.video = video;
      if (subtitle) home.subtitle = subtitle;
      await home.save();
    }

    return NextResponse.json({
      ok: true,
      video: home.video,
      subtitle: home.subtitle || null,
    });
  } catch (err) {
    console.error("❌ Home video POST error:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}

// 📌 DELETE video + subtitle
export async function DELETE() {
  try {
    await dbConnect();
    const home = await Home.findOne();

    if (!home) {
      return NextResponse.json({
        ok: true,
        message: "No home video found",
      });
    }

    // Delete from S3 if exist
    if (home.video?.s3Key) await deleteFromS3(home.video.s3Key);
    if (home.subtitle?.s3Key) await deleteFromS3(home.subtitle.s3Key);

    await Home.deleteMany({});

    return NextResponse.json({
      ok: true,
      message: "Home video and subtitle deleted",
    });
  } catch (err) {
    console.error("❌ Home video DELETE error:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
