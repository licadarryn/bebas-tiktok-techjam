const fs = require("fs");
const { spawn } = require("child_process");
const axios = require("axios");
const readline = require("readline");

const YTDLP_PATH = "-"; // insert your path here 
const OUTPUT_FILE = "video.mp4";
const INPUT_FILE = "input.json";
const ASSEMBLYAI_API_KEY = "-"; //insert your api key here
const POLL_INTERVAL = 5000; 
const MAX_POLL_ATTEMPTS = 60; 

async function expandUrl(shortUrl) {
  try {
    const res = await axios.get(shortUrl, {
      maxRedirects: 0,
      validateStatus: (status) => status === 301 || status === 302,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    return res.headers.location || shortUrl;
  } catch {
    return shortUrl;
  }
}

async function askUrl() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("Enter the TikTok video URL: ", (url) => {
      rl.close();
      resolve(url.trim());
    });
  });
}

(async () => {
  try {
    const url = await askUrl();
    fs.writeFileSync(INPUT_FILE, JSON.stringify({ url }, null, 2), "utf8");
    console.log(`📄 Saved URL to ${INPUT_FILE}`);

    const expandedUrl = await expandUrl(url);
    console.log("📌 Downloading TikTok video from:", expandedUrl);

    if (!fs.existsSync(YTDLP_PATH)) {
      console.error(`❌ yt-dlp not found at path: ${YTDLP_PATH}`);
      process.exit(1);
    }

    await new Promise((resolve, reject) => {
      const ytdlp = spawn(YTDLP_PATH, [
        "-f", "best",                        
        "--merge-output-format", "mp4",    
        "--no-check-certificate",            
        "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "-o", OUTPUT_FILE,
        expandedUrl,
      ]);

      ytdlp.stdout.on("data", (data) => console.log(`yt-dlp: ${data.toString()}`));
      ytdlp.stderr.on("data", (data) => console.error(`yt-dlp error: ${data.toString()}`));

      ytdlp.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`yt-dlp exited with code ${code}`));
      });
    });

    console.log(`Video downloaded as ${OUTPUT_FILE}`);

    console.log("Uploading video to AssemblyAI...");
    const uploadResp = await axios({
      method: "post",
      url: "https://api.assemblyai.com/v2/upload",
      headers: {
        "authorization": ASSEMBLYAI_API_KEY,
        "transfer-encoding": "chunked",
      },
      data: fs.createReadStream(OUTPUT_FILE),
    });

    const audioUrl = uploadResp.data.upload_url;
    console.log("Video uploaded, URL:", audioUrl);

    // ===== REQUEST TRANSCRIPTION =====
    const transcriptResp = await axios.post(
      "https://api.assemblyai.com/v2/transcript",
      { audio_url: audioUrl },
      { headers: { "authorization": ASSEMBLYAI_API_KEY } }
    );

    const transcriptId = transcriptResp.data.id;
    console.log("Transcription requested, ID:", transcriptId);

    let completed = false;
    let transcriptText = "";
    let attempts = 0;

    while (!completed && attempts < MAX_POLL_ATTEMPTS) {
      attempts++;
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));

      const statusResp = await axios.get(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        { headers: { "authorization": ASSEMBLYAI_API_KEY } }
      );

      if (statusResp.data.status === "completed") {
        completed = true;
        transcriptText = statusResp.data.text;
        console.log("Transcription completed!");
      } else if (statusResp.data.status === "failed") {
        completed = true;
        console.error("Transcription failed:", statusResp.data.error);
      } else {
        console.log(`Transcription in progress... (${attempts}/${MAX_POLL_ATTEMPTS})`);
      }
    }

    if (!completed) {
      console.error("Transcription timed out after max attempts");
    }

    // ===== SAVE TRANSCRIPT =====
    fs.writeFileSync("transcript.json", JSON.stringify({ transcript: transcriptText }, null, 2), "utf8");
    console.log("Transcription saved to transcript.json");

    // ===== CLEAN UP VIDEO FILE =====
    if (fs.existsSync(OUTPUT_FILE)) {
      fs.unlinkSync(OUTPUT_FILE);
      console.log(`Deleted video file: ${OUTPUT_FILE}`);
    }

  } catch (err) {
    console.error("Error:", err.message);
  }
})();
