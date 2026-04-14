// pages/Dashboard.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart2, Database, Cpu, AlertTriangle, CheckCircle2,
  FlaskConical, Loader2, TrendingUp, Layers, RefreshCw
} from "lucide-react";

const API = "http://localhost:8000";

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = "var(--teal)", delay = 0 }) {
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)", padding: "22px 24px",
      animation: `fadeUp 0.5s ease ${delay}ms both`,
      transition: "border-color 0.2s, box-shadow 0.2s",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 0 20px ${color}20`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: `${color}15`,
        border: `1px solid ${color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 14,
      }}>
        <Icon size={18} color={color} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--font-mono)", color, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );
}

// ── Metric row ────────────────────────────────────────────────────────────────
function MetricRow({ label, value, max = 1, color = "var(--teal)" }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</span>
        <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", color, fontWeight: 700 }}>
          {value !== undefined ? `${pct}%` : "—"}
        </span>
      </div>
      <div style={{ height: 8, background: "var(--bg)", borderRadius: 99, overflow: "hidden", border: "1px solid var(--border)" }}>
        <div style={{
          width: `${pct}%`, height: "100%", background: color,
          borderRadius: 99, transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: `0 0 10px ${color}60`,
        }} />
      </div>
    </div>
  );
}

// ── Severity pill ─────────────────────────────────────────────────────────────
function SeverityBar({ counts }) {
  const total  = Object.values(counts).reduce((a, b) => a + b, 0);
  const colors = { Critical: "#ff2d55", High: "#ff4757", Moderate: "#ffa502", Low: "#2ed573", Unknown: "#7a9e95" };
  return (
    <div>
      <div style={{ display: "flex", height: 12, borderRadius: 99, overflow: "hidden", marginBottom: 12, gap: 2 }}>
        {Object.entries(counts).map(([sev, cnt]) => (
          <div key={sev} title={`${sev}: ${cnt}`} style={{
            flex: cnt, background: colors[sev] || "#7a9e95",
            transition: "flex 0.8s ease",
          }} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {Object.entries(counts).map(([sev, cnt]) => (
          <div key={sev} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors[sev] || "#7a9e95" }} />
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{sev}: <strong style={{ color: "var(--text-primary)" }}>{cnt}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Category pills ────────────────────────────────────────────────────────────
function CategoryPills({ counts }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {Object.entries(counts).map(([cat, cnt]) => (
        <div key={cat} style={{
          padding: "5px 12px", borderRadius: 99,
          background: "var(--bg)", border: "1px solid var(--border)",
          fontSize: 12, color: "var(--text-secondary)",
        }}>
          {cat} <span style={{ color: "var(--teal)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{cnt}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const load = () => {
    setLoading(true); setError("");
    axios.get(`${API}/stats`)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => { setError("Could not load stats — is the backend running?"); setLoading(false); });
  };

  useEffect(load, []);

  const model   = data?.model;
  const dataset = data?.dataset;
  const di      = dataset?.drug_interactions;
  const fc      = dataset?.food_constituents;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px 80px" }}>

      {/* Header */}
      <div style={{ marginBottom: 36, animation: "fadeUp 0.5s ease both" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>
              Model Dashboard
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              Dataset statistics, model performance metrics and architecture overview.
            </p>
          </div>
          <button onClick={load} disabled={loading}
            style={{ padding: "8px 16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: 12, color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--teal)"; e.currentTarget.style.color = "var(--teal)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
            <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-secondary)", padding: 40, justifyContent: "center" }}>
          <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} color="var(--teal)" />
          Loading dashboard data...
        </div>
      )}

      {error && (
        <div style={{ padding: "16px 20px", background: "var(--red-dim)", border: "1px solid var(--red-border)", borderRadius: "var(--radius)", color: "var(--red)", fontSize: 14 }}>
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          {/* ── Dataset Overview ── */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 13, fontFamily: "var(--font-mono)", letterSpacing: "0.15em", color: "var(--text-secondary)", marginBottom: 20, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
              <Database size={14} /> Dataset Overview
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16 }}>
              <StatCard icon={FlaskConical} label="Unique Drugs"     value={di?.unique_drugs        ?? "—"} sub="in interaction dataset"  delay={0}   />
              <StatCard icon={Layers}       label="Constituents"     value={di?.unique_constituents  ?? "—"} sub="harmful + safe"          delay={60}  />
              <StatCard icon={AlertTriangle} label="Unsafe Pairs"   value={di?.label_1_unsafe       ?? "—"} sub="label = 1"               delay={120} color="var(--red)"   />
              <StatCard icon={CheckCircle2} label="Safe Pairs"      value={di?.label_0_safe         ?? "—"} sub="label = 0"               delay={180} />
              <StatCard icon={Database}     label="Foods Mapped"    value={fc?.unique_foods          ?? "—"} sub="in food dataset"         delay={240} color="var(--amber)" />
              <StatCard icon={BarChart2}    label="Food Constituents" value={fc?.unique_constituents ?? "—"} sub="unique chemical entities" delay={300} color="var(--amber)" />
            </div>
          </section>

          {/* ── Severity Breakdown ── */}
          {di?.severity_counts && Object.keys(di.severity_counts).length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 13, fontFamily: "var(--font-mono)", letterSpacing: "0.15em", color: "var(--text-secondary)", marginBottom: 20, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={14} /> Interaction Severity Distribution
              </h2>
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "24px 28px", animation: "fadeUp 0.5s ease 0.1s both" }}>
                <SeverityBar counts={di.severity_counts} />
              </div>
            </section>
          )}

          {/* ── Food Constituent Categories ── */}
          {fc?.category_counts && Object.keys(fc.category_counts).length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 13, fontFamily: "var(--font-mono)", letterSpacing: "0.15em", color: "var(--text-secondary)", marginBottom: 20, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
                <Layers size={14} /> Constituent Categories
              </h2>
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "24px 28px", animation: "fadeUp 0.5s ease 0.15s both" }}>
                <CategoryPills counts={fc.category_counts} />
              </div>
            </section>
          )}

          {/* ── Model Performance ── */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 13, fontFamily: "var(--font-mono)", letterSpacing: "0.15em", color: "var(--text-secondary)", marginBottom: 20, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
              <TrendingUp size={14} /> Model Performance
            </h2>

            {model?.status === "not_trained" ? (
              <div style={{ padding: "28px 32px", background: "rgba(255,165,2,0.06)", border: "1px solid rgba(255,165,2,0.25)", borderRadius: "var(--radius-lg)", display: "flex", gap: 16, alignItems: "flex-start" }}>
                <Cpu size={22} color="var(--amber)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--amber)", marginBottom: 6 }}>Model Not Yet Trained</div>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                    {model.message}
                  </p>
                  <div style={{ marginTop: 14, padding: "10px 14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                    → Open colab/MolGuard_Training.ipynb in Google Colab → Run all cells → Download model_artifacts.zip → Place in backend/model_artifacts/
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, animation: "fadeUp 0.5s ease 0.2s both" }}>
                {/* Metrics */}
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "24px 28px" }}>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 20, textTransform: "uppercase" }}>
                    Test Set Metrics
                  </div>
                  <MetricRow label="AUC-ROC"  value={model.test_auc}      color="var(--teal)"  />
                  <MetricRow label="Accuracy" value={model.test_accuracy} color="var(--amber)" />
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "var(--text-secondary)" }}>Best Epoch</span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--teal)" }}>{model.best_epoch ?? "—"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 8 }}>
                      <span style={{ color: "var(--text-secondary)" }}>Best Val AUC</span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--teal)" }}>
                        {model.best_val_auc ? `${(model.best_val_auc * 100).toFixed(1)}%` : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Architecture */}
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "24px 28px" }}>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 20, textTransform: "uppercase" }}>
                    Architecture
                  </div>
                  {[
                    ["Model",       model.model_type ?? "D-MPNN"],
                    ["Hidden Dim",  model.hidden_dim],
                    ["FFN Layers",  model.n_layers],
                    ["Dropout",     model.dropout ? `${model.dropout * 100}%` : "—"],
                    ["Threshold",   model.threshold],
                    ["Inputs",      "2 SMILES (Drug + Constituent)"],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                      <span style={{ color: "var(--text-secondary)" }}>{k}</span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)", fontSize: 12 }}>{v ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── Architecture diagram ── */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 13, fontFamily: "var(--font-mono)", letterSpacing: "0.15em", color: "var(--text-secondary)", marginBottom: 20, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
              <Cpu size={14} /> GNN Architecture
            </h2>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "28px 32px", animation: "fadeUp 0.5s ease 0.3s both" }}>
              <pre style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--teal)", lineHeight: 1.9, margin: 0, overflowX: "auto" }}>{`
Drug SMILES ──────────────────────────────────────────────┐
                                                           ├──► Bond Message Passing (3 layers)
Food Constituent SMILES ──────────────────────────────────┘         │
                                                                Mean Aggregation
                                                                     │
                                                             ┌───────▼────────┐
                                                             │  Concat Embeds │  (dim = 300 × 2)
                                                             └───────┬────────┘
                                                                     │
                                                              FFN (3 layers, dropout=0.2)
                                                                     │
                                                             Sigmoid activation
                                                                     │
                                                          ┌──────────▼──────────┐
                                                          │  P(unsafe) ∈ [0,1]  │
                                                          │  threshold = 0.5    │
                                                          └──────────┬──────────┘
                                                                     │
                                                           ✅ SAFE  /  ⚠️ UNSAFE
              `.trim()}</pre>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
