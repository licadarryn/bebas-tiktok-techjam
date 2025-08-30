const { ApifyClient } = require("apify-client");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const client = new ApifyClient({
  token: "", //your api key
});

// Fixed CSV file
const CSV_FILE = path.join(__dirname, "result.csv");

// Headers for CSV
const HEADERS = [
  "url",
  "fans",
  "shareCount",
  "diggCount",
  "playCount",
  "collectCount",
  "commentCount",
  "duration",
];

// Initialize CSV file (overwrite if exists)
fs.writeFileSync(CSV_FILE, HEADERS.join(",") + "\n", "utf8");

// Expand TikTok short URLs
async function expandUrl(shortUrl) {
  try {
    const res = await axios.get(shortUrl, {
      maxRedirects: 0,
      validateStatus: (s) => s === 301 || s === 302,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    return res.headers.location || shortUrl;
  } catch {
    return shortUrl;
  }
}

// Append a row to CSV
function appendRow(url, item) {
  const row = [
    `"${url}"`,
    item?.authorMeta?.fans ?? 0,      // <-- updated here
    item?.shareCount ?? 0,
    item?.diggCount ?? 0,
    item?.playCount ?? 0,
    item?.collectCount ?? 0,
    item?.commentCount ?? 0,
    item?.videoMeta?.duration ?? 0,
  ].join(",");
  fs.appendFileSync(CSV_FILE, row + "\n", "utf8");
  console.log(`✅ Metadata saved for ${url}`);
}

// Main function
async function getMetadata(url) {
  try {
    const expanded = await expandUrl(url);
    console.log("Using expanded URL:", expanded);

    const input = {
      postURLs: [expanded],
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      shouldDownloadSubtitles: false,
      shouldDownloadSlideshowImages: false,
      shouldDownloadAvatars: false,
      shouldDownloadMusicCovers: false,
    };

    const run = await client.actor("clockworks/tiktok-scraper").call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems({ clean: true });

    if (!items || items.length === 0) {
      console.log("No metadata found for this video.");
      return [];
    }

    // Append rows to CSV
    items.forEach((item) => appendRow(expanded, item));

    return items.map((item) => ({
      fans: item?.authorMeta?.fans ?? 0,    // <-- updated here
      shareCount: item?.shareCount ?? 0,
      diggCount: item?.diggCount ?? 0,
      playCount: item?.playCount ?? 0,
      collectCount: item?.collectCount ?? 0,
      commentCount: item?.commentCount ?? 0,
      duration: item?.videoMeta?.duration ?? 0,
    }));
  } catch (err) {
    console.error("❌ Metadata error:", err.message);
    return { error: err.message };
  }
}

// Test
if (require.main === module) {
  const testUrl = "https://www.tiktok.com/@username/video/1234567890"; // replace with a real URL
  (async () => await getMetadata(testUrl))();
}

module.exports = getMetadata;
