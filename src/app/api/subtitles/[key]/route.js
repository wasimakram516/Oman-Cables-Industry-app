import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function GET(_, { params }) {
  try {
    const key = decodeURIComponent(params.key);
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: `subtitles/${key}`,
    });
    const data = await s3.send(command);
    const body = await data.Body.transformToByteArray();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("Subtitle proxy error:", err);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
