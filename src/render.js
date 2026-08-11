const THEME = {
  bg: "#0d1117",
  border: "#30363d",
  title: "#58a6ff",
  text: "#c9d1d9",
  muted: "#8b949e",
  icon: "#58a6ff",
  barTrack: "#21262d",
};

const LANG_COLORS = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Java: "#b07219",
  Python: "#3572A5",
  "C#": "#178600",
  CSS: "#563d7c",
  HTML: "#e34c26",
  Go: "#00ADD8",
  Dart: "#00B4AB",
  Kotlin: "#A97BFF",
  Shell: "#89e051",
  C: "#555555",
  "C++": "#f34b7d",
  Rust: "#dea584",
  PHP: "#4F5D95",
  Ruby: "#701516",
  Swift: "#F05138",
  Vue: "#41b883",
  SCSS: "#c6538c",
};

function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function roundRect(x, y, w, h, r) {
  return `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x + r} A${r},${r} 0 0 1 ${x},${y + h - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
}

function formatNum(n) {
  return new Intl.NumberFormat("en-US").format(n ?? 0);
}

function row(icon, label, value, y) {
  return `
    <g transform="translate(25, ${y})">
      <text class="icon" x="0" y="12.5">${icon}</text>
      <text class="label" x="28" y="12.5">${esc(label)}:</text>
      <text class="value" x="190" y="12.5">${esc(value)}</text>
    </g>`;
}

export function renderStatsSvg(user, stars = 0) {
  const c = user.contributionsCollection;
  const width = 420;
  const height = 195;
  const title = `${user.name || user.login}'s GitHub Stats`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">
  <title>${esc(title)}</title>
  <style>
    .title { font: 600 16px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${THEME.title}; }
    .label { font: 400 13px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${THEME.text}; }
    .value { font: 600 13px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${THEME.text}; }
    .icon { font: 13px 'Segoe UI Symbol', 'Apple Color Emoji', sans-serif; fill: ${THEME.icon}; }
    .muted { font: 400 11px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${THEME.muted}; }
  </style>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8" fill="${THEME.bg}" stroke="${THEME.border}"/>
  <text class="title" x="25" y="32">${esc(title)}</text>
  ${row("★", "Total Stars", formatNum(stars), 52)}
  ${row("☁", "Total Commits", formatNum(c.totalCommitContributions), 76)}
  ${row("⎇", "Total PRs", formatNum(c.totalPullRequestContributions), 100)}
  ${row("◉", "Total Issues", formatNum(c.totalIssueContributions), 124)}
  ${row("◆", "Public Repos", formatNum(user.repositories.totalCount), 148)}
  <text class="muted" x="25" y="178">Year contributions: ${formatNum(c.contributionCalendar.totalContributions)} · Followers: ${formatNum(user.followers.totalCount)}</text>
</svg>`;
}

export function renderLanguagesSvg(languages) {
  const width = 320;
  const rowH = 28;
  const paddingTop = 28;
  const paddingBottom = 20;
  const height = Math.max(120, paddingTop + languages.length * rowH + paddingBottom);
  const barX = 110;
  const barW = 170;

  const rows = languages
    .map((lang, i) => {
      const y = paddingTop + i * rowH;
      const color = LANG_COLORS[lang.name] || "#58a6ff";
      const w = Math.max(4, (lang.percent / 100) * barW);
      return `
    <g transform="translate(0, ${y})">
      <text class="lang" x="20" y="14">${esc(lang.name)}</text>
      <rect x="${barX}" y="4" width="${barW}" height="10" rx="5" fill="${THEME.barTrack}"/>
      <rect x="${barX}" y="4" width="${w.toFixed(1)}" height="10" rx="5" fill="${color}"/>
      <text class="pct" x="${barX + barW + 8}" y="14">${lang.percent.toFixed(1)}%</text>
    </g>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Top Languages">
  <title>Top Languages</title>
  <style>
    .title { font: 600 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${THEME.title}; }
    .lang { font: 400 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${THEME.text}; }
    .pct { font: 400 11px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${THEME.muted}; }
  </style>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8" fill="${THEME.bg}" stroke="${THEME.border}"/>
  <text class="title" x="20" y="22">Top Languages</text>
  ${rows}
</svg>`;
}

/**
 * Build a contribution-snake SVG from calendar weeks (no third-party service).
 * Snake walks chronologically over days that have contributions.
 */
export function renderSnakeSvg(calendar) {
  const cell = 12;
  const gap = 3;
  const step = cell + gap;
  const padX = 12;
  const padY = 24;
  const weeks = calendar.weeks || [];
  const cols = weeks.length;
  const rows = 7;
  const width = padX * 2 + Math.max(cols, 1) * step - gap;
  const height = padY + rows * step + 28;

  const days = [];
  weeks.forEach((week, wi) => {
    week.contributionDays.forEach((day) => {
      days.push({
        ...day,
        x: padX + wi * step,
        y: padY + day.weekday * step,
      });
    });
  });

  const cells = days
    .map((d) => {
      const level =
        d.contributionCount === 0
          ? 0
          : d.contributionCount < 3
            ? 1
            : d.contributionCount < 6
              ? 2
              : d.contributionCount < 10
                ? 3
                : 4;
      const fills = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];
      return `<rect class="c${level}" x="${d.x}" y="${d.y}" width="${cell}" height="${cell}" rx="2" fill="${fills[level]}"/>`;
    })
    .join("\n    ");

  const pathDays = days.filter((d) => d.contributionCount > 0);
  const snakePath =
    pathDays.length === 0
      ? ""
      : pathDays
          .map((d, i) => `${i === 0 ? "M" : "L"}${d.x + cell / 2},${d.y + cell / 2}`)
          .join(" ");

  const duration = Math.max(8, Math.min(40, pathDays.length * 0.08));

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Contribution snake">
  <title>Contribution snake · ${calendar.totalContributions} contributions</title>
  <style>
    text { font: 600 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: #c9d1d9; }
    .snake { fill: none; stroke: #39d353; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round;
      stroke-dasharray: 18 4200; animation: crawl ${duration}s linear infinite; }
    .head { fill: #3fb950; }
    @keyframes crawl {
      from { stroke-dashoffset: 0; }
      to { stroke-dashoffset: -4218; }
    }
  </style>
  <rect width="100%" height="100%" fill="#0d1117"/>
  <text x="${padX}" y="16">github contribution snake</text>
  <g>
    ${cells}
  </g>
  ${
    snakePath
      ? `<path class="snake" d="${snakePath}" pathLength="4200"/>
  <circle class="head" r="5">
    <animateMotion dur="${duration}s" repeatCount="indefinite" path="${snakePath}"/>
  </circle>`
      : ""
  }
</svg>`;
}

export { roundRect, THEME };
