/**
 * Backfill POI photos from Wikimedia Commons.
 *
 * For each published POI that has no photo yet, resolve one freely-licensed image
 * (Wikidata P18 first, then the Wikipedia page image), download it, upload it to
 * S3 under `pois/<id>/…`, and record a PoiPhoto in status PENDING_REVIEW with
 * attribution / license / source URL. A human approves it later in /admin/pois.
 *
 * Only CC-BY, CC-BY-SA, CC0 and public-domain images are accepted. It is
 * idempotent (skips POIs that already have any photo) and rate-limited.
 *
 *   pnpm --filter @repo/database backfill:poi-photos -- --dry-run
 *   pnpm --filter @repo/database backfill:poi-photos -- --city yerevan --limit 20
 */
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from 'dotenv';

import { PrismaClient } from '../src/generated/client';

config({ path: resolve(__dirname, '../../../.env') });
config({ path: resolve(__dirname, '../../../apps/api/.env') });
config({ path: resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const UA = 'RentStar-POI-Photo-Backfill/1.0 (https://rentstar.am; contact: privacy@rentstar.am)';
const RATE_LIMIT_MS = 1100;
const DOWNLOAD_TIMEOUT_MS = 20_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const LICENSE_ALLOW =
  /^(cc[-\s]?by([-\s]?sa)?([-\s]?\d(\.\d)?)?|cc[-\s]?0|cc0|public domain|pd([-\s]|$)|no restrictions)/i;
const CONTENT_TYPE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

interface Args {
  dryRun: boolean;
  city?: string;
  limit: number;
}

interface ResolvedImage {
  url: string;
  attribution: string;
  license: string;
  sourceUrl: string;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (name: string): string | undefined => {
    const eq = argv.find((a) => a.startsWith(`--${name}=`));
    if (eq) return eq.split('=')[1];
    const i = argv.indexOf(`--${name}`);
    if (i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--')) return argv[i + 1];
    return undefined;
  };
  return {
    dryRun: argv.includes('--dry-run'),
    city: get('city'),
    limit: Number(get('limit') ?? '100'),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function api<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return (await res.json()) as T;
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildAttribution(meta: Record<string, { value?: string } | undefined>): {
  attribution: string;
  license: string;
} | null {
  const licenseShort = stripHtml(meta.LicenseShortName?.value ?? meta.License?.value ?? '');
  if (!licenseShort || !LICENSE_ALLOW.test(licenseShort)) return null;
  const artist = stripHtml(meta.Artist?.value ?? '') || 'Unknown author';
  return {
    attribution: `${artist} — ${licenseShort}, via Wikimedia Commons`,
    license: licenseShort,
  };
}

async function imageFromCommonsFile(fileTitle: string): Promise<ResolvedImage | null> {
  const title = fileTitle.startsWith('File:') ? fileTitle : `File:${fileTitle}`;
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo` +
    `&iiprop=url|extmetadata|mime|size&iiurlwidth=1600&titles=${encodeURIComponent(title)}`;
  const data = await api<{
    query?: {
      pages?: Record<
        string,
        {
          imageinfo?: {
            url: string;
            thumburl?: string;
            mime?: string;
            extmetadata?: Record<string, { value?: string }>;
          }[];
        }
      >;
    };
  }>(url);
  const page = Object.values(data.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  if (info.mime && !CONTENT_TYPE_EXT[info.mime]) return null;
  const credit = buildAttribution(info.extmetadata ?? {});
  if (!credit) return null;
  return {
    url: info.thumburl ?? info.url,
    attribution: credit.attribution,
    license: credit.license,
    sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`,
  };
}

async function imageFromWikidata(wikidataId: string): Promise<ResolvedImage | null> {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&property=P18&entity=${wikidataId}`;
  const data = await api<{
    claims?: { P18?: { mainsnak?: { datavalue?: { value?: string } } }[] };
  }>(url);
  const file = data.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  if (!file) return null;
  return imageFromCommonsFile(file);
}

async function imageFromWikipedia(titleWithLang: string): Promise<ResolvedImage | null> {
  // titleWithLang is a plain English title from our catalog
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages` +
    `&piprop=name&titles=${encodeURIComponent(titleWithLang)}`;
  const data = await api<{
    query?: { pages?: Record<string, { pageimage?: string }> };
  }>(url);
  const page = Object.values(data.query?.pages ?? {})[0];
  if (!page?.pageimage) return null;
  return imageFromCommonsFile(page.pageimage);
}

function s3Client(): { s3: S3Client; bucket: string } | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.AWS_S3_PROPERTIES_BUCKET ?? process.env.AWS_S3_BUCKET;
  if (!accessKeyId || !secretAccessKey || !bucket) return null;
  const endpoint = process.env.AWS_ENDPOINT_URL;
  return {
    bucket,
    s3: new S3Client({
      region: process.env.AWS_REGION ?? 'us-east-1',
      credentials: { accessKeyId, secretAccessKey },
      endpoint,
      forcePathStyle: Boolean(endpoint),
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    }),
  };
}

async function downloadImage(url: string): Promise<{ body: Buffer; contentType: string } | null> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const contentType = (res.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? '';
  if (!CONTENT_TYPE_EXT[contentType]) return null;
  const body = Buffer.from(await res.arrayBuffer());
  if (body.byteLength === 0 || body.byteLength > MAX_IMAGE_BYTES) return null;
  return { body, contentType };
}

async function main(): Promise<void> {
  const args = parseArgs();
  const store = args.dryRun ? null : s3Client();
  if (!args.dryRun && !store) {
    throw new Error('S3 is not configured (set AWS_* env vars or use --dry-run)');
  }

  const pois = await prisma.poi.findMany({
    where: {
      status: 'PUBLISHED',
      ...(args.city ? { citySlug: args.city } : {}),
      photos: { none: {} },
    },
    orderBy: [{ citySlug: 'asc' }, { sortOrder: 'asc' }],
    take: args.limit,
    select: { id: true, city: true, nameLabels: true, wikidataId: true, wikipediaTitle: true },
  });

  console.log(`${pois.length} POI(s) without photos${args.city ? ` in ${args.city}` : ''}`);
  let found = 0;
  let skipped = 0;

  for (const poi of pois) {
    const name = (poi.nameLabels as { en?: string } | null)?.en ?? poi.wikipediaTitle ?? poi.id;
    let image: ResolvedImage | null = null;
    try {
      if (poi.wikidataId) {
        image = await imageFromWikidata(poi.wikidataId);
        await sleep(RATE_LIMIT_MS);
      }
      if (!image && poi.wikipediaTitle) {
        image = await imageFromWikipedia(poi.wikipediaTitle);
        await sleep(RATE_LIMIT_MS);
      }
    } catch (error) {
      console.warn(`  ! ${poi.id}: lookup failed — ${(error as Error).message}`);
    }

    if (!image) {
      skipped += 1;
      console.log(`  – ${poi.id} (${name}): no freely-licensed image`);
      continue;
    }

    if (args.dryRun || !store) {
      found += 1;
      console.log(`  ✓ ${poi.id} (${name}): ${image.license} — ${image.url}`);
      continue;
    }

    const downloaded = await downloadImage(image.url);
    if (!downloaded) {
      skipped += 1;
      console.log(`  – ${poi.id}: download rejected`);
      continue;
    }
    const ext = CONTENT_TYPE_EXT[downloaded.contentType];
    const key = `pois/${poi.id}/${randomUUID()}.${ext}`;
    await store.s3.send(
      new PutObjectCommand({
        Bucket: store.bucket,
        Key: key,
        Body: downloaded.body,
        ContentType: downloaded.contentType,
      }),
    );
    await prisma.poiPhoto.create({
      data: {
        poiId: poi.id,
        key,
        sortOrder: 0,
        status: 'PENDING_REVIEW',
        attribution: image.attribution,
        license: image.license,
        sourceUrl: image.sourceUrl,
      },
    });
    found += 1;
    console.log(`  ✓ ${poi.id} (${name}): imported ${image.license}`);
    await sleep(RATE_LIMIT_MS);
  }

  console.log(
    `\nDone. ${found} image(s) ${args.dryRun ? 'found' : 'imported (PENDING_REVIEW)'}, ${skipped} skipped.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
