// index.js
const { ApifyClient } = require("apify-client");
const fs = require("fs");
const axios = require("axios");
const readline = require("readline");

const client = new ApifyClient({
  token: "", //insert your api key here
});

async function expand(shortUrl) {
  try {
    const res = await axios.get(shortUrl, {
      maxRedirects: 0,
      validateStatus: (s) => s === 301 || s === 302,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    return res.headers.location || shortUrl;
  } catch (err) {
    console.error("URL expand error:", err.message);
    return shortUrl;
  }
}

async function runScraper(url) {
  try {
    fs.writeFileSync("input.json", JSON.stringify({ url }, null, 2));
    console.log("✅ Saved input.json");

    const expanded = await expand(url);
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
    console.log("Run started:", run.id);

    const { items } = await client
      .dataset(run.defaultDatasetId)
      .listItems({ clean: true });

    console.log("Items count:", items.length);
    fs.writeFileSync("result.json", JSON.stringify(items, null, 2));
    console.log("✅ Saved results to result.json");
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter TikTok URL: ", async (url) => {
  await runScraper(url);
  rl.close();
});
