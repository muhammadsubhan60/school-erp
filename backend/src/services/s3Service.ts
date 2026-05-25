import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const s3 = env.s3Enabled
  ? new S3Client({
      region: env.awsRegion,
      credentials: {
        accessKeyId: env.awsAccessKeyId,
        secretAccessKey: env.awsSecretAccessKey,
      },
    })
  : null;

export function buildKey(folder: string, filename: string): string {
  const ext = path.extname(filename);
  return `${folder}/${uuidv4()}${ext}`;
}

/** Returns a pre-signed URL for direct browser-to-S3 upload. Falls back to null if S3 not configured. */
export async function getUploadUrl(
  folder: string,
  filename: string,
  contentType: string
): Promise<{ uploadUrl: string; key: string } | null> {
  if (!s3) return null;

  const key = buildKey(folder, filename);
  const command = new PutObjectCommand({
    Bucket: env.awsS3Bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  return { uploadUrl, key };
}

export function getPublicUrl(key: string): string {
  return `https://${env.awsS3Bucket}.s3.${env.awsRegion}.amazonaws.com/${key}`;
}

export async function getDownloadUrl(key: string, expiresIn = 3600): Promise<string | null> {
  if (!s3) return null;
  const command = new GetObjectCommand({ Bucket: env.awsS3Bucket, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

export async function deleteFile(key: string): Promise<void> {
  if (!s3) return;
  await s3.send(new DeleteObjectCommand({ Bucket: env.awsS3Bucket, Key: key }));
}
