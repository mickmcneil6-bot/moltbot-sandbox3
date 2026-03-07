import { useState, useRef, useCallback } from "react";

// ─── BRAND ───
const T = {
  bg: "#08080E", surface: "#0F0F1A", card: "#13131F", elevated: "#1A1A2A",
  border: "#252535", borderBright: "#353550",
  purple: "#7E5DB8", purpleDeep: "#6D48A8", purpleFaint: "#7E5DB812",
  purpleGlow: "#7E5DB830",
  ink: "#E8E6F0", steel: "#8A88A8", muted: "#4A4860",
  green: "#10B981", greenFaint: "#10B98115",
  amber: "#F59E0B", amberFaint: "#F59E0B15",
  red: "#EF4444", redFaint: "#EF444415",
  blue: "#3B82F6", blueFaint: "#3B82F615",
  cyan: "#06B6D4",
};

// ─── DELIVERABLES ───
const DELIVERABLES = [
  { id: "master-sales-deck", label: "Master Sales Deck", milestone: "M1", format: "PPTX", priority: "P1", desc: "20–25 slides, OS framework, modular by vertical" },
  { id: "investor-deck", label: "Investor Deck", milestone: "M1", format: "PPTX", priority: "P1", desc: "18-section structure, visual build required" },
  { id: "discovery-playbook", label: "Discovery Call Playbook", milestone: "M1", format: "DOCX", priority: "P1", desc: "AE enablement: questions, objections, demo script" },
  { id: "sow-template", label: "SOW / Proposal Template", milestone: "M1", format: "DOCX", priority: "P1", desc: "Procurement-ready, OS activation scope" },
  { id: "legal-templates", label: "MSA / DPA Legal Templates", milestone: "M1", format: "DOCX", priority: "P1", desc: "Deal blockers for first customer" },
  { id: "wwt-briefing", label: "WWT Partner Briefing v3", milestone: "M1", format: "DOCX", priority: "P1", desc: "Reframe: OS + Three Questions + Trust Architecture" },
  { id: "vertical-sheets", label: "Vertical Sheets (FS, Pharma, Telecoms)", milestone: "M2", format: "PDF×3", priority: "P2", desc: "Industry-specific one-pagers" },
  { id: "slt-deck", label: "SLT Onboarding Deck v2", milestone: "M2", format: "PPTX", priority: "P1", desc: "Update 33 slides to OS framework" },
  { id: "website-v2", label: "Website v2", milestone: "M2", format: "HTML", priority: "P1", desc: "OS messaging, Trust Architecture, Three Questions" },
  { id: "account-onepagers", label: "Account One-Pagers (×10)", milestone: "M2", format: "PDF×10", priority: "P1", desc: "Reframe from Clarity/Govern to OS + Trust Architecture" },
  { id: "roi-calculator", label: "ROI Calculator", milestone: "M3", format: "XLSX/JSX", priority: "P2", desc: "Customer-facing, maps to cost model" },
  { id: "journey-map", label: "Customer Journey Map v2", milestone: "M3", format: "JSX", priority: "P2", desc: "Three Questions framework, replaces old pipeline" },
];

