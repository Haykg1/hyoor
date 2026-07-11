/**
 * Scrapes a list.am property page, extracts structured JSON via OpenAI,
 * downloads gallery photos, and crops the top-right list.am watermark.
 *
 * 1. Set FIRECRAWL_API_KEY, SCRAPINGDOG_API_KEY, OPENAI_API_KEY, and LIST_AM_URL.
 * 2. Run: pnpm scrape:property
 */

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY ?? "";
const SCRAPINGDOG_API_KEY = process.env.SCRAPINGDOG_API_KEY ?? "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const LIST_AM_URL = process.env.LIST_AM_URL ?? "";

const OPENAI_MODEL = "gpt-4o-mini";
const OUTPUT_FILE = "scraped-property.json";
const IMAGES_DIR = ".";
const WATERMARK_CROP = { topRatio: 0.07, rightRatio: 0.18 };

type ScrapeSource = "firecrawl" | "scrapingdog";

interface ScrapedListAmProperty {
  sourceUrl: string;
  listingId: string | null;
  title: string | null;
  description: string | null;
  price: {
    amount: number | null;
    currency: string | null;
    period: "night" | "month" | "total" | "unknown" | null;
    raw: string | null;
  };
  propertyType: string | null;
  transactionType: "rent" | "sale" | "unknown" | null;
  location: {
    city: string | null;
    region: string | null;
    district: string | null;
    address: string | null;
    coordinates: { lat: number | null; lng: number | null };
  };
  attributes: {
    areaSqm: number | null;
    rooms: number | null;
    bedrooms: number | null;
    floor: string | null;
    totalFloors: string | null;
    buildingType: string | null;
    condition: string | null;
    furnished: boolean | null;
  };
  amenities: string[];
  photos: string[];
  localPhotos: string[];
  contact: {
    name: string | null;
    phone: string | null;
  };
  postedAt: string | null;
  scrapedAt: string;
  scrapeSource: ScrapeSource;
}

const PROPERTY_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    sourceUrl: { type: "string" },
    listingId: { type: ["string", "null"] },
    title: { type: ["string", "null"] },
    description: { type: ["string", "null"] },
    price: {
      type: "object",
      additionalProperties: false,
      properties: {
        amount: { type: ["number", "null"] },
        currency: { type: ["string", "null"] },
        period: {
          type: ["string", "null"],
          enum: ["night", "month", "total", "unknown", null],
        },
        raw: { type: ["string", "null"] },
      },
      required: ["amount", "currency", "period", "raw"],
    },
    propertyType: { type: ["string", "null"] },
    transactionType: {
      type: ["string", "null"],
      enum: ["rent", "sale", "unknown", null],
    },
    location: {
      type: "object",
      additionalProperties: false,
      properties: {
        city: { type: ["string", "null"] },
        region: { type: ["string", "null"] },
        district: { type: ["string", "null"] },
        address: { type: ["string", "null"] },
        coordinates: {
          type: "object",
          additionalProperties: false,
          properties: {
            lat: { type: ["number", "null"] },
            lng: { type: ["number", "null"] },
          },
          required: ["lat", "lng"],
        },
      },
      required: ["city", "region", "district", "address", "coordinates"],
    },
    attributes: {
      type: "object",
      additionalProperties: false,
      properties: {
        areaSqm: { type: ["number", "null"] },
        rooms: { type: ["number", "null"] },
        bedrooms: { type: ["number", "null"] },
        floor: { type: ["string", "null"] },
        totalFloors: { type: ["string", "null"] },
        buildingType: { type: ["string", "null"] },
        condition: { type: ["string", "null"] },
        furnished: { type: ["boolean", "null"] },
      },
      required: [
        "areaSqm",
        "rooms",
        "bedrooms",
        "floor",
        "totalFloors",
        "buildingType",
        "condition",
        "furnished",
      ],
    },
    amenities: { type: "array", items: { type: "string" } },
    photos: { type: "array", items: { type: "string" } },
    contact: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: ["string", "null"] },
        phone: { type: ["string", "null"] },
      },
      required: ["name", "phone"],
    },
    postedAt: { type: ["string", "null"] },
    scrapedAt: { type: "string" },
    scrapeSource: { type: "string", enum: ["firecrawl", "scrapingdog"] },
  },
  required: [
    "sourceUrl",
    "listingId",
    "title",
    "description",
    "price",
    "propertyType",
    "transactionType",
    "location",
    "attributes",
    "amenities",
    "photos",
    "contact",
    "postedAt",
    "scrapedAt",
    "scrapeSource",
  ],
} as const;

