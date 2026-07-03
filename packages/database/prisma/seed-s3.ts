import {
  CreateBucketCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { BucketLocationConstraint } from '@aws-sdk/client-s3';

import type { SeedImageDef } from './seed-images';
import { SEED_IMAGES } from './seed-images';

type SeedS3Config = {
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  propertiesBucket: string;
  avatarsBucket: string;
};

function readSeedS3Config(): SeedS3Config | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const propertiesBucket = process.env.AWS_S3_PROPERTIES_BUCKET;
  const avatarsBucket = process.env.AWS_S3_AVATARS_BUCKET;
  if (!accessKeyId || !secretAccessKey || !propertiesBucket || !avatarsBucket) {
    return null;
  }
  return {
    region: process.env.AWS_REGION ?? 'eu-central-1',
    endpoint: process.env.AWS_ENDPOINT_URL,
    accessKeyId,
    secretAccessKey,
    propertiesBucket,
    avatarsBucket,
  };
}

function resolveBucket(key: string, config: SeedS3Config): string {
  if (key.startsWith('properties/')) return config.propertiesBucket;
  if (key.startsWith('avatars/') || key.startsWith('logos/')) return config.avatarsBucket;
  return config.propertiesBucket;
}

function createSeedS3Client(config: SeedS3Config): S3Client {
  return new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: config.endpoint,
    forcePathStyle: Boolean(config.endpoint),
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
}

async function ensureBucket(s3: S3Client, bucket: string, region: string): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    return;
  } catch {
    if (region === 'us-east-1') {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
      return;
    }
    await s3.send(
      new CreateBucketCommand({
        Bucket: bucket,
        CreateBucketConfiguration: { LocationConstraint: region as BucketLocationConstraint },
      }),
    );
  }
}

async function objectExists(s3: S3Client, bucket: string, key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadSeedImage(
  s3: S3Client,
  config: SeedS3Config,
  image: SeedImageDef,
): Promise<void> {
  const bucket = resolveBucket(image.key, config);
  if (await objectExists(s3, bucket, image.key)) {
    return;
  }
  const response = await fetch(image.sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to download seed image '${image.key}': HTTP ${response.status}`);
  }
  const body = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') ?? 'image/jpeg';
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: image.key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function uploadSeedImages(images: SeedImageDef[] = SEED_IMAGES): Promise<void> {
  const config = readSeedS3Config();
  if (!config) {
    console.warn('[seed] S3 is not configured — skipping seed image uploads.');
    return;
  }
  const s3 = createSeedS3Client(config);
  await ensureBucket(s3, config.propertiesBucket, config.region);
  await ensureBucket(s3, config.avatarsBucket, config.region);
  console.log(`[seed] Uploading ${images.length} images to S3…`);
  let uploaded = 0;
  for (const image of images) {
    const bucket = resolveBucket(image.key, config);
    const existed = await objectExists(s3, bucket, image.key);
    await uploadSeedImage(s3, config, image);
    if (!existed) {
      uploaded += 1;
    }
  }
  console.log(
    `[seed] S3 seed images ready (${uploaded} uploaded, ${images.length - uploaded} already present).`,
  );
}
