require("dotenv").config({ path: require("path").join(__dirname, ".env"), override: true });
const Anthropic = require("@anthropic-ai/sdk");
const RSSParser = require("rss-parser");
const { Resend } = require("resend");
const { WebClient } = require("@slack/web-api");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { renderEmail } = require("./template");
const { RSS_FEEDS, SEARCH_QUERIES, LOOKBACK_DAYS } = require("./sources");

const DRY_RUN = process.argv.includes("--dry-run");
const DRAFT_MODE = process.argv.includes("--draft");
const ARCHIVE_PATH = path.join(__dirname, "archive.json");
const DRAFT_PATH = path.join(__dirname, "current-draft.json");
const RECIPIENT = "carrie@radical.vc";

const client = new Anthropic();
const parser = new RSSParser({ timeout: 8000 });

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

// ─── Feed fetching ────────────────────────────────────────────────────────────

async function fetchRSSFeeds(archive) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS.news);

  const items = [];

  await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feed.url);
        for (const item of parsed.items || []) {
          const pubDate = item.pubDate ? new Date(item.pubDate) : null;
          if (pubDate && pubDate < cutoff) continue;
          if (item.link && archive.has(item.link)) continue;
          items.push({
            source: feed.name,
            title: item.title?.trim() || "",
            summary: (item.contentSnippet || item.content || "").slice(0, 600).trim(),
            url: item.link || "",
            date: pubDate?.toISOString().split("T")[0] || "",
          });
        }
      } catch {
        console.warn(`[skip] RSS failed: ${feed.name}`);
      }
    })
  );

  return items;
}

// ─── Claude calls ─────────────────────────────────────────────────────────────

async function generateDigest(rawItems) {
  const itemsText = rawItems
    .map((i) => `SOURCE: ${i.source}\nTITLE: ${i.title}\nSUMMARY: ${i.summary}\nURL: ${i.url}`)
    .join("\n\n---\n\n");

  const systemPrompt = `You are the editor of The Talent Memo, a weekly intelligence briefing for VC talent partners, startup recruiters, and people ops leaders at AI companies.

Your editorial north star: every item must be helpful, relevant, and include a clear talent implication — what should the reader do or think differently because of this?

SECTIONS:
1. Market Signals — funding, headcount freezes, M&A with talent implications
2. Talent Trends — exec moves, team hires, departure patterns, skillset demand shifts
3. Field Notes — comp data, sourcing tactics, market shifts affecting how recruiters work
4. On Our Radar — forward-looking pattern recognition: emerging role types, companies quietly building, early signals worth watching
5. Layoff Tracker — OPTIONAL. Only include this section if there are actual layoffs at AI/tech companies this week. Format: company name, number affected, and one-line talent implication. If there are no notable layoffs, omit this section entirely (return empty array).

RULES:
- Read all items and route each to the best-fit section based on content, not source
- Each story appears ONCE in the section where it creates the most value
- Exception: if a story genuinely serves two sections, include it fully in the best-fit section and add one cross-reference line in the second: "→ See also in [Section]: [one-sentence angle]"
- FOCUS: This newsletter is for a VC firm investing in AI-native and applied AI companies. Relevant companies include: AI labs (Anthropic, OpenAI, DeepMind, Mistral, etc.), big tech (NVIDIA, Meta, Microsoft, Google, Apple, Amazon, Stripe, Netflix, Coinbase, X, etc.), AI-native startups, applied AI companies, frontier research labs, and VC firms. Layoffs at major tech companies (even non-AI ones like crypto, fintech, or consumer tech) are relevant because they signal a candidate pool — include them in the Layoff Tracker with the implication framed as a recruiting opportunity. Non-tech company layoffs (airlines, retail, healthcare, traditional finance, media) should be skipped entirely even if large.
- Do NOT use markdown formatting (no **bold**, no _italics_) anywhere in the JSON output. Plain text only.
- Skip anything without a clear talent implication — no filler, no general industry news
- The talent implication must be directly relevant to the reader's work: sourcing candidates, advising portfolio companies on hiring, understanding the AI talent market. "This will create roles at large enterprises or PE-backed firms" is NOT a relevant implication — the audience does not recruit for those companies.
- Skip tool/platform feature announcements unless they meaningfully change how recruiters work
- Voice: write like a tech-savvy talent advisor talking to a peer. Direct, specific, a little dry. Not corporate, not hype, not AI-sounding. No em dashes. No "it's worth noting." No "this signals that." Just say the thing.
- Takeaways must be short — one punchy sentence under 20 words. Lead with the so-what, not the news.
- On Our Radar items should be forward-looking inferences and pattern recognition, not just more news
- Aim for 10-12 items total across all sections. Quality over quantity — if the week is slow, 8 strong items beats 14 weak ones. Distribute across sections naturally but do not pad.
- Mark exactly 2 items across the entire digest as featured: true — the biggest, most impactful stories this week with the clearest talent implications. All other items must have featured: false.
- Featured items get a full context paragraph. Non-featured items must have NO context field — takeaway only.
- Each item MUST include the source URL

ITEM FORMAT (JSON):
Each item must have:
- "takeaway": one punchy sentence under 20 words. The so-what for a recruiter. No em dashes. No "this signals that." Just say it.
- "context": 2-3 sentences of key facts and talent implication. ONLY include this field for featured: true items. Omit entirely for featured: false items.
- "featured": true for the 2 most impactful stories this week, false for all others
- "source_name": publication name
- "source_title": the original article title. If over 60 characters, truncate to the first 55 chars and add "...". If there is no clear title, use null.
- "source_url": full URL

Return a JSON object with this exact structure:
{
  "lede": "1-2 sentences. Sound like a person who follows this space closely, not a newsletter. Specific, no em dashes, no hype. Tease the 2-3 biggest themes, close with a short talent angle like 'here is what it means for your pipeline' or 'the hiring implications are real', then end with: Full intel below",
  "sections": {
    "market_signals": [ { "takeaway": "...", "context": "only if featured", "featured": false, "source_name": "...", "source_title": "...", "source_url": "..." } ],
    "talent_trends":  [ { "takeaway": "...", "context": "only if featured", "featured": false, "source_name": "...", "source_title": "...", "source_url": "...", "crossref": "optional" } ],
    "field_notes":    [ { "takeaway": "...", "context": "only if featured", "featured": false, "source_name": "...", "source_title": "...", "source_url": "..." } ],
    "on_our_radar":   [ { "takeaway": "...", "context": "only if featured", "featured": false, "source_name": "...", "source_title": "...", "source_url": "..." } ],
    "layoff_tracker": [ { "company": "...", "affected": "e.g. ~200 roles", "implication": "one-line talent angle", "source_url": "..." } ]
  }
}

If a section has no strong items this week, return an empty array for it — do not pad with weak stories.`;

  console.log(`[claude] Sending ${rawItems.length} raw items for editorial processing...`);

  let response;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Here are this week's raw intelligence items. Process them into The Talent Memo digest.\n\n${itemsText}`,
          },
        ],
      });
      break;
    } catch (err) {
      if (err.status === 429 && attempt < 3) {
        const wait = attempt * 60000;
        console.log(`[claude] Rate limited — retrying in ${wait / 1000}s (attempt ${attempt}/3)...`);
        await new Promise(r => setTimeout(r, wait));
      } else {
        throw err;
      }
    }
  }

  const text = response.content[0].text;

  // Extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude did not return valid JSON");
  return JSON.parse(jsonMatch[0]);
}

