import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Pill, Leaf, AlertTriangle, CheckCircle2, Loader2,
  ChevronDown, ChevronUp, Zap, Shield, Info, Activity,
  BarChart2, Search, ExternalLink, RefreshCw, Layers,
  FlaskConical, Microscope
} from "lucide-react";

import HistoryPanel  from "./components/HistoryPanel";
import DrugInfoPanel from "./components/DrugInfoPanel";
import BatchChecker  from "./components/BatchChecker";
import MolViewer     from "./components/MolViewer";
import ExportButton  from "./components/ExportButton";
import { useHistory } from "./hooks/useHistory";

const API = "http://localhost:8000";

// ─── Animated background ─────────────────────────────────────────────────────
function MoleculeCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx    = canvas.getContext("2d");
    let id;
    const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const N = 28;
    const nodes = Array.from({ length: N }, () => ({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight,
      vx: (Math.random() - .5) * .32, vy: (Math.random() - .5) * .32,
      r:  Math.random() * 3 + 2,
    }));
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width)  n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      });
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < 155) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(0,200,170,${.11 * (1 - d / 155)})`;
          ctx.lineWidth = 1;
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
      nodes.forEach(n => {
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,200,170,0.42)"; ctx.fill();
      });
      id = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", resize); };
  }, []);
  return (
    <canvas ref={ref} style={{
      position: "fixed", top: 0, left: 0,
      width: "100%", height: "100%",
      pointerEvents: "none", zIndex: 0,
    }} />
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────
function RiskBadge({ severity }) {
  const m = {
    Critical: { c: "#ff2d55", bg: "rgba(255,45,85,.12)"   },
    High:     { c: "#ff4757", bg: "rgba(255,71,87,.12)"   },
    Moderate: { c: "#ffa502", bg: "rgba(255,165,2,.12)"   },
    Low:      { c: "#2ed573", bg: "rgba(46,213,115,.12)"  },
    Unknown:  { c: "#7a9e95", bg: "rgba(122,158,149,.1)"  },
    None:     { c: "var(--teal)", bg: "var(--teal-dim)"   },
  };
  const s = m[severity] || m.Unknown;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 99,
      fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.1em",
      fontWeight: 700, color: s.c, background: s.bg, border: `1px solid ${s.c}40`,
    }}>
      {severity}
    </span>
  );
}

function ProbBar({ value }) {
  const pct   = Math.round(value * 100);
  const color = pct >= 70 ? "var(--red)" : pct >= 40 ? "var(--amber)" : "var(--teal)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: "var(--bg)", borderRadius: 99, overflow: "hidden", border: "1px solid var(--border)" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width .8s cubic-bezier(.4,0,.2,1)", boxShadow: `0 0 8px ${color}80` }} />
      </div>
      <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color, minWidth: 38, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

function Skeleton({ width = "100%", height = 16, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: 6,
      background: "linear-gradient(90deg,var(--bg-card2) 25%,rgba(0,200,170,.06) 50%,var(--bg-card2) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
      ...style,
    }} />
  );
}

function ResultSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ padding: "28px 32px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
        <div style={{ display: "flex", gap: 20 }}>
          <Skeleton width={72} height={72} style={{ borderRadius: "50%", flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <Skeleton width="30%" height={12} />
            <Skeleton width="22%" height={40} />
            <Skeleton height={14} />
            <Skeleton width="80%" height={14} />
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {[1,2,3].map(i => <Skeleton key={i} height={88} style={{ flex: 1, borderRadius: "var(--radius)" }} />)}
      </div>
      {[1,2,3].map(i => <Skeleton key={i} height={54} style={{ borderRadius: "var(--radius)" }} />)}
    </div>
  );
}

// ─── AutoInput ────────────────────────────────────────────────────────────────
function AutoInput({ label, icon: Icon, value, onChange, suggestions, placeholder, onInfoClick }) {
  const [open, setOpen] = useState(false);
  const filtered = suggestions
    .filter(s => s.toLowerCase().includes(value.toLowerCase()) && value.length > 0)
    .slice(0, 8);

  return (
    <div style={{ position: "relative", flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <label style={{ fontSize: 11, letterSpacing: "0.15em", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon size={12} />{label}
        </label>
        {onInfoClick && value && (
          <button onClick={onInfoClick}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--teal)", fontSize: 11, fontFamily: "var(--font-mono)", display: "flex", alignItems: "center", gap: 4, opacity: .7 }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = .7}>
            <ExternalLink size={11} /> info
          </button>
        )}
      </div>
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        style={{ width: "100%", padding: "14px 18px", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--text-primary)", fontFamily: "var(--font-display)", fontSize: 15, outline: "none", transition: "border-color .2s, box-shadow .2s" }}
        onFocusCapture={e => { e.target.style.borderColor = "var(--teal)"; e.target.style.boxShadow = "0 0 0 3px var(--teal-dim)"; }}
        onBlurCapture={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
      />
      {open && filtered.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, zIndex: 50, background: "var(--bg-card)", border: "1px solid var(--border-glow)", borderRadius: "var(--radius)", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,.4)" }}>
          {filtered.map(s => (
            <div key={s} onMouseDown={() => { onChange(s); setOpen(false); }}
              style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, color: "var(--text-primary)", borderBottom: "1px solid var(--border)", transition: "background .15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--teal-dim)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Constituent row ──────────────────────────────────────────────────────────
function ConstituentRow({ item, delay }) {
  const [exp, setExp]         = useState(false);
  const [showMol, setShowMol] = useState(false);
  const unsafe = item.label === "UNSAFE";

  return (
    <div style={{ background: unsafe ? "rgba(255,71,87,.04)" : "rgba(0,200,170,.02)", border: `1px solid ${unsafe ? "var(--red-border)" : "var(--border)"}`, borderRadius: "var(--radius)", overflow: "hidden", animation: `fadeUp .4s ease ${delay}ms both` }}>
      <div onClick={() => setExp(!exp)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer" }}>
        {unsafe ? <AlertTriangle size={16} color="var(--red)" /> : <CheckCircle2 size={16} color="var(--teal)" />}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{item.constituent_name}</div>
          <ProbBar value={item.probability} />
        </div>
        <RiskBadge severity={item.severity} />
        {exp ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />}
      </div>

      {exp && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <Info size={13} color="var(--text-secondary)" style={{ marginTop: 2, flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{item.interaction_effect}</p>
          </div>
          <button onClick={() => setShowMol(m => !m)}
            style={{ alignSelf: "flex-start", padding: "6px 12px", background: "none", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", transition: "all .2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--teal)"; e.currentTarget.style.color = "var(--teal)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
            <Microscope size={12} />{showMol ? "Hide" : "Show"} 2D Structure
          </button>
          {showMol && <MolViewer smiles={item.constituent_smiles} label={item.constituent_name} height={160} highlight={unsafe} />}
          <div style={{ background: "var(--bg)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
            <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>SMILES</span>
            <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--teal)", marginTop: 4, wordBreak: "break-all", lineHeight: 1.5 }}>{item.constituent_smiles}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Result panel ─────────────────────────────────────────────────────────────
function ResultPanel({ result, onRetry }) {
  const isSafe      = result.overall_label === "SAFE";
  const riskColor   = isSafe ? "var(--teal)"       : "var(--red)";
  const riskBg      = isSafe ? "var(--teal-dim)"   : "var(--red-dim)";
  const borderColor = isSafe ? "var(--border-glow)" : "var(--red-border)";
  const [showDrugMol, setShowDrugMol] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "fadeUp .5s ease both" }}>
      {/* Verdict banner */}
      <div style={{ background: riskBg, border: `1px solid ${borderColor}`, borderRadius: "var(--radius-lg)", padding: "28px 32px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: isSafe ? "rgba(0,200,170,.15)" : "rgba(255,71,87,.15)", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${riskColor}`, flexShrink: 0 }}>
          {isSafe ? <Shield size={32} color="var(--teal)" /> : <AlertTriangle size={32} color="var(--red)" />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.2em", color: riskColor, marginBottom: 6, textTransform: "uppercase" }}>
            {result.drug_name} + {result.food_name}
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: riskColor, lineHeight: 1, marginBottom: 8, letterSpacing: "-0.02em" }}>
            {result.overall_label}
          </div>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>{result.summary}</p>
          {result.duration_ms && (
            <div style={{ marginTop: 8, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
              Inference time: {result.duration_ms}ms
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12, flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>MAX RISK</div>
            <RiskBadge severity={result.overall_risk} />
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>CONFIDENCE</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: riskColor, fontFamily: "var(--font-mono)" }}>{Math.round(result.max_probability * 100)}%</div>
          </div>
          <ExportButton result={result} />
        </div>
      </div>

      {/* Drug structure toggle */}
      {result.drug_smiles && (
        <div>
          <button onClick={() => setShowDrugMol(m => !m)}
            style={{ padding: "8px 14px", background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: 11, color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", transition: "all .2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--teal)"; e.currentTarget.style.color = "var(--teal)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
            <Microscope size={13} />{showDrugMol ? "Hide" : "Show"} Drug 2D Structure
          </button>
          {showDrugMol && <div style={{ marginTop: 12 }}><MolViewer smiles={result.drug_smiles} label={result.drug_name} height={200} highlight /></div>}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "flex", gap: 12 }}>
        {[
          { label: "Constituents Checked", value: result.constituents_checked.length,                             icon: BarChart2                                                   },
          { label: "Harmful Interactions", value: result.constituents_checked.filter(c => c.label === "UNSAFE").length, icon: AlertTriangle, danger: true                          },
          { label: "Safe Constituents",    value: result.constituents_checked.filter(c => c.label === "SAFE").length,   icon: CheckCircle2                                          },
        ].map(({ label, value, icon: Icon, danger }) => (
          <div key={label} style={{ flex: 1, padding: "16px 20px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", textAlign: "center" }}>
            <Icon size={18} color={danger ? "var(--red)" : "var(--teal)"} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 28, fontWeight: 800, color: danger && value > 0 ? "var(--red)" : "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{value}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Constituent list */}
      <div>
        <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", letterSpacing: "0.15em", color: "var(--text-secondary)", marginBottom: 14, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
          <Activity size={14} /> Constituent Analysis
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {result.constituents_checked
            .sort((a, b) => b.probability - a.probability)
            .map((item, i) => <ConstituentRow key={item.constituent_name} item={item} delay={i * 60} />)}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onRetry}
          style={{ flex: 1, padding: "12px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: 13, color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "var(--font-display)", transition: "all .2s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--teal)"; e.currentTarget.style.color = "var(--teal)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
          <RefreshCw size={14} /> New Search
        </button>
        <a href={`https://www.drugs.com/food-interactions/${result.drug_name.toLowerCase().replace(/[\s()]/g, "-")}.html`}
          target="_blank" rel="noreferrer"
          style={{ flex: 1, padding: "12px", background: "var(--teal-dim)", border: "1px solid var(--border-glow)", borderRadius: "var(--radius)", fontSize: 13, color: "var(--teal)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "var(--font-display)", textDecoration: "none", transition: "all .2s" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(0,200,170,.2)"}
          onMouseLeave={e => e.currentTarget.style.background = "var(--teal-dim)"}>
          <ExternalLink size={14} /> Verify on Drugs.com
        </a>
      </div>

      <div style={{ padding: "12px 16px", background: "rgba(255,165,2,.06)", border: "1px solid rgba(255,165,2,.2)", borderRadius: "var(--radius)", fontSize: 12, color: "rgba(255,165,2,.85)", lineHeight: 1.6 }}>
        ⚠️ For informational purposes only. Always consult a qualified healthcare professional before making changes to your medication or diet.
      </div>
    </div>
  );
}

// ─── SMILES Direct Input tab ──────────────────────────────────────────────────
function SmilesTab() {
  const [drugSmiles,  setDrugSmiles]  = useState("");
  const [constSmiles, setConstSmiles] = useState("");
  const [drugLabel,   setDrugLabel]   = useState("Drug");
  const [constLabel,  setConstLabel]  = useState("Constituent");
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState("");

  const EXAMPLES = [
    { d: "CC1(C2CC3CC(C2)(CC3C1=O)OC(=O)c1ccccc1)O", c: "CC1(CCC(=C)C(C1)OC(=O)/C=C/c1ccc(O)cc1)C", dl: "Warfarin", cl: "Vitamin K" },
    { d: "NNCc1ccccc1",                                c: "NCCc1ccc(O)cc1",                            dl: "Phenelzine (MAOI)", cl: "Tyramine" },
    { d: "CN(C)C(=N)NC(=N)N",                         c: "CCO",                                       dl: "Metformin",        cl: "Ethanol" },
  ];

  const handlePredict = async () => {
    if (!drugSmiles.trim() || !constSmiles.trim()) { setError("Paste both SMILES strings."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      // Build a synthetic result from /predict/batch with a single SMILES pair
      // We call a special endpoint — if not available, simulate one constituent
      const { data } = await axios.post(`${API}/predict/batch`, {
        pairs: [{ drug_name: drugLabel || "Unknown Drug", food_name: constLabel || "Unknown Constituent" }]
      }).catch(() => null);

      // Fallback: call /predict with labels (works if labels match dataset)
      const { data: d2 } = await axios.post(`${API}/predict`, {
        drug_name: drugLabel || "Warfarin",
        food_name: "Grapefruit",
      }).catch(() => ({ data: null }));

      // Since direct SMILES-to-API isn't a route, we show the molecules and a note
      setResult({ drugSmiles, constSmiles, drugLabel, constLabel });
    } catch {
      setError("Error running prediction. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Info banner */}
      <div style={{ padding: "12px 16px", background: "rgba(0,200,170,.06)", border: "1px solid var(--border-glow)", borderRadius: "var(--radius)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
        <strong style={{ color: "var(--teal)" }}>Advanced Mode — </strong>
        Paste SMILES strings directly to visualize and inspect molecular structures. 
        For GNN predictions with SMILES, use the <strong>drug name</strong> lookup (the model always works from SMILES internally).
      </div>

      {/* Quick examples */}
      <div>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase" }}>
          Load Example
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {EXAMPLES.map(ex => (
            <button key={ex.dl}
              onClick={() => { setDrugSmiles(ex.d); setConstSmiles(ex.c); setDrugLabel(ex.dl); setConstLabel(ex.cl); }}
              style={{ padding: "6px 14px", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 99, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer", fontFamily: "var(--font-display)", transition: "all .2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--teal)"; e.currentTarget.style.color = "var(--teal)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
              {ex.dl} + {ex.cl}
            </button>
          ))}
        </div>
      </div>

      {/* SMILES inputs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {[
          { label: "Drug Label (optional)", val: drugLabel,  set: setDrugLabel,  ph: "e.g. Warfarin",    mono: false },
          { label: "Drug SMILES",           val: drugSmiles,  set: setDrugSmiles,  ph: "Paste SMILES...", mono: true  },
          { label: "Constituent Label",     val: constLabel, set: setConstLabel, ph: "e.g. Vitamin K",   mono: false },
          { label: "Constituent SMILES",    val: constSmiles, set: setConstSmiles, ph: "Paste SMILES...", mono: true  },
        ].map(({ label, val, set, ph, mono }) => (
          <div key={label}>
            <label style={{ display: "block", fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.12em", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: 6 }}>{label}</label>
            <textarea value={val} onChange={e => set(e.target.value)} placeholder={ph} rows={mono ? 3 : 1}
              style={{ width: "100%", padding: "12px 16px", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: mono ? "var(--teal)" : "var(--text-primary)", fontFamily: mono ? "var(--font-mono)" : "var(--font-display)", fontSize: mono ? 12 : 14, outline: "none", resize: "vertical", lineHeight: 1.5, transition: "border-color .2s" }}
              onFocus={e => e.target.style.borderColor = "var(--teal)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"}
            />
          </div>
        ))}
      </div>

      {error && <div style={{ padding: "10px 14px", background: "var(--red-dim)", border: "1px solid var(--red-border)", borderRadius: "var(--radius)", fontSize: 13, color: "var(--red)" }}>{error}</div>}

      <button onClick={handlePredict} disabled={loading}
        style={{ padding: "14px", background: loading ? "var(--teal-dim)" : "var(--teal)", color: loading ? "var(--teal)" : "var(--bg)", border: "1px solid var(--teal)", borderRadius: "var(--radius)", fontSize: 14, fontWeight: 700, fontFamily: "var(--font-display)", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "all .2s" }}>
        {loading ? <><Loader2 size={17} style={{ animation: "spin 1s linear infinite" }} />Processing...</> : <><FlaskConical size={17} />Visualize Molecules</>}
      </button>

      {/* Side-by-side molecule views */}
      {(drugSmiles || constSmiles) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {drugSmiles  && <MolViewer smiles={drugSmiles}  label={drugLabel  || "Drug"}        height={200} highlight />}
          {constSmiles && <MolViewer smiles={constSmiles} label={constLabel || "Constituent"} height={200} />}
        </div>
      )}

      {(drugSmiles || constSmiles) && (
        <div style={{ padding: "12px 16px", background: "var(--teal-dim)", border: "1px solid var(--border-glow)", borderRadius: "var(--radius)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          💡 To run a <strong style={{ color: "var(--teal)" }}>GNN prediction</strong> on these structures, switch to the <strong>Single Check</strong> tab and enter the drug/food name — the model fetches SMILES automatically and runs the D-MPNN.
        </div>
      )}
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function Tab({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick}
      style={{ flex: 1, padding: "12px 16px", background: active ? "var(--teal-dim)" : "none", border: "none", borderBottom: `2px solid ${active ? "var(--teal)" : "transparent"}`, color: active ? "var(--teal)" : "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontFamily: "var(--font-display)", fontWeight: active ? 700 : 400, transition: "all .2s" }}>
      <Icon size={14} />{label}
    </button>
  );
}

// ─── Main Home page ───────────────────────────────────────────────────────────
export default function Home() {
  const [tab,       setTab]       = useState("single");
  const [drugName,  setDrugName]  = useState("");
  const [foodName,  setFoodName]  = useState("");
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState("");
  const [drugs,     setDrugs]     = useState([]);
  const [foods,     setFoods]     = useState([]);
  const [drugPanel, setDrugPanel] = useState(null);

  const { history, addEntry, clearHistory } = useHistory();

  useEffect(() => {
    axios.get(`${API}/drugs`).then(r => setDrugs(r.data.drugs)).catch(() => {});
    axios.get(`${API}/foods`).then(r => setFoods(r.data.foods)).catch(() => {});
  }, []);

  const handlePredict = async () => {
    if (!drugName.trim() || !foodName.trim()) { setError("Please enter both a drug name and a food name."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const { data } = await axios.post(`${API}/predict`, { drug_name: drugName.trim(), food_name: foodName.trim() });
      setResult(data);
      addEntry(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Connection error — is the backend running on port 8000?");
    } finally {
      setLoading(false); }
  };

  const reset = () => { setResult(null); setDrugName(""); setFoodName(""); setError(""); };
  const switchTab = t => { setTab(t); setResult(null); setError(""); };

  return (
    <div style={{ position: "relative", minHeight: "calc(100vh - 56px)" }}>
      <MoleculeCanvas />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "48px 24px 100px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 44, animation: "fadeUp .6s ease both" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "5px 16px", borderRadius: 99, background: "var(--teal-dim)", border: "1px solid var(--border-glow)", marginBottom: 18 }}>
            <Zap size={11} color="var(--teal)" />
            <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.18em", color: "var(--teal)", textTransform: "uppercase" }}>D-MPNN · SMILES Molecular Graph · GNN</span>
          </div>
          <h1 style={{ fontSize: "clamp(30px,5vw,50px)", fontWeight: 800, letterSpacing: "-0.03em", background: "linear-gradient(135deg,#e8f4f0 0%,var(--teal) 65%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 12 }}>
            Drug-Food Interaction Checker
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>
            Molecular-level safety predictions powered by Graph Neural Networks trained on SMILES structures.
          </p>
        </div>

        {/* Main card */}
        <div className="glass" style={{ padding: 0, marginBottom: 24, animation: "fadeUp .6s ease .1s both", overflow: "hidden" }}>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
            <Tab active={tab === "single"} onClick={() => switchTab("single")} icon={Search}       label="Single Check"   />
            <Tab active={tab === "batch"}  onClick={() => switchTab("batch")}  icon={Layers}       label="Batch Checker"  />
            <Tab active={tab === "smiles"} onClick={() => switchTab("smiles")} icon={FlaskConical} label="SMILES Viewer"  />
          </div>

          <div style={{ padding: 28 }}>
            {/* ── Single tab ── */}
            {tab === "single" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <AutoInput label="Drug Name" icon={Pill} value={drugName} onChange={setDrugName} suggestions={drugs} placeholder="e.g. Warfarin, Metformin..." onInfoClick={() => setDrugPanel(drugName || null)} />
                  <AutoInput label="Food Name" icon={Leaf} value={foodName} onChange={setFoodName} suggestions={foods} placeholder="e.g. Grapefruit, Spinach..." />
                </div>
                {error && <div style={{ padding: "12px 16px", background: "var(--red-dim)", border: "1px solid var(--red-border)", borderRadius: "var(--radius)", fontSize: 13, color: "var(--red)" }}>{error}</div>}
                <button onClick={handlePredict} disabled={loading}
                  style={{ padding: "15px", background: loading ? "var(--teal-dim)" : "var(--teal)", color: loading ? "var(--teal)" : "var(--bg)", border: "1px solid var(--teal)", borderRadius: "var(--radius)", fontSize: 15, fontWeight: 700, fontFamily: "var(--font-display)", letterSpacing: "0.04em", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "all .2s" }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = "0 0 24px rgba(0,200,170,.35)"; }}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                  {loading ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />Running GNN Prediction...</> : <><Search size={18} />Check Interaction</>}
                </button>
              </div>
            )}

            {/* ── Batch tab ── */}
            {tab === "batch" && <BatchChecker drugs={drugs} foods={foods} />}

            {/* ── SMILES tab ── */}
            {tab === "smiles" && <SmilesTab />}
          </div>
        </div>

        {/* Examples */}
        {tab === "single" && !result && !loading && (
          <div style={{ animation: "fadeUp .6s ease .2s both", marginBottom: 28 }}>
            <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.18em", color: "var(--text-muted)", marginBottom: 12, textAlign: "center", textTransform: "uppercase" }}>Try an example</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {[["Warfarin","Spinach"],["Simvastatin","Grapefruit"],["MAOIs (Phenelzine)","Cheese (Aged)"],["Ciprofloxacin","Milk"],["Metformin","Alcohol (Beer/Wine/Spirits)"],["Levothyroxine","Coffee"]].map(([d, f]) => (
                <button key={`${d}-${f}`} onClick={() => { setDrugName(d); setFoodName(f); }}
                  style={{ padding: "7px 15px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 99, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer", fontFamily: "var(--font-display)", transition: "all .2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--teal)"; e.currentTarget.style.color = "var(--teal)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
                  {d} + {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {tab === "single" && !result && !loading && (
          <div style={{ marginBottom: 32 }}>
            <HistoryPanel history={history} onSelect={(d, f) => { setDrugName(d); setFoodName(f); setResult(null); setError(""); }} onClear={clearHistory} />
          </div>
        )}

        {/* Loading skeleton */}
        {loading && <ResultSkeleton />}

        {/* Result */}
        {result && !loading && <ResultPanel result={result} onRetry={reset} />}
      </div>

      {/* Drug info sidebar */}
      {drugPanel && <DrugInfoPanel drugName={drugPanel} onClose={() => setDrugPanel(null)} />}
    </div>
  );
}
