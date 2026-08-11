const GRAPHQL = "https://api.github.com/graphql";
const REST = "https://api.github.com";

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "gaaaroo-profile-generator",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function graphql(token, query, variables = {}) {
  const res = await fetch(GRAPHQL, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`GraphQL HTTP ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

async function rest(token, path) {
  const res = await fetch(`${REST}${path}`, { headers: headers(token) });
  if (!res.ok) {
    throw new Error(`REST ${path} → ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

const PROFILE_QUERY = `
query($login: String!) {
  user(login: $login) {
    name
    login
    bio
    followers { totalCount }
    following { totalCount }
    repositories(ownerAffiliations: OWNER, privacy: PUBLIC) { totalCount }
    contributionsCollection {
      totalCommitContributions
      totalIssueContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            contributionCount
            date
            color
            weekday
          }
        }
      }
    }
  }
}
`;

export async function fetchProfile(token, login) {
  const data = await graphql(token, PROFILE_QUERY, { login });
  if (!data.user) throw new Error(`User not found: ${login}`);
  return data.user;
}

export async function fetchLanguageStats(token, login) {
  const repos = [];
  let page = 1;
  while (page <= 10) {
    const batch = await rest(
      token,
      `/users/${login}/repos?per_page=100&page=${page}&type=owner&sort=updated`
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    repos.push(...batch.filter((r) => !r.fork && !r.archived));
    if (batch.length < 100) break;
    page += 1;
  }

  const totals = new Map();
  let scanned = 0;
  for (const repo of repos.slice(0, 40)) {
    try {
      const langs = await rest(token, `/repos/${login}/${repo.name}/languages`);
      for (const [lang, bytes] of Object.entries(langs)) {
        totals.set(lang, (totals.get(lang) || 0) + bytes);
      }
      scanned += 1;
    } catch {
      // skip repos that fail language lookup
    }
  }

  const sorted = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const sum = sorted.reduce((acc, [, n]) => acc + n, 0) || 1;

  return {
    scanned,
    languages: sorted.map(([name, bytes]) => ({
      name,
      bytes,
      percent: (bytes / sum) * 100,
    })),
  };
}