// ─── AGENTS ───
const AGENTS = [
  {
    id: "orchestrator",
    name: "Orchestrator",
    role: "Swarm Commander",
    icon: "◈",
    color: T.purple,
    description: "Breaks down deliverables, coordinates the swarm, synthesises final output",
    systemPrompt: `You are the Orchestrator for the /deliverance.ai swarm. You coordinate specialist agents to produce enterprise-grade assets.

DELIVERABLE CONTEXT will be provided. Your job in ROUND 1: produce a detailed content brief (sections, key messages, proof points, structure) for the specialist agents to execute.

CORE FRAMEWORK (always apply):
- Platform: Three OS Functions — Manage Resources / Enforce Policy / Run Workloads
- Engagement: Three Questions — Where Are We? / How Do We Get There? / How Do We Stay Ahead?
- Phases: Activate (4wk) → Produce (12–16wk) → Compound (ongoing)
- Trust Architecture: 10 commitments, foundational layer
- ARMOR: Security By AI / Security Of AI / Security Of AI Usage
- Proof point: Order-to-Quote: £630/2–5 days → £0.07/90 seconds
- Target: WWT (primary), Pharma, FS, Telecoms, GSIs
- NEVER use: Assess/Deploy/Operate, Clarity/Govern/Accelerate, NewCo AI

Your final synthesis (ROUND 4): compile all agent inputs into a coherent, polished document structure. Be specific, actionable, enterprise-grade.`
  },
  {
    id: "content-writer",
    name: "Content Writer",
    role: "Senior Copywriter",
    icon: "✦",
    color: T.blue,
    description: "Drafts all narrative content, headlines, and body copy",
    systemPrompt: `You are the Content Writer for /deliverance.ai — an enterprise AI Operating System.

Write in the voice: confident, direct, enterprise-grade. No fluff. Every sentence earns its place.
Use // eyebrow markers for section labels. Use /deliverance.ai wordmark treatment.

FRAMEWORK (mandatory):
- Three OS Functions: Manage Resources / Enforce Policy / Run Workloads
- Three Questions journey: Where Are We? / How Do We Get There? / How Do We Stay Ahead?
- Phases: Activate → Produce → Compound
- Key differentiator: "The production layer between infrastructure and applications"
- Never a framework or tool — always an Operating System

PROOF POINTS TO USE:
- Order-to-Quote: £630 cost, 2–5 days → £0.07 cost, 90 seconds
- 4 agents, 3 domains (Sales, Finance, Legal), HITL approval gates
- 48 production agents, 11 domains
- At scale: £21M annual saving for a GSI processing 3,000 quotes/month
- EU AI Act enforcement: August 2026

Write the draft content for the deliverable based on the Orchestrator's brief.`
  },
  {
    id: "brand-guardian",
    name: "Brand Guardian",
    role: "Brand & Positioning Auditor",
    icon: "⬡",
    color: T.amber,
    description: "Audits every output for brand compliance, flags deprecated terms",
    systemPrompt: `You are the Brand Guardian for /deliverance.ai. Your job is to audit the Content Writer's draft and correct any brand, positioning, or framework violations.

BRAND SYSTEM:
- Accent: #7E5DB8 (purple), Midnight: #0F172A
- Fonts: DM Sans (body), Instrument Sans (headings)
- Wordmark: /deliverance.ai (always with forward slash)
- Section markers: // style eyebrows
- Tone: Confident, precise, no buzzwords, no fluff

BANNED TERMS (flag and replace every instance):
❌ "Assess / Deploy / Operate" → ✅ Three Questions journey
❌ "Clarity / Govern / Accelerate" → ✅ Activate / Produce / Compound
❌ "NewCo AI" → ✅ /deliverance.ai
❌ "framework" when describing Deliverance → ✅ "operating system" or "OS"
❌ "tool" when describing Deliverance → ✅ "operating system"
❌ "engineering pods (billable)" → ✅ "embedded within OS subscription"
❌ "£75k assessment" → ✅ "4-week activation sprint, included in subscription"
❌ "nine architecture layers" as primary framing → ✅ "three OS functions"

Output: List every issue found with line-by-line corrections, then provide the corrected version of the content.`
  },
  {
    id: "strategist",
    name: "Strategist",
    role: "GTM & Positioning Strategist",
    icon: "◆",
    color: T.cyan,
    description: "Ensures strategic alignment, sharpens positioning, adds commercial context",
    systemPrompt: `You are the GTM Strategist for /deliverance.ai. You review brand-corrected content and sharpen the strategic positioning.

YOUR LENS:
1. Is the Three Questions journey clear and compelling?
2. Is the Trust Architecture positioned as foundational (not a feature)?
3. Are the four proprietary IP assets (OS, Agent Library, SLMs, Blueprints) clearly differentiated?
4. Is the competitive frame correct: "The production layer between infrastructure and applications"?
5. Is the EU AI Act urgency woven in where appropriate (August 2026 deadline)?
6. Is WWT or the target vertical addressed with relevant specificity?
7. Are commercial terms correct: subscription model, 4-week Activate included, no separate pod billing?

COMPETITIVE POSITIONING:
- vs Consultancies (Deloitte, Accenture): "They build. We operate."
- vs Cloud tools (Azure, AWS AI): "Infrastructure ≠ Operating System"
- vs Agent frameworks (CrewAI, LangChain): "A framework builds agents. An OS runs, governs, and scales your entire AI estate."

Review the corrected content and add/refine the strategic layer. Output the strategically-enhanced version.`
  },
  {
    id: "sales-expert",
    name: "Sales Expert",
    role: "Enterprise Sales Specialist",
    icon: "↗",
    color: T.green,
    description: "Sharpens commercial angles, ROI framing, and buyer-specific messaging",
    systemPrompt: `You are the Enterprise Sales Expert for /deliverance.ai. You take strategy-enhanced content and make it close deals.

YOUR JOB:
- Sharpen the economic proof points (ROI, cost reduction, time savings)
- Ensure the buyer journey is clear: Discovery → Activate sprint → Produce → Compound
- Add objection-handling language where needed
- Make the call-to-action crisp and specific
- Ensure the WWT Design Partner angle is compelling where relevant

KEY COMMERCIAL FACTS:
- Platform subscription ~£1.2M/yr (revenue floor)
- 13:1 pod economics
- 82% blended margins by month 18
- NRR-driven compounding model
- WWT Design Partner: free Activate phase, Year 1 consumption waivers, net-30 invoicing
- Order-to-Quote: £630 → £0.07 (99.9% cost reduction)
- Time: 2–5 days → 90 seconds (97%+ reduction)

BUYER PERSONAS:
- CIO/CTO: Platform governance, security (ARMOR), EU AI Act compliance
- CFO: ROI, cost reduction, consumption model vs capex
- COO: Operational efficiency, agent deployment speed, HITL controls
- Head of AI/Innovation: Agent Library, SLMs, Blueprints, 48 production agents

Review and sharpen the content for maximum commercial impact. Output the sales-ready version.`
  },
];

