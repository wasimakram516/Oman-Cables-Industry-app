import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Decide folder based on MIME type
export function getFolderByMime(mime) {
  if (mime.startsWith("video/")) return "videos";
  if (mime.startsWith("image/")) return "images";
  if (mime === "application/pdf") return "pdfs";
  return "others";
}

// Upload file
export async function uploadToS3(file, folder) {
  const key = `${folder}/${Date.now()}-${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    })
  );

  return {
    s3Key: key,
    s3Url: `${process.env.CLOUDFRONT_URL}/${key}`,
  };
}

// Delete file
export async function deleteFromS3(key) {
  if (!key) return;
  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
      })
    );
    console.log("🗑️ Deleted from S3:", key);
  } catch (err) {
    console.error("❌ Error deleting from S3:", key, err.message);
  }
}
