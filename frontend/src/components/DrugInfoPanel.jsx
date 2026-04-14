// components/DrugInfoPanel.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import { Pill, X, ExternalLink, Loader2 } from "lucide-react";

const API = "http://localhost:8000";

export default function DrugInfoPanel({ drugName, onClose }) {
  const [info,    setInfo]    = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!drugName) return;
    setLoading(true);
    setInfo(null);
    axios.get(`${API}/drug/${encodeURIComponent(drugName)}`)
      .then((r) => setInfo(r.data))
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, [drugName]);

  if (!drugName) return null;

  return (
    <div style={{
      position: "fixed", top: 0, right: 0,
      width: 340, height: "100vh",
      background: "var(--bg-card)",
      borderLeft: "1px solid var(--border)",
      zIndex: 100, overflowY: "auto",
      animation: "slideIn 0.3s ease",
      boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 20px 16px",
        borderBottom: "1px solid var(--border)",
        position: "sticky", top: 0,
        background: "var(--bg-card)",
        backdropFilter: "blur(8px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Pill size={16} color="var(--teal)" />
          <span style={{ fontWeight: 700, fontSize: 15 }}>{drugName}</span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-muted)", transition: "color 0.2s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--red)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ padding: "20px" }}>
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-secondary)" }}>
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13 }}>Loading drug info...</span>
          </div>
        )}

        {info && !loading && (
          <>
            {/* SMILES */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.12em",
                color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase",
              }}>
                SMILES String
              </div>
              <div style={{
                background: "var(--bg)", padding: "10px 12px",
                borderRadius: 8, border: "1px solid var(--border)",
                fontSize: 10, fontFamily: "var(--font-mono)",
                color: "var(--teal)", wordBreak: "break-all", lineHeight: 1.6,
              }}>
                {info.drug_smiles || "Not available"}
              </div>
            </div>

            {/* Source badge */}
            {info.source === "PubChem" && (
              <div style={{
                padding: "8px 12px", marginBottom: 20,
                background: "rgba(0,200,170,0.06)",
                border: "1px solid var(--border-glow)",
                borderRadius: 8, fontSize: 12, color: "var(--teal)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <ExternalLink size={12} />
                SMILES fetched live from PubChem API
              </div>
            )}

            {/* Known harmful constituents */}
            {info.interactions && info.interactions.length > 0 && (
              <div>
                <div style={{
                  fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.12em",
                  color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase",
                }}>
                  Known Harmful Constituents ({info.interactions.filter(i => i.label === 1).length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {info.interactions
                    .filter((i) => i.label === 1)
                    .map((i) => (
                      <div key={i.harmful_constituent} style={{
                        padding: "10px 12px",
                        background: "var(--red-dim)",
                        border: "1px solid var(--red-border)",
                        borderRadius: 8,
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                          {i.harmful_constituent}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                          {i.interaction_effect}
                        </div>
                        <div style={{
                          marginTop: 6, fontSize: 10,
                          fontFamily: "var(--font-mono)",
                          color: i.severity === "Critical" ? "#ff2d55" :
                                 i.severity === "High"     ? "var(--red)" :
                                 i.severity === "Moderate" ? "var(--amber)" : "var(--teal)",
                        }}>
                          ● {i.severity} severity
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* PubChem link */}
            <a
              href={`https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(drugName)}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 8,
                marginTop: 20, padding: "10px 14px",
                background: "var(--teal-dim)",
                border: "1px solid var(--border-glow)",
                borderRadius: 8, textDecoration: "none",
                fontSize: 12, color: "var(--teal)",
                transition: "background 0.2s",
              }}
            >
              <ExternalLink size={13} />
              View on PubChem
            </a>
          </>
        )}

        {!info && !loading && (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            No details available for this drug.
          </p>
        )}
      </div>
    </div>
  );
}