// ─── Draft banner ─────────────────────────────────────────────────────────────

function addDraftBanner(html) {
  const banner = `
    <div style="background-color:#F59E0B;padding:16px 40px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
      <div style="font-size:11px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;color:#1B2D4F;">
        Draft — Not Yet Sent
      </div>
      <div style="font-size:11px;color:#1B2D4F;margin-top:5px;opacity:0.75;">
        To edit: open Claude Code and ask to update current-draft.json, then push to GitHub.<br/>
        To send: GitHub Actions &rarr; Send Talent Memo &rarr; Run workflow
      </div>
    </div>`;
  return html.replace('<div class="header">', banner + '\n    <div class="header">');
}

// ─── Email sending ────────────────────────────────────────────────────────────

async function sendEmail(html, subject, pdfPath) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const attachments = pdfPath && fs.existsSync(pdfPath)
    ? [{ filename: path.basename(pdfPath), content: fs.readFileSync(pdfPath) }]
    : [];

  await resend.emails.send({
    from: "The Talent Memo <onboarding@resend.dev>",
    to: RECIPIENT,
    subject,
    html,
    attachments,
  });

  console.log(`[email] Sent to ${RECIPIENT}`);
}

// ─── PDF generation ──────────────────────────────────────────────────────────

async function generatePDF(html, outputPath) {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true,
    margin: { top: "20px", bottom: "20px", left: "0", right: "0" },
  });
  await browser.close();
  console.log(`[pdf] Saved to ${path.basename(outputPath)}`);
}

// ─── Slack posting ────────────────────────────────────────────────────────────

