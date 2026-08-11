import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchLanguageStats, fetchProfile } from "./github.js";
import {
  renderLanguagesSvg,
  renderSnakeSvg,
  renderStatsSvg,
} from "./render.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

async function countStars(token, login) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "gaaaroo-profile-generator",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  let stars = 0;
  let page = 1;
  while (page <= 10) {
    const res = await fetch(
      `https://api.github.com/users/${login}/repos?per_page=100&page=${page}&type=owner`,
      { headers }
    );
    if (!res.ok) break;
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const repo of batch) {
      if (!repo.fork) stars += repo.stargazers_count || 0;
    }
    if (batch.length < 100) break;
    page += 1;
  }
  return stars;
}

async function main() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const login =
    process.env.GITHUB_USER || process.env.GITHUB_REPOSITORY_OWNER || "Gaaaroo";
  const outDir = process.env.OUT_DIR || path.join(root, "dist");

  if (!token) {
    console.error("GITHUB_TOKEN (or GH_TOKEN) is required");
    process.exit(1);
  }

  console.log(`Generating profile assets for @${login}…`);
  const user = await fetchProfile(token, login);
  const [stars, langStats] = await Promise.all([
    countStars(token, login),
    fetchLanguageStats(token, login),
  ]);

  await mkdir(outDir, { recursive: true });

  await Promise.all([
    writeFile(
      path.join(outDir, "stats.svg"),
      renderStatsSvg(user, stars),
      "utf8"
    ),
    writeFile(
      path.join(outDir, "languages.svg"),
      renderLanguagesSvg(langStats.languages),
      "utf8"
    ),
    writeFile(
      path.join(outDir, "snake.svg"),
      renderSnakeSvg(user.contributionsCollection.contributionCalendar),
      "utf8"
    ),
  ]);

  console.log(`Wrote ${outDir}/stats.svg`);
  console.log(`Wrote ${outDir}/languages.svg`);
  console.log(`Wrote ${outDir}/snake.svg`);
  console.log(
    `Commits=${user.contributionsCollection.totalCommitContributions} stars=${stars} langs=${langStats.languages.length}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
