const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;
const BRANCH = process.env.GITHUB_BRANCH || "main";
const TOKEN = process.env.GITHUB_TOKEN;
const DATA_PATH = process.env.GITHUB_DATA_PATH || "data/entries.json";

function assertConfig() {
  const missing = [];
  if (!OWNER) missing.push("GITHUB_OWNER");
  if (!REPO) missing.push("GITHUB_REPO");
  if (!TOKEN) missing.push("GITHUB_TOKEN");
  if (missing.length) {
    throw new Error(
      `Konfigurasi belum lengkap di Environment Variables Vercel: ${missing.join(", ")}`
    );
  }
}

function apiUrl() {
  return `https://api.github.com/repos/${OWNER}/${REPO}/contents/${DATA_PATH}`;
}

async function githubFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
}

// Reads the JSON file from GitHub. Returns { data, sha }.
// If the file doesn't exist yet, returns { data: {}, sha: null } so it can be created on first save.
export async function readEntries() {
  assertConfig();
  const res = await githubFetch(`${apiUrl()}?ref=${BRANCH}`);
  if (res.status === 404) {
    return { data: {}, sha: null };
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gagal membaca data dari GitHub (${res.status}): ${text}`);
  }
  const json = await res.json();
  const content = Buffer.from(json.content, "base64").toString("utf-8");
  let data = {};
  try {
    data = JSON.parse(content || "{}");
  } catch (e) {
    data = {};
  }
  return { data, sha: json.sha };
}

// Writes the full entries object back as a commit to the GitHub repo.
export async function writeEntries(data, sha, message) {
  assertConfig();
  const body = {
    message: message || "Update entries.json",
    content: Buffer.from(JSON.stringify(data, null, 2)).toString("base64"),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  const res = await githubFetch(apiUrl(), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gagal menyimpan data ke GitHub (${res.status}): ${text}`);
  }
  return res.json();
}
