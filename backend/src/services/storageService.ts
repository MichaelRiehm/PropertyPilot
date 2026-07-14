import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const SIGNED_URL_TTL_SECONDS = 15 * 60;

export interface StorageConfig {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

/**
 * Thin wrapper around the AWS S3 SDK, targeting Cloudflare R2. R2's S3 API is
 * fully compatible for these three operations, so the same code works with any
 * S3-compatible provider (real AWS, Backblaze B2, MinIO) by only changing the
 * endpoint and credentials in env.
 */
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  public constructor(config: StorageConfig) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // R2 uses path-style addressing.
      forcePathStyle: true,
    });
    this.bucket = config.bucket;
  }

  public async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  public async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  public getSignedViewUrl(key: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
      { expiresIn: SIGNED_URL_TTL_SECONDS },
    );
  }
}

export function storageConfigFromEnv(): StorageConfig | null {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }
  return { endpoint, accessKeyId, secretAccessKey, bucket };
}
