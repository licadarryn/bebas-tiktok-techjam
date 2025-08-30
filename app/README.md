# BEBAS: A Value-Sharing Solution

## Rspeedy project

This is a ReactLynx project bootstrapped with `create-rspeedy`.

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

Then, run the development server:

```bash
pnpm run dev
```

Scan the QRCode in the terminal with your LynxExplorer App to see the result.

You can start editing the page by modifying `src/App.tsx`. The page auto-updates as you edit the file.

## Introduction

BEBAS is a value-sharing solution designed to reward creators fairly. At the heart of the system is an engagement ranking model relative to their peers based on performance and content similarity to ensure equitable recognition and revenue distribution.

The system addresses three key challenges in the creator ecosystem:

1. Engagement
Traditional metrics often favor videos with large audiences, leaving smaller creators under-rewarded. BEBAS calculates an engagement score using features like diggCount, shareCount, playCount, collectCount, and commentCount, combined with NLP-based content similarity, to rank videos relative to their peers. This ensures that impactful content is recognized regardless of creator size.

2. Policy Compliance
Platforms struggle to consistently identify inappropriate or non-compliant content. Using CLIP, BEBAS analyzes transcripts, captions, and hashtags to detect risky or policy-violating content (e.g., NSFW material, scams, undisclosed ads), incorporating compliance into the ranking to maintain trust and integrity.

3. Profit Sharing
Flat or follower-based revenue models often create inequities. BEBAS calculates revenue using a formula that accounts for engagement, creator size, and policy compliance, along with safeguards like minimum video length and follower count, to ensure fair compensation for creators of all sizes.

By integrating these components into a unified ranking model, BEBAS not only ranks content fairly but also drives transparent, data-driven revenue allocation, empowering creators while safeguarding the platform ecosystem.

## Features
1. Engagement Scoring System
- Feature Engineering: Leverages engagement metrics such as diggCount, shareCount, playCount, collectCount, and commentCount to compute a comprehensive engagement rate.
- Content Similarity via NLP: Applies natural language processing (NLP) techniques to identify videos with the highest semantic similarity based on captions, hashtags, and transcripts.
- Integration into the Ranking Model: Videos are ranked relative to similar content, producing an engagement percentile used for fair comparison across creators.
2. Policy Compliance
- Violation Flagging: Samples frames from video ads and uses CLIP as a zero-shot classifier to flag potential violations.
3. Profit Sharing Model
- Revenue Allocation – Employs feature engineering on creator and content metrics (e.g., authorMeta.fans, diggCount, playCount, commentCount) to calculate fair revenue distribution across creators.

## How It Works
This system consists of three main parts:

1. Engagement
- The engagement rate is calculated using `diggCount`, `shareCount`, `playCount`, `collectCount`, and `commentCount`. To capture relative performance, each metric is normalized by the total number of views. The equation is defined as:

Engagement Rate = LVR̂ + 2.5·SvVR̂ + 5·CVR̂ + 5·ShVR̂

Here, 
- LVR̂ = likes per view (smoothed)

- SvVR̂ = saves per view (smoothed)

- CVR̂ = comments per view (smoothed)

- ShVR̂ = shares per view (smoothed)

The weights are chosen to reflect the relative impact of interactions: on average, a video receives 1 comment, 1 share, and 2.5 saves for every 5 likes. Comments and shares signal deeper engagement, so they are weighted more heavily.

To avoid small creators being disproportionately advantaged by low view counts (e.g., a single comment on a few views leading to an inflated score), each component is adjusted using Bayesian smoothing. This ensures more stable and reliable engagement rates across videos of all sizes.

- Captions, hashtags, and transcripts are also processed through an NLP model to identify and rank the most similar videos in the dataset. Each video is compared against its most similar peers to calculate an engagement percentile. This ensures that videos are evaluated relative to similar content, not just overall popularity.

2. Policy Compliance
CLIP is applied to analyze transcripts, captions, and hashtags, detecting keywords that may indicate suspicious or risky content (e.g., NSFW material, profanity, scams, or undisclosed ads). The system outputs both the proportion and categories of potential policy violations.

3. Profit Sharing Model
The revenue allocation formula is designed to balance reach (views) and interaction quality (likes, comments, shares), while also accounting for creator size and compliance requirements. The formula is:

Revenue = ⎧ 0                                                , if F < 10,000 or D < 30 or V > T
          ⎨ (0.6·√Vw + 0.4·((L + C + Sh) / F)·1000) · α     , otherwise

where:

- F = follower count,

- D = video duration (in seconds),

- V = number of policy violations,

- T = violation threshold,

- Vw = views (playCount),

- L = likes (diggCount),

- C = comments,

- Sh = shares,

- α = 0.0467 = scaling factor to match realistic TikTok payouts.

The formula works in three steps:

1. Restrictions: Videos with fewer than 10,000 followers, shorter than 30 seconds, or exceeding the violation threshold earn no revenue. This ensures a baseline standard of quality and compliance.

2. Reward Points: The score is a weighted sum of:

- 0.6·√Vw → favors videos that reach larger audiences while dampening the advantage of extreme virality through a square-root transformation.

- 0.4·((L + C + Sh) / F)·1000 → emphasizes engagement relative to creator size, ensuring small creators can still earn if their audience is highly interactive.

3. Scaling: Finally, a multiplier α = 0.0467 converts reward points into dollar-equivalent revenue aligned with platform payout benchmarks.

This structure balances scale (views) and depth (engagement per follower), while safeguarding fairness and compliance.

## Technologies Used
- CLIP
- NLP
- Apify
- Python
- TypeScript (Front-End)