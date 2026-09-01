/**
 * Batch-enrich curated POIs from Nominatim/OSM (names, website, phone)
 * and Firecrawl image search (up to 3 local JPEGs).
 *
 *   pnpm enrich:pois -- --limit 10
 *   pnpm enrich:pois -- --limit 10 --dry-run
 *   pnpm enrich:pois -- --limit 10 --all
 *   pnpm enrich:pois -- --id cascade
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PrismaClient,
  type Prisma,
} from "./packages/database/src/generated/client";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const PHOTO_DIR = join(ROOT, "poi-photos");
const UA = "ArimnaPoiEnrich/1.0 (privacy@arimna.am)";
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_EDGE = 2048;
const PHOTO_LIMIT = 3;
const MATCH_METERS = 300;
const NOMINATIM_MS = 1100;

loadEnv(join(ROOT, "apps/api/.env"));
loadEnv(join(ROOT, ".env"));

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY ?? "";
const args = process.argv.slice(2);
const LIMIT = Number(flagValue("limit") ?? 10) || 10;
const DRY_RUN = args.includes("--dry-run");
const ALL = args.includes("--all");
const POI_ID = flagValue("id");

type Labels = { en: string; hy: string; ru: string };
type OsmHit = {
  osmType: string;
  osmId: string;
  website: string;
  websiteMenu: string;
  phone: string;
  names: Labels;
};

function flagValue(name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  if (index < 0) return undefined;
  const value = args[index + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

function loadEnv(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseLabels(value: unknown): Labels {
  const record = asRecord(value);
  return {
    en: asString(record?.en),
    hy: asString(record?.hy),
    ru: asString(record?.ru),
  };
}

function coordStem(lat: number, lng: number): string {
  return `${lat.toFixed(7)}_${lng.toFixed(7)}`;
}

function missingPhotoSlots(stem: string): number[] {
  if (!existsSync(PHOTO_DIR)) return [1, 2, 3];
  return [1, 2, 3].filter(
    (slot) => !existsSync(join(PHOTO_DIR, `${stem}_${slot}.jpg`)),
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const sin =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(sin));
}

function tagsFromMaps(
  extra: Record<string, string> | undefined,
  names: Record<string, string> | undefined,
  osmType: string,
  osmId: string,
): OsmHit {
  const tags = extra ?? {};
  const named = names ?? {};
  return {
    osmType,
    osmId,
    website: asString(tags.website || tags["contact:website"]),
    websiteMenu: asString(
      tags["website:menu"] || tags["contact:menu"] || tags.menu,
    ),
    phone: asString(tags.phone || tags["contact:phone"]),
    names: {
      en: asString(named["name:en"]),
      hy: asString(named["name:hy"]),
      ru: asString(named["name:ru"]),
    },
  };
}

async function nominatimSearch(
  query: string,
  lat: number,
  lng: number,
): Promise<OsmHit | null> {
  const delta = MATCH_METERS / 111_000;
  const dLng = delta / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("namedetails", "1");
  url.searchParams.set("bounded", "1");
  url.searchParams.set(
    "viewbox",
    `${lng - dLng},${lat + delta},${lng + dLng},${lat - delta}`,
  );
  const response = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!response.ok) {
    console.warn(`Nominatim ${response.status} for ${query}`);
    return null;
  }
  const rows = (await response.json()) as Array<{
    lat: string;
    lon: string;
    osm_type?: string;
    osm_id?: number;
    namedetails?: Record<string, string>;
    extratags?: Record<string, string>;
  }>;
  for (const row of rows) {
    const hitLat = Number(row.lat);
    const hitLng = Number(row.lon);
    if (!Number.isFinite(hitLat) || !Number.isFinite(hitLng)) continue;
    if (haversineMeters(lat, lng, hitLat, hitLng) > MATCH_METERS) continue;
    const osmType = asString(row.osm_type);
    const osmId = String(row.osm_id ?? "");
    if (!osmType || !osmId) continue;
    return tagsFromMaps(row.extratags, row.namedetails, osmType, osmId);
  }
  return null;
}

async function osmApiTags(
  osmType: string,
  osmId: string,
): Promise<Record<string, string>> {
  const response = await fetch(
    `https://api.openstreetmap.org/api/0.6/${osmType}/${osmId}.json`,
    {
      headers: { "User-Agent": UA, Accept: "application/json" },
    },
  );
  if (!response.ok) return {};
  const payload = asRecord(await response.json());
  const elements = Array.isArray(payload?.elements) ? payload.elements : [];
  const first = asRecord(elements[0]);
  const tags = asRecord(first?.tags);
  if (!tags) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tags)) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

function extractHttpsImageUrls(payload: unknown): string[] {
  const root = asRecord(payload);
  const data = asRecord(root?.data) ?? root;
  const images = Array.isArray(data?.images)
    ? data.images
    : Array.isArray(root?.images)
      ? root.images
      : [];
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const entry of images) {
    const record = asRecord(entry);
    const candidate = asString(record?.imageUrl) || asString(record?.url);
    if (!candidate.startsWith("https://") || seen.has(candidate)) continue;
    try {
      if (new URL(candidate).protocol !== "https:") continue;
    } catch {
      continue;
    }
    seen.add(candidate);
    urls.push(candidate);
  }
  return urls;
}

async function firecrawlImages(query: string, city: string): Promise<string[]> {
  if (!FIRECRAWL_API_KEY) return [];
  try {
    const response = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        sources: ["images"],
        limit: PHOTO_LIMIT,
        location: `${city}, Armenia`,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      console.warn(`Firecrawl ${response.status} for ${query}`);
      return [];
    }
    return extractHttpsImageUrls(await response.json()).slice(0, PHOTO_LIMIT);
  } catch (error) {
    console.warn(
      `Firecrawl failed for ${query}: ${error instanceof Error ? error.message : error}`,
    );
    return [];
  }
}

async function compressPhoto(buffer: Buffer): Promise<Buffer> {
  const meta = await sharp(buffer).metadata();
  const longest = Math.max(meta.width ?? 0, meta.height ?? 0);
  if (longest <= MAX_EDGE && buffer.length <= MAX_BYTES) return buffer;
  let quality = 82;
  let out = await sharp(buffer)
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
  while (out.length > MAX_BYTES && quality > 40) {
    quality -= 10;
    out = await sharp(buffer)
      .rotate()
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
  }
  return out;
}

async function savePhotos(
  stem: string,
  slots: number[],
  urls: string[],
): Promise<number> {
  mkdirSync(PHOTO_DIR, { recursive: true });
  let saved = 0;
  for (const url of urls) {
    const slot = slots[saved];
    if (slot === undefined) break;
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(15000),
        redirect: "follow",
      });
      if (!response.ok) continue;
      const raw = Buffer.from(await response.arrayBuffer());
      if (raw.length < 100) continue;
      const jpeg = await compressPhoto(raw);
      writeFileSync(join(PHOTO_DIR, `${stem}_${slot}.jpg`), jpeg);
      saved += 1;
    } catch (error) {
      console.warn(
        `Photo download failed ${url}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
  return saved;
}

async function enrichOne(
  prisma: PrismaClient,
  poi: {
    id: string;
    city: string;
    latitude: unknown;
    longitude: unknown;
    nameLabels: unknown;
    attributes: unknown;
  },
): Promise<void> {
  const lat = Number(poi.latitude);
  const lng = Number(poi.longitude);
  const names = parseLabels(poi.nameLabels);
  const query = `${names.en || poi.id} ${poi.city} Armenia`.trim();
  await sleep(NOMINATIM_MS);
  let osm = await nominatimSearch(query, lat, lng);
  if (osm) {
    await sleep(NOMINATIM_MS);
    const tags = await osmApiTags(osm.osmType, osm.osmId);
    osm = tagsFromMaps(
      tags,
      {
        "name:en": osm.names.en,
        "name:hy": osm.names.hy,
        "name:ru": osm.names.ru,
        ...tags,
      },
      osm.osmType,
      osm.osmId,
    );
  }
  const nextNames = {
    en: osm?.names.en || names.en,
    hy: osm?.names.hy || names.hy,
    ru: osm?.names.ru || names.ru,
  };
  const attrs = { ...(asRecord(poi.attributes) ?? {}) };
  if (osm?.website) attrs.website = osm.website;
  if (osm?.websiteMenu) attrs.websiteMenu = osm.websiteMenu;
  if (osm?.phone) attrs.phone = osm.phone;
  if (osm) {
    attrs.osmType = osm.osmType;
    attrs.osmId = osm.osmId;
  }
  attrs.osmEnrichedAt = new Date().toISOString();
  const stem = coordStem(lat, lng);
  const slots = missingPhotoSlots(stem);
  const imageUrls =
    !DRY_RUN && slots.length > 0
      ? await firecrawlImages(`${names.en} ${poi.city} Armenia`, poi.city)
      : [];
  console.log(
    `${poi.id}: osm=${osm ? `${osm.osmType}/${osm.osmId}` : "none"} website=${osm?.website || "-"} menu=${osm?.websiteMenu || "-"} phone=${osm?.phone || "-"} photos=${DRY_RUN ? "dry-run" : slots.length ? imageUrls.length : "skip"}`,
  );
  if (DRY_RUN) return;
  if (slots.length > 0 && imageUrls.length > 0) {
    const saved = await savePhotos(stem, slots, imageUrls);
    console.log(`  saved ${saved} photo(s) as ${stem}_*.jpg`);
  }
  await prisma.poi.update({
    where: { id: poi.id },
    data: {
      nameLabels: nextNames,
      attributes: attrs as Prisma.InputJsonValue,
    },
  });
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const prisma = new PrismaClient();
  const rows = await prisma.poi.findMany({
    where: POI_ID ? { id: POI_ID } : undefined,
    orderBy: [{ city: "asc" }, { sortOrder: "asc" }],
  });
  const queue = rows
    .filter((poi) => ALL || !asString(asRecord(poi.attributes)?.osmEnrichedAt))
    .slice(0, LIMIT);
  console.log(`${DRY_RUN ? "Dry-run " : ""}enriching ${queue.length} POI(s)`);
  for (const poi of queue) {
    try {
      await enrichOne(prisma, poi);
    } catch (error) {
      console.warn(
        `${poi.id}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
