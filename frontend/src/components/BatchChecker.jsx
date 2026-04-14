// components/BatchChecker.jsx
// Allows users to check multiple drug+food pairs at once via /predict/batch

import { useState } from "react";
import axios from "axios";
import {
  Plus, Trash2, Play, AlertTriangle, CheckCircle2,
  Loader2, Download, X, BarChart2
} from "lucide-react";

const API = "http://localhost:8000";

const EMPTY_ROW = () => ({ id: Date.now(), drug: "", food: "" });

function StatusBadge({ label }) {
  const safe = label === "SAFE";
  return (
    <span style={{
      padding: "3px 12px", borderRadius: 99,
      fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)",
      color: safe ? "var(--teal)" : "var(--red)",
      background: safe ? "var(--teal-dim)" : "var(--red-dim)",
      border: `1px solid ${safe ? "var(--border-glow)" : "var(--red-border)"}`,
    }}>
      {label}
    </span>
  );
}

export default function BatchChecker({ drugs = [], foods = [] }) {
  const [rows,    setRows]    = useState([EMPTY_ROW()]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const addRow    = () => setRows(r => [...r, EMPTY_ROW()]);
  const removeRow = (id) => setRows(r => r.filter(x => x.id !== id));
  const updateRow = (id, field, val) =>
    setRows(r => r.map(x => x.id === id ? { ...x, [field]: val } : x));

  const runBatch = async () => {
    const valid = rows.filter(r => r.drug.trim() && r.food.trim());
    if (!valid.length) { setError("Add at least one complete drug + food pair."); return; }
    setError(""); setLoading(true); setResults([]);

    try {
      const { data } = await axios.post(`${API}/predict/batch`, {
        pairs: valid.map(r => ({ drug_name: r.drug.trim(), food_name: r.food.trim() })),
      });
      setResults(data.results);
    } catch (err) {
      setError(err.response?.data?.detail || "Batch request failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const header = "Drug,Food,Result,Risk,Max Probability,Harmful Constituents";
    const rows_csv = results.map(r => {
      if (r.error) return `${r.drug_name},${r.food_name},ERROR,,,`;
      const harmful = r.constituents_checked?.filter(c => c.label === "UNSAFE").map(c => c.constituent_name).join("; ");
      return `${r.drug_name},${r.food_name},${r.overall_label},${r.overall_risk},${r.max_probability},"${harmful}"`;
    });
    const blob = new Blob([[header, ...rows_csv].join("\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "molguard_batch_results.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const unsafeCount = results.filter(r => r.overall_label === "UNSAFE").length;
  const safeCount   = results.filter(r => r.overall_label === "SAFE").length;

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
      animation: "fadeUp 0.4s ease both",
    }}>
      {/* Header */}
      <div style={{
        padding: "18px 24px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{
          fontSize: 12, fontFamily: "var(--font-mono)", letterSpacing: "0.12em",
          color: "var(--text-secondary)", textTransform: "uppercase",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <BarChart2 size={14} color="var(--teal)" />
          Batch Interaction Checker
        </div>
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          max 20 pairs
        </span>
      </div>

      {/* Pair input rows */}
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((row, i) => (
          <div key={row.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{
              fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)",
              minWidth: 20, textAlign: "right",
            }}>
              {String(i + 1).padStart(2, "0")}
            </span>

            {/* Drug input */}
            <input
              list={`drugs-${row.id}`}
              value={row.drug}
              onChange={e => updateRow(row.id, "drug", e.target.value)}
              placeholder="Drug name..."
              style={{
                flex: 1, padding: "10px 14px",
                background: "var(--bg-card2)", border: "1px solid var(--border)",
                borderRadius: "var(--radius)", color: "var(--text-primary)",
                fontFamily: "var(--font-display)", fontSize: 13, outline: "none",
              }}
            />
            <datalist id={`drugs-${row.id}`}>
              {drugs.map(d => <option key={d} value={d} />)}
            </datalist>

            <span style={{ color: "var(--text-muted)", fontSize: 16 }}>+</span>

            {/* Food input */}
            <input
              list={`foods-${row.id}`}
              value={row.food}
              onChange={e => updateRow(row.id, "food", e.target.value)}
              placeholder="Food name..."
              style={{
                flex: 1, padding: "10px 14px",
                background: "var(--bg-card2)", border: "1px solid var(--border)",
                borderRadius: "var(--radius)", color: "var(--text-primary)",
                fontFamily: "var(--font-display)", fontSize: 13, outline: "none",
              }}
            />
            <datalist id={`foods-${row.id}`}>
              {foods.map(f => <option key={f} value={f} />)}
            </datalist>

            {/* Remove row */}
            <button
              onClick={() => removeRow(row.id)}
              disabled={rows.length === 1}
              style={{
                background: "none", border: "none", cursor: rows.length === 1 ? "not-allowed" : "pointer",
                color: rows.length === 1 ? "var(--text-muted)" : "var(--text-secondary)",
                padding: 4, transition: "color 0.15s",
              }}
              onMouseEnter={e => { if (rows.length > 1) e.currentTarget.style.color = "var(--red)"; }}
              onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}
            >
              <X size={15} />
            </button>
          </div>
        ))}

        {/* Add row button */}
        {rows.length < 20 && (
          <button
            onClick={addRow}
            style={{
              padding: "8px", background: "none",
              border: "1px dashed var(--border)", borderRadius: "var(--radius)",
              color: "var(--text-muted)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontSize: 12, fontFamily: "var(--font-mono)", transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--teal)"; e.currentTarget.style.color = "var(--teal)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            <Plus size={14} /> Add pair ({rows.length}/20)
          </button>
        )}

        {error && (
          <div style={{
            padding: "10px 14px", background: "var(--red-dim)",
            border: "1px solid var(--red-border)", borderRadius: "var(--radius)",
            fontSize: 13, color: "var(--red)",
          }}>
            {error}
          </div>
        )}

        {/* Run button */}
        <button
          onClick={runBatch}
          disabled={loading}
          style={{
            padding: "13px", marginTop: 4,
            background: loading ? "var(--teal-dim)" : "var(--teal)",
            color: loading ? "var(--teal)" : "var(--bg)",
            border: "1px solid var(--teal)", borderRadius: "var(--radius)",
            fontSize: 14, fontWeight: 700, fontFamily: "var(--font-display)",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            transition: "all 0.2s",
          }}
        >
          {loading
            ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Running batch predictions...</>
            : <><Play size={16} /> Run {rows.filter(r => r.drug && r.food).length} Predictions</>}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          {/* Summary bar */}
          <div style={{
            padding: "14px 24px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "var(--bg-card2)",
          }}>
            <div style={{ display: "flex", gap: 20 }}>
              <span style={{ fontSize: 13, color: "var(--teal)", fontFamily: "var(--font-mono)" }}>
                <CheckCircle2 size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />
                {safeCount} SAFE
              </span>
              <span style={{ fontSize: 13, color: "var(--red)", fontFamily: "var(--font-mono)" }}>
                <AlertTriangle size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />
                {unsafeCount} UNSAFE
              </span>
            </div>
            <button
              onClick={exportCSV}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", background: "none",
                border: "1px solid var(--border)", borderRadius: "var(--radius)",
                fontSize: 12, color: "var(--text-secondary)", cursor: "pointer",
                fontFamily: "var(--font-mono)", transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--teal)"; e.currentTarget.style.color = "var(--teal)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              <Download size={13} /> Export CSV
            </button>
          </div>

          {/* Result table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%", borderCollapse: "collapse",
              fontSize: 13, fontFamily: "var(--font-display)",
            }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["#", "Drug", "Food", "Result", "Risk", "Max Prob", "Harmful Constituents"].map(h => (
                    <th key={h} style={{
                      padding: "10px 16px", textAlign: "left",
                      fontSize: 10, fontFamily: "var(--font-mono)",
                      color: "var(--text-muted)", letterSpacing: "0.1em",
                      textTransform: "uppercase", fontWeight: 400,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  if (r.error) return (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 16px", color: "var(--text-muted)" }}>{i+1}</td>
                      <td style={{ padding: "10px 16px" }}>{r.drug_name}</td>
                      <td style={{ padding: "10px 16px" }}>{r.food_name}</td>
                      <td colSpan={4} style={{ padding: "10px 16px", color: "var(--red)", fontSize: 12 }}>
                        Error: {r.error}
                      </td>
                    </tr>
                  );

                  const harmful = r.constituents_checked?.filter(c => c.label === "UNSAFE") || [];
                  return (
                    <tr key={i} style={{
                      borderBottom: "1px solid var(--border)",
                      background: r.overall_label === "UNSAFE" ? "rgba(255,71,87,0.03)" : "transparent",
                      transition: "background 0.15s",
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--teal-dim)"}
                      onMouseLeave={e => e.currentTarget.style.background = r.overall_label === "UNSAFE" ? "rgba(255,71,87,0.03)" : "transparent"}
                    >
                      <td style={{ padding: "10px 16px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 11 }}>{i+1}</td>
                      <td style={{ padding: "10px 16px", fontWeight: 600 }}>{r.drug_name}</td>
                      <td style={{ padding: "10px 16px", color: "var(--text-secondary)" }}>{r.food_name}</td>
                      <td style={{ padding: "10px 16px" }}>
                        <StatusBadge label={r.overall_label} />
                      </td>
                      <td style={{ padding: "10px 16px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                        {r.overall_risk}
                      </td>
                      <td style={{ padding: "10px 16px", fontFamily: "var(--font-mono)", fontSize: 12,
                        color: r.max_probability >= 0.7 ? "var(--red)" : r.max_probability >= 0.4 ? "var(--amber)" : "var(--teal)" }}>
                        {Math.round(r.max_probability * 100)}%
                      </td>
                      <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--text-secondary)" }}>
                        {harmful.length > 0
                          ? harmful.map(c => c.constituent_name).join(", ")
                          : <span style={{ color: "var(--teal)" }}>None</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