async function postToSlack(digest, weekOf, pdfPath) {
  const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

  // Find Carrie's Slack user ID from her email
  const userRes = await slack.users.lookupByEmail({ email: RECIPIENT });
  const userId = userRes.user.id;

  // Open DM channel
  const dmRes = await slack.conversations.open({ users: userId });
  const channelId = dmRes.channel.id;

  // Build Block Kit message
  const sectionNames = {
    market_signals: "📈 Market Signals",
    talent_trends:  "🔄 Talent Trends",
    field_notes:    "🛠️ Field Notes",
    on_our_radar:   "🔭 On Our Radar",
    layoff_tracker: "📉 Layoff Tracker",
  };

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: `The Talent Memo — Week of ${weekOf}` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `_${digest.lede}_` },
    },
    { type: "divider" },
  ];

  for (const [key, items] of Object.entries(digest.sections)) {
    if (!items || items.length === 0) continue;
    const title = sectionNames[key] || key;
    const bullets = key === "layoff_tracker"
      ? items.map(i => `• *${i.company}* — ${i.affected}. ${i.implication}`).join("\n")
      : items.map(i => `• *${i.takeaway}* ${i.source_url ? `<${i.source_url}|↗>` : ""}`).join("\n");

    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*${title}*\n${bullets}` },
    });
    blocks.push({ type: "divider" });
  }

  await slack.chat.postMessage({ channel: channelId, blocks, text: `The Talent Memo — Week of ${weekOf}` });
  console.log(`[slack] Message sent to ${RECIPIENT}`);

  // Upload PDF
  if (pdfPath && fs.existsSync(pdfPath)) {
    await slack.filesUploadV2({
      channel_id: channelId,
      file: fs.createReadStream(pdfPath),
      filename: path.basename(pdfPath),
      title: `The Talent Memo — Week of ${weekOf}`,
    });
    console.log(`[slack] PDF uploaded`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const modeLabel = DRY_RUN ? "DRY RUN" : DRAFT_MODE ? "DRAFT" : "generating...";
  console.log(`\n🗞  The Talent Memo — ${modeLabel}\n`);

  const archive = loadArchive();

  // 1. Fetch RSS feeds
  console.log("[fetch] Pulling RSS feeds...");
  const rssItems = await fetchRSSFeeds(archive);
  // Log items per source so you can see which feeds are contributing
  const bySource = rssItems.reduce((acc, i) => { acc[i.source] = (acc[i.source] || 0) + 1; return acc; }, {});
  Object.entries(bySource).sort((a,b) => b[1]-a[1]).forEach(([src, n]) => console.log(`  ${n} items — ${src}`));
  console.log(`[fetch] ${rssItems.length} new items from RSS`);

  if (rssItems.length === 0) {
    console.log("[done] No new items found. Nothing to send.");
    return;
  }

  // 2. Claude editorial pass
  const digest = await generateDigest(rssItems);

  // 3. Render HTML
  const weekOf = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const html = renderEmail(digest, weekOf);

  // 4. Draft mode — save draft JSON and send preview email
  if (DRAFT_MODE) {
    fs.writeFileSync(DRAFT_PATH, JSON.stringify({ weekOf, digest }, null, 2));
    console.log(`[draft] Saved to current-draft.json`);

    const draftHtml = addDraftBanner(html);
    await sendEmail(draftHtml, `DRAFT: The Talent Memo — Week of ${weekOf}`, null);

    const totalItems = Object.values(digest.sections).reduce((n, s) => n + s.length, 0);
    console.log(`\n✓ Draft ready — ${totalItems} items across sections`);
    console.log(`  Review the preview email, edit current-draft.json if needed,`);
    console.log(`  then trigger "Send Talent Memo" in GitHub Actions.`);
    return;
  }

  // 5. Dry run — print and exit
  if (DRY_RUN) {
    const previewPath = path.join(__dirname, "last-dry-run.html");
    fs.writeFileSync(previewPath, html);
    console.log(`\n[dry-run] Email HTML written to: last-dry-run.html`);
    console.log("\n── DIGEST SUMMARY ──");
    console.log(`Lede: ${digest.lede}`);
    for (const [section, items] of Object.entries(digest.sections)) {
      console.log(`\n${section}: ${items.length} items`);
      items.forEach((item) => console.log(`  • ${(item.takeaway || `${item.company} — ${item.affected}`).slice(0, 80)}...`));
    }
    return;
  }

  // 6. Generate PDF
  const pdfPath = path.join(__dirname, `talent-memo-${weekOf.replace(/[, ]+/g, "-")}.pdf`);
  await generatePDF(html, pdfPath);

  // 7. Send email with PDF attached
  const subject = `The Talent Memo — Week of ${weekOf}`;
  await sendEmail(html, subject, pdfPath);

  // 8. Post to Slack (DM + PDF) if token is configured
  if (process.env.SLACK_BOT_TOKEN) {
    await postToSlack(digest, weekOf, pdfPath);
  } else {
    console.log("[slack] Skipped — set SLACK_BOT_TOKEN in .env to enable");
  }

  // 9. Archive sent URLs
  const sentUrls = Object.values(digest.sections)
    .flat()
    .map((item) => item.source_url)
    .filter(Boolean);
  saveArchive(archive, sentUrls);

  const totalItems = Object.values(digest.sections).reduce((n, s) => n + s.length, 0);
  console.log(`\n✓ Done — ${totalItems} items across 4 sections`);
}

main().catch((err) => {
  console.error("[error]", err.message);
  process.exit(1);
});