function assertConfig(): void {
  const missing: string[] = [];
  if (!FIRECRAWL_API_KEY) missing.push("FIRECRAWL_API_KEY");
  if (!SCRAPINGDOG_API_KEY) missing.push("SCRAPINGDOG_API_KEY");
  if (!OPENAI_API_KEY) missing.push("OPENAI_API_KEY");
  if (!LIST_AM_URL) missing.push("LIST_AM_URL");
  if (missing.length === 0) return;
  throw new Error(
    `Set env vars before running: ${missing.join(", ")} (and LIST_AM_URL if missing)`,
  );
}

function assertListAmUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("LIST_AM_URL must be a valid URL");
  }
  if (!parsed.hostname.includes("list.am")) {
    throw new Error("LIST_AM_URL must be a list.am page");
  }
}

function resolveListAmImageUrl(raw: string): string {
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  return `https://${raw}`;
}

function extractListAmImageUrls(html: string): string[] {
  const galleryMatch = html.match(/po82\.init\([^,]+,\s*\{img:\[([^\]]+)\]/);
  if (galleryMatch) {
    const urls = [
      ...galleryMatch[1].matchAll(/"((?:https?:)?\/\/s\.list\.am\/[^"]+)"/g),
    ].map((match) => resolveListAmImageUrl(match[1]));
    if (urls.length > 0) return [...new Set(urls)];
  }
  const fallback = [
    ...html.matchAll(
      /(?:https?:)?(\/\/s\.list\.am\/f\/\d+\/\d+\.(?:webp|jpg|jpeg|png))/gi,
    ),
  ].map((match) =>
    resolveListAmImageUrl(match[0].startsWith("//") ? match[0] : match[1]),
  );
  return [...new Set(fallback)];
}

function listingIdFromUrl(url: string): string {
  const match = url.match(/\/item\/(\d+)/);
  return match?.[1] ?? "listing";
}

function imageExtension(url: string): string {
  const match = url.match(/\.(webp|jpe?g|png)(?:\?|$)/i);
  return match?.[1]?.toLowerCase() === "jpeg"
    ? "jpg"
    : (match?.[1]?.toLowerCase() ?? "webp");
}

async function scrapeWithFirecrawl(
  url: string,
): Promise<{ markdown: string; html: string }> {
  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown", "html"],
      onlyMainContent: false,
      waitFor: 2000,
    }),
  });
  const payload = (await response.json()) as {
    success?: boolean;
    error?: string;
    data?: { markdown?: string; html?: string };
  };
  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? `Firecrawl failed (${response.status})`);
  }
  const markdown = payload.data?.markdown?.trim();
  const html = payload.data?.html?.trim();
  if (!markdown) {
    throw new Error("Firecrawl returned empty markdown");
  }
  if (!html) {
    throw new Error("Firecrawl returned empty html");
  }
  return { markdown, html };
}

async function scrapeWithScrapingDog(url: string): Promise<string> {
  const endpoint = new URL("https://api.scrapingdog.com/scrape");
  endpoint.searchParams.set("api_key", SCRAPINGDOG_API_KEY);
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("dynamic", "true");
  const response = await fetch(endpoint);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `ScrapingDog failed (${response.status}): ${body.slice(0, 200)}`,
    );
  }
  const html = await response.text();
  if (!html.trim()) {
    throw new Error("ScrapingDog returned empty HTML");
  }
  return html;
}

async function fetchGalleryHtml(
  url: string,
  fallbackHtml: string,
): Promise<string> {
  try {
    console.log(`ScrapingDog gallery fetch started ${url}`);
    return await scrapeWithScrapingDog(url);
  } catch (error) {
    console.warn("ScrapingDog gallery fetch failed, using page HTML fallback");
    console.warn(error instanceof Error ? error.message : error);
    return fallbackHtml;
  }
}

async function fetchPageContent(url: string): Promise<{
  content: string;
  html: string;
  source: ScrapeSource;
}> {
  try {
    const { markdown, html } = await scrapeWithFirecrawl(url);
    return { content: markdown, html, source: "firecrawl" };
  } catch (firecrawlError) {
    console.warn("Firecrawl scrape failed, trying ScrapingDog...");
    console.warn(
      firecrawlError instanceof Error ? firecrawlError.message : firecrawlError,
    );
    const html = await scrapeWithScrapingDog(url);
    return { content: html, html, source: "scrapingdog" };
  }
}