// ─── CONTEXT ───
const DELIVERANCE_CONTEXT = `
/deliverance.ai is the Operating System for Enterprise AI.

PLATFORM: Three OS Functions — Manage Resources / Enforce Policy / Run Workloads
JOURNEY: Three Questions — Where Are We? / How Do We Get There? / How Do We Stay Ahead?
PHASES: Activate (4-week sprint, included in subscription) → Produce (12–16 weeks) → Compound (ongoing NRR)
TRUST: Trust Architecture — 10 enterprise commitments as foundational layer
GOVERNANCE: ARMOR — Security By AI / Security Of AI / Security Of AI Usage
IP: OS + Agent Library (48 production agents, 11 domains) + SLMs + Blueprints
PROOF: Order-to-Quote: £630/2–5 days → £0.07/90 seconds | 4 agents, 3 domains, HITL
SCALE: £21M annual saving for GSI at 3,000 quotes/month
TARGET: WWT (primary anchor), Pharma, Financial Services, Telecoms, GSIs
GEO: Dublin, UK/Ireland, Dubai
URGENCY: EU AI Act enforcement August 2026
COMMERCIAL: ~£1.2M/yr subscription floor | 13:1 pod economics | 82% margins by M18
`;

// ─── API CALL ───
async function callAgent(agent: typeof AGENTS[number], userMessage: string, onChunk: (text: string) => void) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      stream: true,
      system: agent.systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === "content_block_delta" && data.delta?.text) {
            fullText += data.delta.text;
            onChunk(fullText);
          }
        } catch { /* skip non-JSON lines */ }
      }
    }
  }
  return fullText;
}

// ─── TYPES ───
type Deliverable = typeof DELIVERABLES[number];
type Phase = "idle" | "briefing" | "drafting" | "auditing" | "strategy" | "sales" | "synthesising" | "done";

