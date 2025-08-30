const fs = require("fs");
const { spawn } = require("child_process");
const axios = require("axios");
const path = require("path");

const YTDLP_PATH = ""; // your path
const ASSEMBLYAI_API_KEY = ""; // your api key
const POLL_INTERVAL = 5000;
const MAX_POLL_ATTEMPTS = 60;

// Use the same CSV as metadata
const CSV_FILE = path.join(__dirname, "result.csv");

// Expand TikTok short links
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

// Append transcript to the matching URL row
function appendTranscript(url, transcript) {
  if (!fs.existsSync(CSV_FILE)) {
    console.error("CSV file does not exist. Run metadata script first.");
    return;
  }

  const lines = fs.readFileSync(CSV_FILE, "utf8").split("\n").filter(Boolean);
  const headers = lines[0].split(",");
  let transcriptIndex = headers.indexOf("transcript");
  if (transcriptIndex === -1) {
    headers.push("transcript");
    transcriptIndex = headers.length - 1;
    lines[0] = headers.join(",");
    // Add empty transcript column to all existing rows
    for (let i = 1; i < lines.length; i++) {
      lines[i] += ",";
    }
  }

  let updated = false;
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // split CSV respecting quotes
    if (cells[0].replace(/"/g, "") === url) {
      cells[transcriptIndex] = `"${transcript.replace(/"/g, '""')}"`;
      lines[i] = cells.join(",");
      updated = true;
      break;
    }
  }

  if (!updated) {
    // URL not found, append new row
    const newRow = Array(headers.length).fill("");
    newRow[0] = `"${url}"`;
    newRow[transcriptIndex] = `"${transcript.replace(/"/g, '""')}"`;
    lines.push(newRow.join(","));
  }

  fs.writeFileSync(CSV_FILE, lines.join("\n"), "utf8");
  console.log(`Transcript updated for ${url}`);
}

// Main transcript function
async function getTranscript(url) {
  const OUTPUT_FILE = path.join(__dirname, "video.mp4");

  try {
    const expandedUrl = await expandUrl(url);
    console.log("Downloading TikTok video from:", expandedUrl);

    if (!fs.existsSync(YTDLP_PATH)) throw new Error(`yt-dlp not found at path: ${YTDLP_PATH}`);

    // Download video
    await new Promise((resolve, reject) => {
      const ytdlp = spawn(YTDLP_PATH, [
        "-f", "best",
        "--merge-output-format", "mp4",
        "--no-check-certificate",
        "--user-agent", "Mozilla/5.0",
        "-o", OUTPUT_FILE,
        expandedUrl,
      ]);

      ytdlp.stdout.on("data", (data) => console.log(`yt-dlp: ${data.toString()}`));
      ytdlp.stderr.on("data", (data) => console.error(`yt-dlp error: ${data.toString()}`));

      ytdlp.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`yt-dlp exited with code ${code}`))));
    });

    console.log(`Video downloaded as ${OUTPUT_FILE}`);

    // Upload to AssemblyAI
    const uploadResp = await axios({
      method: "post",
      url: "https://api.assemblyai.com/v2/upload",
      headers: { authorization: ASSEMBLYAI_API_KEY, "transfer-encoding": "chunked" },
      data: fs.createReadStream(OUTPUT_FILE),
    });

    const audioUrl = uploadResp.data.upload_url;

    // Request transcription
    const transcriptResp = await axios.post(
      "https://api.assemblyai.com/v2/transcript",
      { audio_url: audioUrl },
      { headers: { authorization: ASSEMBLYAI_API_KEY } }
    );

    const transcriptId = transcriptResp.data.id;

    // Poll for completion
    let transcriptText = "";
    for (let attempts = 0; attempts < MAX_POLL_ATTEMPTS; attempts++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      const statusResp = await axios.get(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { authorization: ASSEMBLYAI_API_KEY },
      });

      if (statusResp.data.status === "completed") {
        transcriptText = statusResp.data.text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
        break;
      }

      if (statusResp.data.status === "failed") throw new Error("Transcription failed: " + statusResp.data.error);
    }

    if (!transcriptText) throw new Error("Transcription timed out");

    appendTranscript(expandedUrl, transcriptText);

    if (fs.existsSync(OUTPUT_FILE)) fs.unlinkSync(OUTPUT_FILE);

    return transcriptText;
  } catch (err) {
    console.error("Transcript error:", err.message);
    appendTranscript(url, `ERROR: ${err.message}`);
    return `ERROR: ${err.message}`;
  }
}

module.exports = getTranscript;
