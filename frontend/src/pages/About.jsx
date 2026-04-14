// pages/About.jsx
import { ExternalLink, FlaskConical, Cpu, Database, Github } from "lucide-react";

const Section = ({ title, children, delay = 0 }) => (
  <section style={{ marginBottom: 40, animation: `fadeUp 0.5s ease ${delay}ms both` }}>
    <h2 style={{
      fontSize: 20, fontWeight: 800, marginBottom: 16,
      letterSpacing: "-0.02em", color: "var(--text-primary)",
    }}>{title}</h2>
    {children}
  </section>
);

const Card = ({ children, style = {} }) => (
  <div style={{
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)", padding: "24px 28px", ...style,
  }}>
    {children}
  </div>
);

const Link = ({ href, children }) => (
  <a href={href} target="_blank" rel="noreferrer" style={{
    color: "var(--teal)", textDecoration: "none",
    display: "inline-flex", alignItems: "center", gap: 4,
    borderBottom: "1px solid var(--teal-mid)",
  }}
    onMouseEnter={e => e.currentTarget.style.borderBottomColor = "var(--teal)"}
    onMouseLeave={e => e.currentTarget.style.borderBottomColor = "var(--teal-mid)"}
  >
    {children} <ExternalLink size={11} />
  </a>
);

export default function About() {
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 80px" }}>

      {/* Header */}
      <div style={{ marginBottom: 40, animation: "fadeUp 0.5s ease both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <FlaskConical size={32} color="var(--teal)" />
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em" }}>
            About MolGuard
          </h1>
        </div>
        <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.8, maxWidth: 640 }}>
          MolGuard uses Graph Neural Networks (GNN) and SMILES molecular fingerprints to predict
          whether a drug and food combination is safe or potentially harmful — at the molecular level.
        </p>
      </div>

      {/* How it works */}
      <Section title="How It Works" delay={60}>
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {[
              ["1. Input",        "Enter a drug name and a food name. The system looks up the drug's SMILES string from our dataset or queries PubChem live for new drugs."],
              ["2. Constituent Lookup", "The food's chemical constituents (e.g. Grapefruit → Furanocoumarins, Naringenin) are retrieved from the food dataset with their SMILES."],
              ["3. GNN Prediction", "Each (drug SMILES, constituent SMILES) pair is passed through a D-MPNN Graph Neural Network. The model encodes molecular graphs — atoms as nodes, bonds as edges — and predicts interaction probability."],
              ["4. Aggregation",  "All constituent predictions are combined. If any constituent has probability ≥ 0.5 (or custom threshold), the combination is flagged UNSAFE with the highest severity shown."],
              ["5. Output",       "The result shows Safe / Unsafe, risk level, confidence %, constituent breakdown, and interaction effects."],
            ].map(([step, desc]) => (
              <div key={step} style={{ display: "flex", gap: 16 }}>
                <div style={{
                  fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--teal)",
                  background: "var(--teal-dim)", border: "1px solid var(--border-glow)",
                  padding: "3px 10px", borderRadius: 99, whiteSpace: "nowrap",
                  alignSelf: "flex-start", marginTop: 2,
                }}>
                  {step}
                </div>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* Model */}
      <Section title="The Model — D-MPNN" delay={120}>
        <Card>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 20 }}>
            <Cpu size={20} color="var(--teal)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8 }}>
              The Directed Message Passing Neural Network (D-MPNN) from&nbsp;
              <Link href="https://github.com/chemprop/chemprop">Chemprop</Link>&nbsp;
              encodes molecular graphs where atoms are nodes and bonds are directed edges.
              This allows the model to reason about functional groups, bond types, and
              ring systems rather than just atom-level features. Two separate encoders
              process the drug and food constituent simultaneously — their embeddings are
              concatenated and fed to a 3-layer FFN classifier.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
            {[
              ["Architecture", "D-MPNN + FFN"],
              ["Inputs",       "2 × SMILES"],
              ["Hidden Dim",   "300"],
              ["FFN Layers",   "3"],
              ["Dropout",      "20%"],
              ["Loss",         "BCEWithLogits"],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: "12px 14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{k}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--teal)", fontFamily: "var(--font-mono)" }}>{v}</div>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* Data sources */}
      <Section title="Data Sources" delay={180}>
        <Card>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 20 }}>
            <Database size={20} color="var(--amber)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8 }}>
              The datasets were curated from published pharmacological literature and
              cross-referenced with PubChem for SMILES accuracy.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              ["DrugBank",    "https://go.drugbank.com",              "Drug SMILES, interactions, pharmacology"],
              ["PubChem",     "https://pubchem.ncbi.nlm.nih.gov",     "Live SMILES lookup for new/unknown drugs"],
              ["FooDB",       "https://foodb.ca",                     "Food constituent chemical data"],
              ["USDA FoodData","https://fdc.nal.usda.gov",            "Food nutritional composition"],
              ["Chemprop",    "https://github.com/chemprop/chemprop", "D-MPNN model library"],
            ].map(([name, url, desc]) => (
              <div key={name} style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "10px 14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                <a href={url} target="_blank" rel="noreferrer" style={{
                  fontSize: 13, fontWeight: 700, color: "var(--teal)", textDecoration: "none",
                  minWidth: 140, display: "flex", alignItems: "center", gap: 5,
                }}>
                  {name} <ExternalLink size={11} />
                </a>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{desc}</span>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* Tech stack */}
      <Section title="Tech Stack" delay={240}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
          {[
            { layer:"Model",    tech:"Chemprop D-MPNN (PyTorch)",  color:"var(--teal)"  },
            { layer:"Training", tech:"Google Colab (T4 GPU)",       color:"var(--teal)"  },
            { layer:"Backend",  tech:"FastAPI + Uvicorn",           color:"var(--amber)" },
            { layer:"Frontend", tech:"React 18 + Vite",            color:"var(--amber)" },
            { layer:"Chem",     tech:"RDKit (Python + JS WASM)",   color:"#9b59b6"      },
            { layer:"Deploy",   tech:"Docker + docker-compose",    color:"#3498db"      },
          ].map(({ layer, tech, color }) => (
            <div key={layer} style={{
              padding: "16px 18px",
              background: "var(--bg-card)", border: `1px solid ${color}30`,
              borderRadius: "var(--radius)", borderLeft: `3px solid ${color}`,
            }}>
              <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>{layer}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{tech}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Disclaimer */}
      <div style={{
        padding: "18px 22px",
        background: "rgba(255,165,2,0.06)",
        border: "1px solid rgba(255,165,2,0.25)",
        borderRadius: "var(--radius-lg)",
        animation: "fadeUp 0.5s ease 0.3s both",
      }}>
        <p style={{ fontSize: 13, color: "rgba(255,165,2,0.9)", lineHeight: 1.7, margin: 0 }}>
          ⚠️ <strong>Medical Disclaimer:</strong> MolGuard is an educational and research tool.
          Predictions are based on molecular structure similarity and may not capture all
          pharmacokinetic or pharmacodynamic interactions. Always consult a qualified healthcare
          professional or pharmacist before making decisions about drug therapy or diet.
        </p>
      </div>
    </div>
  );
}
