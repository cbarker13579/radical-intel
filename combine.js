require("dotenv").config({ path: require("path").join(__dirname, ".env"), override: true });
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const { Resend } = require("resend");
const { renderEmail } = require("./template");

const RECIPIENT = "carrie@radical.vc";
const weekOf = "May 5, 2026";

const digest = {
  lede: "Coinbase just handed the market 700 crypto-fintech engineers, Google DeepMind workers voted to unionize over military AI, and the Musk v. Altman trial is producing real disclosures about OpenAI's internal dynamics. Meanwhile the government-to-AI-lab pipeline is accelerating on two fronts — former NASA head Bridenstine is joining a defense startup, and Anthropic is effectively becoming a federal contractor. The hiring implications across security clearances, enterprise AI, and the emerging cyber+AI vertical are real. Full intel below.",

  sections: {
    market_signals: [
      {
        takeaway: "April VC funding hit $56B, doubling YoY — AI rounds are inflating headcount expectations at portfolio companies.",
        context: "Global venture funding reached $56 billion in April, the third-largest monthly total in the past year, driven almost entirely by a handful of large AI rounds. Roughly half of all new unicorns since 2024 are AI-focused, and many reached that status faster than any prior cohort.",
        source_title: "Billion-Dollar AI Rounds Push April To Third-Highest...",
        source_url: "https://news.crunchbase.com/venture/global-startup-funding-april-2026-anthropic-jeff-bezos-project-prometheus-biggest-deals/",
      },
      {
        takeaway: "Anthropic is effectively becoming a government contractor — watch for cleared AI roles to multiply fast.",
        context: "The White House is pulling Anthropic back into the government fold after months of Pentagon friction, driven by models too powerful to ignore. Anthropic's Mythos model is being withheld from public release, and Google, Microsoft, and xAI have agreed to give the US government early model access for evaluation. This creates immediate demand for AI engineers and policy roles with security clearance eligibility at frontier labs.",
        source_title: "Washington has a new Anthropic problem",
        source_url: "https://www.axios.com/2026/04/29/trump-anthropic-pentagon-ai-executive-order-gov",
      },
      {
        takeaway: "Alphabet is raising billions in debt to fund AI buildout — headcount growth at Google DeepMind and infra teams is not slowing.",
        context: "Alphabet issued its largest-ever euro-denominated bond, continuing a pattern of record debt issuance to fund AI infrastructure. Jamie Dimon stood next to Dario Amodei and publicly endorsed the trillion-dollar AI capex wave. For recruiters, this signals sustained hiring demand at hyperscalers and their infrastructure suppliers through at least 2027.",
        source_title: "Alphabet Returns to Euro Debt Market for Latest...",
        source_url: "https://www.bloomberg.com/news/articles/2026-05-05/alphabet-returns-to-euro-debt-market-for-latest-ai-push",
      },
      {
        takeaway: "Meta's $13B data center debt deal signals the infrastructure hiring wave is not slowing down.",
        context: "Meta is working on a roughly $13 billion financing package for a data center in El Paso, Texas, underscoring big tech's growing reliance on debt to fund AI infrastructure. Roles in data center operations, power infrastructure, and ML infrastructure engineering remain a durable hiring theme across hyperscalers and their suppliers.",
        source_title: "Meta Taps Morgan Stanley, JPMorgan for New Data...",
        source_url: "https://www.bloomberg.com/news/articles/2026-05-05/meta-taps-morgan-stanley-jpmorgan-for-new-data-center",
      },
      {
        takeaway: "ElevenLabs at $500M ARR with BlackRock on the cap table means voice AI is exiting the early-startup talent playbook.",
        context: "ElevenLabs disclosed $500M ARR alongside a new investor roster that includes BlackRock, Nvidia, Jamie Foxx, and Eva Longoria. The enterprise footprint is expanding fast, which typically precedes a significant ramp in go-to-market, customer success, and enterprise sales hiring.",
        source_title: "ElevenLabs lists BlackRock, Jamie Foxx, and Eva...",
        source_url: "https://techcrunch.com/2026/05/05/elevenlabs-lists-blackrock-jamie-foxx-and-eva-longoria-as-new-investors/",
      },
    ],

    talent_trends: [
      {
        takeaway: "The Musk v. Altman trial is surfacing internal OpenAI tensions and missed targets — watch for senior departures in the next 90 days.",
        context: "Week one of the Oakland trial included testimony from Musk and revelations that OpenAI missed its own user and revenue targets. Musk also admitted on the stand that xAI distills OpenAI models, adding public friction between the two organizations. When a high-profile company's governance and performance get this much courtroom exposure, executive retention risk goes up.",
        source_title: "Musk v. Altman week 1: Elon Musk says he was du...",
        source_url: "https://www.wired.com/story/greg-brockman-testifies-musk-v-altman-trial/",
      },
      {
        takeaway: "Google DeepMind UK staff voted to unionize over military AI — expect this to surface in candidate conversations at other labs.",
        context: "UK employees of Google DeepMind voted to unionize, specifically citing opposition to the company's AI models being used in military applications. This is the first major union push at a frontier AI lab in the UK, and it reflects a growing values-alignment fault line that is showing up in recruiting conversations across the industry.",
        source_title: "Google DeepMind Workers Vote to Unionize Over Milita...",
        source_url: "https://www.wired.com/story/google-deepmind-workers-vote-to-unionize-over-military-ai-deals/",
      },
      {
        takeaway: "Lambda AI named a telecom CEO to lead it — a deliberate enterprise-credibility hire ahead of a likely scale-up.",
        context: "Lambda, the Nvidia-backed AI cloud provider, named Michel Combes, former CEO of Sprint, as its new CEO as part of a management overhaul. The choice of a large-enterprise operator over a startup or AI-native exec signals Lambda is prioritizing revenue operations and institutional sales muscle over technical leadership at the top.",
        source_title: "AI Cloud Provider Lambda Taps Former Sprint CEO...",
        source_url: "https://www.bloomberg.com/news/articles/2026-05-05/ai-cloud-provider-lambda-taps-former-sprint-ceo-as-new-leader",
      },
      {
        takeaway: "Former NASA administrator joining a defense space startup is a preview of the government-to-deeptech exec pipeline accelerating.",
        context: "Jim Bridenstine, former Trump-era NASA head, is joining Quantum Space as CEO. The company develops maneuverable spacecraft for defense missions. This pattern — senior government and agency leaders moving into AI-adjacent deeptech startups — is worth tracking as a sourcing channel for portfolio companies in defense tech and space.",
        source_title: "Former Trump NASA Head Bridenstine to Lead Start...",
        source_url: "https://www.bloomberg.com/news/articles/2026-05-05/former-trump-nasa-head-bridenstine-to-lead-startup-quantum-space",
      },
      {
        takeaway: "NSF board firings are pushing top research scientists toward private labs — this is a genuine sourcing opportunity right now.",
        context: "All 22 members of the National Science Foundation's board were fired in a single week, adding to a broader pattern of federal science defunding. Researchers who built careers around federal grants are now actively exploring industry roles, and frontier AI labs and well-funded applied AI startups are the most natural landing spots.",
        source_title: "Trump's mass firing just dealt another blow to A...",
        source_url: "https://www.technologyreview.com/2026/05/01/1136722/mass-firing-trump-fresh-blow-american-science-nsf-nsb/",
      },
    ],

    field_notes: [
      {
        takeaway: "Jensen Huang publicly pushing the 'AI creates jobs' narrative will make candidate conversations about AI displacement easier — use it.",
        context: "Nvidia CEO Jensen Huang said at a public event that AI is 'creating an enormous number of jobs' and pushed back on claims about AI's job-killing potential. Separately, Apollo's chief economist drew a parallel to post-WTO China integration, arguing net job creation is likely. When the most prominent voice in AI infrastructure is on record with this framing, it gives recruiters and hiring managers a credible counterpoint when candidates raise displacement concerns.",
        source_title: "Nvidia's Jensen Huang says AI is creating an e...",
        source_url: "https://techcrunch.com/2026/05/04/as-workers-worry-about-ai-nvidias-jensen-huang-says-ai-is-creating-an-enormous-number-of-jobs/",
      },
      {
        takeaway: "AI-driven screening tools may be silently killing strong candidates — worth auditing your ATS and any automated layers.",
        context: "A Wired investigation followed a medical student who spent six months determining whether an AI screening algorithm rejected his job application without human review. Opaque automated filtering is now a real candidate experience and legal risk, particularly as more companies layer AI into early-funnel hiring.",
        source_title: "He Couldn't Land a Job Interview. Was AI to Blame?",
        source_url: "https://www.wired.com/story/he-couldnt-land-a-job-interview-was-ai-to-blame/",
      },
      {
        takeaway: "GitHub Copilot's price hike is a live signal: AI dev tools are repricing, and eng comp benchmarks need to account for tooling costs.",
        context: "GitHub Copilot has raised prices significantly, with Anthropic also drawing criticism for moves that frustrated developers. As AI coding tools become standard infrastructure, companies that don't cover these costs in comp packages or tooling budgets risk losing engineers who will factor it into their total comp math.",
        source_title: "The Pulse: AI load breaks GitHub",
        source_url: "https://newsletter.pragmaticengineer.com/p/the-pulse-github-breaks",
      },
    ],

    on_our_radar: [
      {
        takeaway: "Cyber + AI is becoming its own hiring vertical — demand for people who can work at that intersection is about to spike hard.",
        context: "Air Street's May 2026 State of AI highlights the cyber threshold as a defining theme, and US Cyber Command is building model-agnostic AI infrastructure specifically to deploy the most powerful cyber-capable models available. The White House is simultaneously preparing to gate access to models with advanced cyber capabilities. Expect a new category of roles combining AI engineering with security clearance and offensive/defensive cyber expertise to emerge at frontier labs, government contractors, and defense-adjacent startups over the next 12 months.",
        source_title: "State of AI: May 2026",
        source_url: "https://press.airstreet.com/p/state-of-ai-may-2026",
      },
      {
        takeaway: "Inference infrastructure is becoming the next hiring battleground — the teams that run models in production are now as strategic as the teams that build them.",
        context: "Latent Space's 'Inference Inflection' piece tracks the growing strategic weight of inference-time compute and the operational complexity it creates. As labs and applied AI companies shift from training-centric to inference-centric architectures, demand for ML infrastructure engineers and inference optimization specialists is quietly outpacing demand for model researchers at the applied layer.",
        source_title: "[AINews] The Inference Inflection",
        source_url: "https://www.latent.space/p/ainews-inference-inflection",
      },
      {
        takeaway: "Image AI is driving app growth more than chatbots — watch for a hiring surge in multimodal product and engineering roles at AI-native consumer startups.",
        context: "Appfigures data shows visual model launches generate 6.5x more app downloads than chatbot upgrades, though most fail to convert that spike into revenue. The implication for AI-native consumer companies is that the product and monetization talent gap around multimodal features is real — and will drive targeted hiring for product managers and growth engineers who have shipped visual AI features at scale.",
        source_title: "Image AI models now drive app growth, beating ch...",
        source_url: "",
      },
      {
        takeaway: "AI model governance is becoming a real function — expect dedicated policy and safety roles at frontier labs to multiply fast.",
        context: "The combination of Anthropic's withheld Mythos model, Google and Microsoft agreeing to government pre-release access, and Cyber Command building vendor-agnostic AI infrastructure all point to a new layer of institutional AI oversight forming in real time. Labs that aren't already building out government relations, AI safety policy, and red-team functions are behind.",
        source_title: "Google, Microsoft to Give US Agency Early Access...",
        source_url: "https://www.bloomberg.com/news/articles/2026-05-05/ai-firms-agree-to-give-us-early-access-to-evaluate-their-models",
      },
      {
        takeaway: "Intel's Apple chip partnership talks and QuantWare investment suggest Intel is quietly rebuilding as a talent destination worth watching.",
        context: "Apple has held exploratory talks about using Intel to produce main device processors in the US, and Intel Capital led a 178 million euro round in Dutch quantum computing chip startup QuantWare. After years of being a net exporter of chip talent, Intel is making moves that could reactivate its ability to attract hardware and quantum engineers — and pull candidates away from NVIDIA and AMD pipelines.",
        source_title: "Apple Explores Using Intel and Samsung to Build M...",
        source_url: "",
      },
    ],

    layoff_tracker: [
      {
        company: "Coinbase",
        affected: "~700 roles (14% of workforce)",
        implication: "Large pool of crypto-native engineers, product managers, and compliance talent entering the market — strong fit for AI-native fintech and infrastructure startups that need people who've built at scale under regulatory scrutiny.",
        source_url: "https://techcrunch.com/2026/05/05/coinbase-to-lay-off-14-of-staff-as-part-of-broader-restructuring/",
      },
    ],
  },
};

async function main() {
  const html = renderEmail(digest, weekOf);

  // Save HTML
  fs.writeFileSync(path.join(__dirname, "combined-memo.html"), html);
  console.log("[html] Saved to combined-memo.html");

  // Generate PDF
  const pdfPath = path.join(__dirname, "talent-memo-May-5-2026-final.pdf");
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
  console.log("[pdf] Saved to talent-memo-May-5-2026-final.pdf");

  // Send email with PDF attached
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "The Talent Memo <onboarding@resend.dev>",
    to: RECIPIENT,
    subject: `The Talent Memo — Week of ${weekOf}`,
    html,
    attachments: [{ filename: "talent-memo-May-5-2026.pdf", content: fs.readFileSync(pdfPath) }],
  });
  console.log(`[email] Sent to ${RECIPIENT}`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
