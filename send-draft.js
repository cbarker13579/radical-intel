require("dotenv").config({ path: require("path").join(__dirname, ".env"), override: true });
const { Resend } = require("resend");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { renderEmail } = require("./template");

const DRAFT_PATH = path.join(__dirname, "current-draft.json");
const ARCHIVE_PATH = path.join(__dirname, "archive.json");
const RECIPIENT = "carrie@radical.vc";

// ─── Archive helpers ──────────────────────────────────────────────────────────

function loadArchive() {
  if (!fs.existsSync(ARCHIVE_PATH)) return new Set();
  const data = JSON.parse(fs.readFileSync(ARCHIVE_PATH, "utf8"));
  return new Set(data.urls || []);
}

function saveArchive(archive, newUrls) {
  const updated = [...archive, ...newUrls];
  fs.writeFileSync(ARCHIVE_PATH, JSON.stringify({ urls: updated }, null, 2));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(DRAFT_PATH)) {
    console.error("[error] No current-draft.json found. Run generate.js --draft first.");
    process.exit(1);
  }

  const { weekOf, digest } = JSON.parse(fs.readFileSync(DRAFT_PATH, "utf8"));
  console.log(`\n🗞  Sending The Talent Memo — Week of ${weekOf}\n`);

  // Render final HTML (no draft banner)
  const html = renderEmail(digest, weekOf);

  // Generate PDF
  const pdfPath = path.join(__dirname, `talent-memo-${weekOf.replace(/[, ]+/g, "-")}.pdf`);
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "20px", bottom: "20px", left: "0", right: "0" },
  });
  await browser.close();
  console.log(`[pdf] Saved to ${path.basename(pdfPath)}`);

  // Send email with PDF
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "The Talent Memo <onboarding@resend.dev>",
    to: RECIPIENT,
    subject: `The Talent Memo — Week of ${weekOf}`,
    html,
    attachments: [{ filename: path.basename(pdfPath), content: fs.readFileSync(pdfPath) }],
  });
  console.log(`[email] Sent to ${RECIPIENT}`);

  // Archive URLs so next week's draft deduplicates correctly
  const archive = loadArchive();
  const sentUrls = Object.values(digest.sections)
    .flat()
    .map((item) => item.source_url)
    .filter(Boolean);
  saveArchive(archive, sentUrls);
  console.log(`[archive] ${sentUrls.length} URLs archived`);

  const totalItems = Object.values(digest.sections).reduce((n, s) => n + s.length, 0);
  console.log(`\n✓ Done — ${totalItems} items sent`);
}

main().catch((err) => {
  console.error("[error]", err.message);
  process.exit(1);
});
