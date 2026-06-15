function calcReadTime(digest) {
  const allText = [
    digest.lede || "",
    ...Object.values(digest.sections).flat().flatMap(item => [
      item.takeaway || "",
      item.context || "",
      item.implication || "",
    ]),
  ].join(" ");
  const words = allText.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(words / 238);
  return `${minutes} min read`;
}

function renderItem(item) {
  if (item.featured) {
    const linkLabel = item.source_title ? escapeHtml(item.source_title) : "More details here";
    const link = item.source_url
      ? `<a class="item-link" href="${item.source_url}">&rarr; ${linkLabel}</a>`
      : "";
    const crossref = item.crossref
      ? `<div class="item-crossref">→ ${escapeHtml(item.crossref)}</div>`
      : "";
    return `
    <div class="item item-featured">
      <div class="item-featured-label">Featured</div>
      <div class="item-takeaway">${escapeHtml(item.takeaway)}</div>
      <div class="item-context">${escapeHtml(item.context)}</div>
      ${link}
      ${crossref}
    </div>`;
  }

  const link = item.source_url
    ? `<a class="item-brief-link" href="${item.source_url}">&rarr; ${escapeHtml(item.source_title || "More")}</a>`
    : "";
  return `
    <div class="item item-brief">
      <span class="item-brief-bullet">&bull;</span>
      <span class="item-brief-text">${escapeHtml(item.takeaway)} ${link}</span>
    </div>`;
}

function renderLayoffTracker(items) {
  if (!items || items.length === 0) return "";
  const rows = items.map(item => `
    <div class="item item-brief">
      <span class="item-brief-bullet">&bull;</span>
      <span class="item-brief-text"><strong>${escapeHtml(item.company)}</strong> — ${escapeHtml(item.affected)}. ${escapeHtml(item.implication)} ${item.source_url ? `<a class="item-brief-link" href="${item.source_url}">&rarr; More</a>` : ""}</span>
    </div>`).join("");
  return `
    <div class="section">
      <div class="section-header">
        <div class="section-dot"></div>
        <div class="section-title">📉 Layoff Tracker</div>
      </div>
      <div class="section-body">${rows}</div>
    </div>`;
}

function renderSection(emoji, title, items) {
  if (!items || items.length === 0) return "";
  return `
    <div class="section">
      <div class="section-header">
        <div class="section-dot"></div>
        <div class="section-title">${emoji} ${title}</div>
      </div>
      <div class="section-body">
        ${items.map(renderItem).join("")}
      </div>
    </div>`;
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderEmail(digest, weekOf) {
  const { lede, sections } = digest;
  const readTime = calcReadTime(digest);

  const sectionsHtml = [
    renderSection("📈", "Market Signals",  sections.market_signals),
    renderSection("🔄", "Talent Trends",   sections.talent_trends),
    renderSection("🛠️", "Field Notes",     sections.field_notes),
    renderSection("🔭", "More From This Week", sections.on_our_radar),
    renderLayoffTracker(sections.layoff_tracker),
  ].join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>The Talent Memo — Week of ${weekOf}</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background-color: #EAEEF4;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1B2D4F;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 680px;
      margin: 32px auto;
      background: #ffffff;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(27,45,79,0.10);
    }
    .header {
      background-color: #1B2D4F;
      padding: 32px 40px 26px;
      text-align: center;
    }
    .header-eyebrow {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #E8185C;
      margin-bottom: 12px;
    }
    .header-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 36px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1;
      margin-bottom: 4px;
    }
    .header-title span { color: #E8185C; }
    .header-date {
      font-size: 11px;
      color: rgba(255,255,255,0.35);
      margin-top: 14px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .lede {
      background-color: #E8185C;
      padding: 24px 40px 26px;
    }
    .lede-label {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 10px;
      line-height: 1;
    }
    .lede-text {
      font-size: 14px;
      line-height: 1.7;
      color: rgba(255,255,255,0.92);
      font-weight: 500;
    }
    .section { margin-top: 32px; }
    .section-header {
      background-color: #1B2D4F;
      margin: 0 40px;
      padding: 10px 18px;
      border-radius: 4px 4px 0 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .section-dot {
      width: 6px;
      height: 6px;
      background-color: #E8185C;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .section-title {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #ffffff;
    }
    .section-body {
      margin: 0 40px;
      border-left: 1px solid #E8EDF5;
      border-right: 1px solid #E8EDF5;
      border-bottom: 1px solid #E8EDF5;
      border-radius: 0 0 4px 4px;
      padding: 6px 0;
    }
    .item { border-bottom: 1px solid #F0F4FA; }
    .item:last-child { border-bottom: none; }

    /* Featured item — full card */
    .item-featured { padding: 20px; }
    .item-featured-label {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #E8185C;
      margin-bottom: 6px;
    }
    .item-takeaway {
      font-size: 15px;
      font-weight: 700;
      line-height: 1.45;
      color: #1B2D4F;
      margin-bottom: 7px;
    }
    .item-context {
      font-size: 13px;
      line-height: 1.6;
      color: #5A6A85;
      font-weight: 400;
    }
    .item-link {
      display: inline-block;
      margin-top: 9px;
      font-size: 12px;
      font-weight: 600;
      color: #E8185C;
      text-decoration: none;
      letter-spacing: 0.02em;
    }
    .item-crossref {
      font-size: 12px;
      color: #8A9AB5;
      margin-top: 6px;
      font-style: italic;
    }

    /* Brief item — bullet line */
    .item-brief {
      padding: 11px 20px;
      display: flex;
      align-items: baseline;
      gap: 9px;
    }
    .item-brief-bullet {
      color: #E8185C;
      font-size: 14px;
      flex-shrink: 0;
      line-height: 1.5;
    }
    .item-brief-text {
      font-size: 13px;
      line-height: 1.55;
      color: #1B2D4F;
      font-weight: 500;
    }
    .item-brief-link {
      color: #E8185C;
      text-decoration: none;
      font-weight: 600;
      font-size: 12px;
      margin-left: 4px;
      white-space: nowrap;
    }

    .footer {
      background-color: #1B2D4F;
      margin-top: 36px;
      padding: 24px 40px;
      text-align: center;
    }
    .footer-logo {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 16px;
      font-weight: 700;
      color: rgba(255,255,255,0.7);
      margin-bottom: 8px;
    }
    .footer-logo span { color: #E8185C; }
    .footer-text {
      font-size: 11px;
      color: rgba(255,255,255,0.35);
      line-height: 1.7;
    }
    .footer-text a {
      color: rgba(255,255,255,0.45);
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">

    <div class="header">
      <div class="header-eyebrow">Talent Intelligence for the AI Era</div>
      <div class="header-title">The <span>Talent</span> Memo</div>
      <div class="header-date">Week of ${weekOf} &nbsp;&middot;&nbsp; ${readTime}</div>
    </div>

    <div class="lede">
      <div class="lede-label">This Week's TL;DR</div>
      <div class="lede-text">${escapeHtml(lede)}</div>
    </div>

    ${sectionsHtml}

    <div class="footer">
      <div class="footer-logo">The <span>Talent</span> Memo</div>
      <div class="footer-text">
        Weekly talent intelligence for the AI era<br />
        <a href="#">Unsubscribe</a>
      </div>
    </div>

  </div>
</body>
</html>`;
}

module.exports = { renderEmail };
