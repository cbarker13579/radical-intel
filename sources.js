// All sources feed a single raw intelligence pool.
// Claude routes each item to the best-fit section based on content, not source.

const RSS_FEEDS = [
  // Funding & company news
  { name: "TechCrunch",         url: "https://techcrunch.com/feed/" },
  { name: "Crunchbase News",    url: "https://news.crunchbase.com/feed/" },
  { name: "Axios Pro Rata",     url: "https://www.axios.com/feeds/feed.rss" },
  { name: "Bloomberg Tech",     url: "https://feeds.bloomberg.com/technology/news.rss" },
  { name: "TLDR Tech",          url: "https://tldr.tech/api/rss/tech" },

  // AI-specific
  { name: "Ben's Bites",        url: "https://www.bensbites.com/feed" },
  { name: "MIT Tech Review",    url: "https://www.technologyreview.com/feed/" },
  { name: "Import AI",          url: "https://importai.substack.com/feed" },
  { name: "Latent Space",       url: "https://www.latent.space/feed" },
  { name: "Air Street Press",   url: "https://airstreet.substack.com/feed" },

  // VC & startup intelligence
  { name: "Newcomer",           url: "https://newcomer.substack.com/feed" },
  { name: "The Generalist",     url: "https://thegeneralist.substack.com/feed" },

  // Talent & recruiting
  { name: "Recruiting Brainfood", url: "https://recruitingbrainfood.substack.com/feed" },
  { name: "MarketWatch",          url: "https://feeds.content.dowjones.io/public/rss/mw_topstories" },

  // Comp & market data
  { name: "Pragmatic Engineer", url: "https://newsletter.pragmaticengineer.com/feed" },
  { name: "Wired",              url: "https://www.wired.com/feed/rss" },
];

// Web search queries run in addition to RSS feeds.
// Each query targets a specific signal type across the open web.
const SEARCH_QUERIES = [
  // Market Signals
  "AI startup layoffs OR \"headcount freeze\" OR acquisition site:techcrunch.com OR axios.com",
  "AI startup funding round raised million 2026",
  "tech company merger acquisition AI talent",

  // Talent Trends
  "AI executive hire departure \"joins as\" OR \"named as\" site:linkedin.com OR techcrunch.com",
  "AI lab researcher departure joins startup 2026",
  "\"team hire\" OR \"acqui-hire\" AI startup 2026",

  // Field Notes
  "AI recruiter compensation benchmark salary equity 2026",
  "recruiting sourcing trends AI startup hiring",
  "talent acquisition tools trends people ops 2026",
  "Pave OR Levels.fyi OR Carta compensation benchmark report 2026",

  // On Our Radar
  "AI startup stealth hiring OR \"quietly building\" 2026",
  "emerging AI roles skills demand 2026",
  "VC portfolio company hiring signal 2026",
];

const LOOKBACK_DAYS = {
  news: 7,       // Market Signals, Talent Trends, Field Notes
  radar: 30,     // On Our Radar — pattern recognition needs more runway
};

module.exports = { RSS_FEEDS, SEARCH_QUERIES, LOOKBACK_DAYS };