// ─── MAIN COMPONENT ───
export default function DeliveranceSwarm() {
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);
  const [running, setRunning] = useState(false);
  const [iteration, setIteration] = useState(0);
  const [agentOutputs, setAgentOutputs] = useState<Record<string, string>>({});
  const [agentStatus, setAgentStatus] = useState<Record<string, string>>({});
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [finalOutput, setFinalOutput] = useState("");
  const [viewingAgent, setViewingAgent] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const abortRef = useRef(false);

  const setAgentOut = useCallback((agentId: string, text: string) => {
    setAgentOutputs(prev => ({ ...prev, [agentId]: text }));
  }, []);

  const setAgentStat = useCallback((agentId: string, status: string) => {
    setAgentStatus(prev => ({ ...prev, [agentId]: status }));
  }, []);

  const runSwarm = useCallback(async (deliverable: Deliverable, iterNum: number) => {
    if (!deliverable) return;
    abortRef.current = false;
    setRunning(true);
    setAgentOutputs({});
    setAgentStatus({});
    setFinalOutput("");
    setActiveAgent(null);

    const phases: { phase: Phase; agentId: string; label: string }[] = [
      { phase: "briefing", agentId: "orchestrator", label: "Briefing" },
      { phase: "drafting", agentId: "content-writer", label: "Drafting" },
      { phase: "auditing", agentId: "brand-guardian", label: "Auditing" },
      { phase: "strategy", agentId: "strategist", label: "Strategy" },
      { phase: "sales", agentId: "sales-expert", label: "Sales Layer" },
      { phase: "synthesising", agentId: "orchestrator", label: "Synthesising" },
    ];

    const outputs: Record<string, string> = {};

    for (let i = 0; i < phases.length; i++) {
      if (abortRef.current) break;
      const { phase: p, agentId } = phases[i];
      const agent = AGENTS.find(a => a.id === agentId)!;
      setPhase(p);
      setActiveAgent(agentId + (i === 5 ? "_final" : ""));
      setAgentStat(agentId + (i === 5 ? "_final" : ""), "running");

      let prompt = "";
      if (i === 0) {
        prompt = `DELIVERABLE: ${deliverable.label}\nFORMAT: ${deliverable.format}\nDESCRIPTION: ${deliverable.desc}\nMILESTONE: ${deliverable.milestone}\n\nCONTEXT:\n${DELIVERANCE_CONTEXT}\n\nIteration ${iterNum}: Produce a detailed content brief for this deliverable. Include: key sections/slides, core messages per section, proof points to use, buyer personas to address, and recommended structure. Be specific and comprehensive.`;
      } else if (i === 1) {
        prompt = `DELIVERABLE: ${deliverable.label}\n\nORCHESTRATOR BRIEF:\n${outputs.orchestrator}\n\nDraft the full content for this deliverable based on the brief above. Write actual content — headlines, body copy, talking points — not descriptions of what to write.`;
      } else if (i === 2) {
        prompt = `DELIVERABLE: ${deliverable.label}\n\nCONTENT DRAFT:\n${outputs["content-writer"]}\n\nAudit this draft for brand and framework compliance. Flag every violation, then output the fully corrected version.`;
      } else if (i === 3) {
        prompt = `DELIVERABLE: ${deliverable.label}\n\nBRAND-CORRECTED CONTENT:\n${outputs["brand-guardian"]}\n\nApply the strategic layer. Sharpen positioning, ensure competitive framing is correct, add EU AI Act urgency where relevant, verify Three Questions journey is compelling. Output the strategically-enhanced version.`;
      } else if (i === 4) {
        prompt = `DELIVERABLE: ${deliverable.label}\n\nSTRATEGY-ENHANCED CONTENT:\n${outputs.strategist}\n\nApply the sales layer. Sharpen ROI framing, add buyer-persona-specific angles, crisp CTAs, objection handling. Output the sales-ready version.`;
      } else if (i === 5) {
        prompt = `DELIVERABLE: ${deliverable.label}\n\nALL AGENT OUTPUTS:\n\n--- BRIEF ---\n${outputs.orchestrator}\n\n--- SALES-READY CONTENT ---\n${outputs["sales-expert"]}\n\nSynthesize these into a final, polished, structured output. This is the FINAL DELIVERABLE. Format it clearly with sections, ready to hand to a designer or copywriter for production. Make it exceptional.`;
      }

      try {
        const output = await callAgent(
          agent,
          prompt,
          (text) => {
            const key = agentId + (i === 5 ? "_final" : "");
            setAgentOut(key, text);
            if (i === 5) setFinalOutput(text);
          }
        );
        outputs[agentId + (i === 5 ? "_final" : "")] = output;
        if (i < 5) outputs[agentId] = output;
        setAgentStat(agentId + (i === 5 ? "_final" : ""), "done");
      } catch (err) {
        setAgentStat(agentId + (i === 5 ? "_final" : ""), "error");
        console.error(err);
      }
    }

    setPhase("done");
    setActiveAgent(null);
    setRunning(false);
  }, [setAgentOut, setAgentStat]);

  const handleRun = useCallback(() => {
    const nextIter = iteration + 1;
    setIteration(nextIter);
    runSwarm(selectedDeliverable!, nextIter);
  }, [selectedDeliverable, iteration, runSwarm]);

  const handleStop = useCallback(() => {
    abortRef.current = true;
    setRunning(false);
    setPhase("idle");
  }, []);

  const agentPanelOrder = [
    { id: "orchestrator", label: "Orchestrator", icon: "◈", color: T.purple, phase: "briefing" },
    { id: "content-writer", label: "Content Writer", icon: "✦", color: T.blue, phase: "drafting" },
    { id: "brand-guardian", label: "Brand Guardian", icon: "⬡", color: T.amber, phase: "auditing" },
    { id: "strategist", label: "Strategist", icon: "◆", color: T.cyan, phase: "strategy" },
    { id: "sales-expert", label: "Sales Expert", icon: "↗", color: T.green, phase: "sales" },
    { id: "orchestrator_final", label: "Orchestrator (Synthesis)", icon: "◈", color: T.purple, phase: "synthesising" },
  ];

  const viewAgent = viewingAgent ? agentPanelOrder.find(a => a.id === viewingAgent) : null;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: T.ink }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${T.border}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: T.surface }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: T.purpleFaint, border: `1px solid ${T.purple}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: T.purple }}>◈</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px", color: T.ink }}>/deliverance.ai</div>
            <div style={{ fontSize: 11, color: T.muted, letterSpacing: "0.5px" }}>DELIVERY SWARM</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {iteration > 0 && <div style={{ fontSize: 11, color: T.muted, padding: "3px 8px", background: T.elevated, borderRadius: 4, border: `1px solid ${T.border}` }}>ITER {iteration}</div>}
          <div style={{ fontSize: 11, color: phase === "done" ? T.green : running ? T.purple : T.muted, padding: "3px 8px", background: T.elevated, borderRadius: 4, border: `1px solid ${phase === "done" ? T.green + "40" : running ? T.purple + "40" : T.border}` }}>
            {phase === "idle" ? "IDLE" : phase === "done" ? "COMPLETE" : phase.toUpperCase()}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 61px)" }}>

        {/* LEFT — Deliverable Selector */}
        <div style={{ width: 260, borderRight: `1px solid ${T.border}`, overflowY: "auto", background: T.surface, flexShrink: 0 }}>
          <div style={{ padding: "12px 16px 8px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 10, color: T.muted, letterSpacing: "1px", fontWeight: 600 }}>// DELIVERABLES</div>
          </div>
          {["M1", "M2", "M3"].map(milestone => (
            <div key={milestone}>
              <div style={{ padding: "8px 16px 4px", fontSize: 10, color: T.purple, letterSpacing: "1px", fontWeight: 700 }}>
                {milestone} {milestone === "M1" ? "— Mar 15" : milestone === "M2" ? "— Apr 15" : "— May 15"}
              </div>
              {DELIVERABLES.filter(d => d.milestone === milestone).map(d => (
                <div
                  key={d.id}
                  onClick={() => { if (!running) { setSelectedDeliverable(d); setFinalOutput(""); setAgentOutputs({}); setAgentStatus({}); setPhase("idle"); setIteration(0); setViewingAgent(null); }}}
                  style={{
                    padding: "8px 16px", cursor: running ? "not-allowed" : "pointer",
                    background: selectedDeliverable?.id === d.id ? T.purpleFaint : "transparent",
                    borderLeft: `2px solid ${selectedDeliverable?.id === d.id ? T.purple : "transparent"}`,
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: selectedDeliverable?.id === d.id ? T.ink : T.steel, marginBottom: 2 }}>{d.label}</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <span style={{ fontSize: 9, color: T.purple, background: T.purpleFaint, padding: "1px 5px", borderRadius: 3 }}>{d.format}</span>
                    <span style={{ fontSize: 9, color: d.priority === "P1" ? T.amber : T.muted, background: d.priority === "P1" ? T.amberFaint : T.elevated, padding: "1px 5px", borderRadius: 3 }}>{d.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* CENTER — Main Panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Control Bar */}
          <div style={{ padding: "12px 20px", borderBottom: `1px solid ${T.border}`, background: T.card, display: "flex", alignItems: "center", gap: 12 }}>
            {selectedDeliverable ? (
              <>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{selectedDeliverable.label}</div>
                  <div style={{ fontSize: 11, color: T.steel }}>{selectedDeliverable.desc}</div>
                </div>
                {!running ? (
                  <button
                    onClick={handleRun}
                    style={{ padding: "8px 20px", background: T.purple, border: "none", borderRadius: 6, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: "0.3px" }}
                  >
                    {iteration === 0 ? "▶ Deploy Swarm" : "↻ Re-iterate"}
                  </button>
                ) : (
                  <button
                    onClick={handleStop}
                    style={{ padding: "8px 20px", background: T.redFaint, border: `1px solid ${T.red}40`, borderRadius: 6, color: T.red, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    ◼ Stop
                  </button>
                )}
              </>
            ) : (
              <div style={{ fontSize: 13, color: T.muted }}>← Select a deliverable to begin</div>
            )}
          </div>

          {/* Agent Pipeline */}
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 8, background: T.bg, overflowX: "auto" }}>
            {agentPanelOrder.map((a, idx) => {
              const status = agentStatus[a.id];
              const isActive = activeAgent === a.id;
              const isDone = status === "done";
              const isError = status === "error";
              return (
                <div key={a.id + idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    onClick={() => { if (agentOutputs[a.id]) setViewingAgent(viewingAgent === a.id ? null : a.id); }}
                    style={{
                      padding: "6px 12px", borderRadius: 20, border: `1px solid ${isActive ? a.color : isDone ? a.color + "60" : T.border}`,
                      background: isActive ? a.color + "15" : isDone ? a.color + "08" : T.elevated,
                      display: "flex", alignItems: "center", gap: 6, cursor: agentOutputs[a.id] ? "pointer" : "default",
                      transition: "all 0.2s", boxShadow: isActive ? `0 0 12px ${a.color}30` : "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isActive && <span style={{ width: 6, height: 6, borderRadius: "50%", background: a.color, display: "inline-block", animation: "pulse 1s infinite" }} />}
                    {isDone && <span style={{ color: a.color, fontSize: 10 }}>✓</span>}
                    {isError && <span style={{ color: T.red, fontSize: 10 }}>✗</span>}
                    {!isActive && !isDone && !isError && <span style={{ fontSize: 10, color: a.color }}>{a.icon}</span>}
                    <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? a.color : isDone ? a.color : T.steel }}>{a.label}</span>
                  </div>
                  {idx < agentPanelOrder.length - 1 && <span style={{ color: T.muted, fontSize: 12 }}>→</span>}
                </div>
              );
            })}
          </div>

          {/* Output Area */}
          <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>

            {/* Agent Detail View */}
            {viewingAgent && agentOutputs[viewingAgent] && (
              <div style={{ marginBottom: 16, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: T.elevated }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {viewAgent && <span style={{ color: viewAgent.color, fontSize: 14 }}>{viewAgent.icon}</span>}
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.ink }}>{viewAgent?.label} Output</span>
                  </div>
                  <button onClick={() => setViewingAgent(null)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 16 }}>×</button>
                </div>
                <div style={{ padding: 16, fontSize: 12, lineHeight: 1.7, color: T.steel, whiteSpace: "pre-wrap", maxHeight: 300, overflow: "auto" }}>
                  {agentOutputs[viewingAgent]}
                </div>
              </div>
            )}

            {/* Final Output */}
            {(finalOutput || (running && phase === "synthesising")) && (
              <div style={{ background: T.card, border: `1px solid ${T.purple}40`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: T.elevated }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: T.purple }}>◈</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.ink }}>
                      {phase === "done" ? "Final Output" : "Synthesising..."}
                    </span>
                    {phase === "done" && selectedDeliverable && (
                      <span style={{ fontSize: 10, color: T.purple, background: T.purpleFaint, padding: "2px 6px", borderRadius: 3 }}>{selectedDeliverable.format}</span>
                    )}
                  </div>
                  {phase === "done" && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => { navigator.clipboard.writeText(finalOutput); }}
                        style={{ padding: "4px 10px", background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 5, color: T.steel, fontSize: 11, cursor: "pointer" }}
                      >Copy</button>
                      <button
                        onClick={handleRun}
                        style={{ padding: "4px 10px", background: T.purpleFaint, border: `1px solid ${T.purple}40`, borderRadius: 5, color: T.purple, fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                      >↻ Iterate</button>
                    </div>
                  )}
                </div>
                <div style={{ padding: "20px", fontSize: 13, lineHeight: 1.8, color: T.ink, whiteSpace: "pre-wrap", fontFamily: "'DM Sans', sans-serif" }}>
                  {finalOutput}
                  {running && phase === "synthesising" && (
                    <span style={{ display: "inline-block", width: 2, height: 14, background: T.purple, marginLeft: 2, animation: "blink 1s infinite" }} />
                  )}
                </div>
              </div>
            )}

            {/* Live Agent Feed */}
            {running && phase !== "synthesising" && phase !== "idle" && (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, background: T.elevated, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.purple, display: "inline-block" }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>
                    {agentPanelOrder.find(a => a.id === activeAgent)?.label || "Agent"} — Live
                  </span>
                </div>
                <div style={{ padding: 16, fontSize: 12, lineHeight: 1.7, color: T.steel, whiteSpace: "pre-wrap", maxHeight: 300, overflow: "auto" }}>
                  {(activeAgent && agentOutputs[activeAgent]) || "Thinking..."}
                  <span style={{ display: "inline-block", width: 2, height: 12, background: T.purple, marginLeft: 2 }} />
                </div>
              </div>
            )}

            {/* Empty State */}
            {!running && !finalOutput && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60%", gap: 12, color: T.muted }}>
                <div style={{ fontSize: 32, opacity: 0.3 }}>◈</div>
                <div style={{ fontSize: 13, textAlign: "center" }}>
                  {selectedDeliverable ? `Ready to deploy swarm for "${selectedDeliverable.label}"` : "Select a deliverable from the left panel"}
                </div>
                {selectedDeliverable && (
                  <div style={{ fontSize: 11, color: T.muted, textAlign: "center", maxWidth: 300 }}>
                    5 specialist agents will collaborate across Briefing → Draft → Audit → Strategy → Sales → Synthesis
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Agent Roster */}
        <div style={{ width: 220, borderLeft: `1px solid ${T.border}`, overflowY: "auto", background: T.surface, flexShrink: 0 }}>
          <div style={{ padding: "12px 16px 8px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 10, color: T.muted, letterSpacing: "1px", fontWeight: 600 }}>// AGENTS</div>
          </div>
          {AGENTS.map(agent => {
            const anyRunning = agentPanelOrder.some(a => (a.id === agent.id || a.id === agent.id + "_final") && agentStatus[a.id] === "running");
            const statuses = agentPanelOrder.filter(a => a.id === agent.id || a.id === agent.id + "_final").map(a => agentStatus[a.id]);
            const anyDone = statuses.some(s => s === "done");
            return (
              <div key={agent.id} style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}20` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, color: anyRunning ? agent.color : anyDone ? agent.color : T.muted }}>{agent.icon}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: anyRunning ? agent.color : anyDone ? T.ink : T.steel }}>{agent.name}</div>
                    <div style={{ fontSize: 9, color: T.muted }}>{agent.role}</div>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.5 }}>{agent.description}</div>
                {anyRunning && <div style={{ marginTop: 6, fontSize: 9, color: agent.color }}>● ACTIVE</div>}
                {!anyRunning && anyDone && <div style={{ marginTop: 6, fontSize: 9, color: T.green }}>✓ COMPLETE</div>}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
        @keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0 } }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #353550; border-radius:2px; }
      `}</style>
    </div>
  );
}