async function extractPropertyJson(
  pageContent: string,
  url: string,
  scrapeSource: ScrapeSource,
): Promise<ScrapedListAmProperty> {
  const scrapedAt = new Date().toISOString();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "list_am_property",
          strict: true,
          schema: PROPERTY_JSON_SCHEMA,
        },
      },
      messages: [
        {
          role: "system",
          content:
            "You extract structured real-estate listing data from list.am pages. Use only facts present in the page content. Normalize prices to numbers without separators. Use AMD when currency is unclear on list.am. Set unknown fields to null rather than guessing.",
        },
        {
          role: "user",
          content: [
            `Source URL: ${url}`,
            `Scrape source: ${scrapeSource}`,
            `Scraped at: ${scrapedAt}`,
            "",
            "Page content:",
            pageContent.slice(0, 120_000),
          ].join("\n"),
        },
      ],
    }),
  });
  const payload = (await response.json()) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  if (!response.ok) {
    throw new Error(
      payload.error?.message ?? `OpenAI failed (${response.status})`,
    );
  }
  const rawJson = payload.choices?.[0]?.message?.content;
  if (!rawJson) {
    throw new Error("OpenAI returned empty content");
  }
  const parsed = JSON.parse(rawJson) as Omit<
    ScrapedListAmProperty,
    "localPhotos"
  >;
  return {
    ...parsed,
    sourceUrl: url,
    scrapedAt,
    scrapeSource,
    localPhotos: [],
  };
}

async function cropListAmWatermark(
  imageBuffer: Buffer,
): Promise<{ buffer: Buffer; extension: string }> {
  const sharp = (await import("sharp")).default;
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width === 0 || height === 0) {
    return { buffer: imageBuffer, extension: metadata.format ?? "webp" };
  }
  const cropTop = Math.max(1, Math.round(height * WATERMARK_CROP.topRatio));
  const cropRight = Math.max(1, Math.round(width * WATERMARK_CROP.rightRatio));
  const croppedWidth = width - cropRight;
  const croppedHeight = height - cropTop;
  if (croppedWidth < 1 || croppedHeight < 1) {
    return { buffer: imageBuffer, extension: metadata.format ?? "webp" };
  }
  const buffer = await image
    .extract({
      left: 0,
      top: cropTop,
      width: croppedWidth,
      height: croppedHeight,
    })
    .toBuffer();
  return { buffer, extension: metadata.format ?? "webp" };
}

async function downloadPropertyImages(
  imageUrls: string[],
  listingId: string,
): Promise<string[]> {
  if (imageUrls.length === 0) return [];
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  await fs.mkdir(IMAGES_DIR, { recursive: true });
  const savedPaths: string[] = [];
  for (let index = 0; index < imageUrls.length; index++) {
    const url = imageUrls[index];
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RentStarScraper/1.0)",
      },
    });
    if (!response.ok) {
      console.warn(`Skipped ${url} (${response.status})`);
      continue;
    }
    const rawBuffer = Buffer.from(await response.arrayBuffer());
    const { buffer, extension } = await cropListAmWatermark(rawBuffer);
    const outputExtension = imageExtension(url) || extension;
    const filename = `${listingId}-${String(index + 1).padStart(2, "0")}.${outputExtension}`;
    const outputPath = path.join(IMAGES_DIR, filename);
    await fs.writeFile(outputPath, buffer);
    savedPaths.push(outputPath);
    console.log(`Saved image: ${outputPath}`);
  }
  return savedPaths;
}

async function main(): Promise<void> {
  assertConfig();
  assertListAmUrl(LIST_AM_URL);
  console.log(`Scraping: ${LIST_AM_URL}`);
  const { content, html, source } = await fetchPageContent(LIST_AM_URL);
  console.log(`Fetched page via ${source} (${content.length} chars)`);
  const galleryHtml = await fetchGalleryHtml(LIST_AM_URL, html);
  const imageUrls = extractListAmImageUrls(galleryHtml);
  console.log(`Found ${imageUrls.length} gallery image(s)`);
  console.log("Extracting structured property JSON with OpenAI...");
  const property = await extractPropertyJson(content, LIST_AM_URL, source);
  const listingId = property.listingId ?? listingIdFromUrl(LIST_AM_URL);
  const photosToDownload = imageUrls.length > 0 ? imageUrls : property.photos;
  console.log(`Downloading ${photosToDownload.length} image(s)...`);
  property.photos = photosToDownload;
  property.localPhotos = await downloadPropertyImages(
    photosToDownload,
    listingId,
  );
  const fs = await import("node:fs/promises");
  await fs.writeFile(
    OUTPUT_FILE,
    `${JSON.stringify(property, null, 2)}\n`,
    "utf8",
  );
  console.log(`Saved: ${OUTPUT_FILE}`);
  console.log(JSON.stringify(property, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
});
