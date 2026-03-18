import { useState } from "react";

const API_ENDPOINT = "/api/summarize";
const SNOWFLAKE_MCP = "https://5571.apim.mcp.workato.com";

const SUMMARY_TYPES = [
  {
    id: "relationship", label: "顧客関係サマリー", icon: "👥", desc: "商談経緯・キーマン・時系列",
    prompt: (name, period) => `あなたはCADDiのエンタープライズ営業部長のアシスタントです。以下は「${name}」に関するSlackの会話ログです（複数チャンネル横断・直近${period}日）。\n\n【重要な指示】\n1. 登場人物を必ずリストアップ（顧客側キーマン：氏名・役職・会社名、CADDi担当者：氏名・役割）\n2. 親会社・子会社・グループ会社が混在する場合、会社ごとにセクションを完全に分けること\n3. 各会社のサマリーは必ず時系列（日付付き）で記述すること\n\n## 👥 登場人物\n### 顧客側キーマン\n| 氏名 | 役職 | 会社名 |\n|---|---|---|\n\n### CADDi担当者\n| 氏名 | 役割 |\n|---|---|\n\n## 📊 会社別 商談サマリー（時系列）\n### [会社名] — [ステータス]\n| 時期 | 主な動き |\n|---|---|\n\n## 🎯 優先アクション\n| 優先度 | 案件 | アクション | 期限 |\n|---|---|---|---|\n\n顧客名: ${name}\n\n`,
  },
  {
    id: "deal", label: "案件進捗", icon: "📈", desc: "商談ステータス・ネクストアクション",
    prompt: (name, period) => `CADDiの営業観点で「${name}」の案件進捗を時系列でまとめてください（直近${period}日）。会社ごとに分けて日付付き時系列で。人物情報も必ずリストアップ。\n\n顧客名: ${name}\n\n`,
  },
  {
    id: "weekly", label: "週次サマリー", icon: "📅", desc: "直近の活動まとめ",
    prompt: (name, period) => `「${name}」に関する直近${period}日のSlack会話から週次サマリーを作成。①主要トピック ②重要な意思決定 ③進捗 ④来週のアクション。人物情報も必ずリストアップ。\n\n顧客名: ${name}\n\n`,
  },
  {
    id: "competitor", label: "競合情報", icon: "🔍", desc: "競合他社の言及・比較情報",
    prompt: (name, period) => `「${name}」関連のSlackログ（直近${period}日）から競合情報を抽出。①言及された競合 ②比較・評価 ③顧客の反応 ④示唆されるアクション。\n\n顧客名: ${name}\n\n`,
  },
];

const PERIOD_OPTIONS = [
  { value: 30, label: "直近30日" },
  { value: 90, label: "直近90日" },
  { value: 180, label: "直近180日" },
  { value: 365, label: "直近1年" },
];

const QUICK_NAMES = ["ニデック", "日立製作所", "コマツ", "UACJ", "住友電装"];

function MarkdownRenderer({ text }) {
  const lines = text.split("\n");
  const elements = [];
  let tableLines = [], inTable = false, key = 0;
  const flushTable = () => {
    if (tableLines.length >= 2) {
      const headers = tableLines[0].split("|").filter(c => c.trim());
      const rows = tableLines.slice(2).map(r => r.split("|").filter(c => c.trim()));
      elements.push(
        <div key={key++} style={{ overflowX: "auto", margin: "10px 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr>{headers.map((h, i) => <th key={i} style={{ padding: "6px 10px", background: "#f5f5f3", borderBottom: "1px solid #ddd", textAlign: "left", fontWeight: 500, whiteSpace: "nowrap" }}>{h.trim()}</th>)}</tr></thead>
            <tbody>{rows.map((row, ri) => <tr key={ri} style={{ borderBottom: "1px solid #eee" }}>{row.map((cell, ci) => <td key={ci} style={{ padding: "6px 10px", verticalAlign: "top" }}>{cell.trim()}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    }
    tableLines = []; inTable = false;
  };
  const renderInline = (txt) => txt.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : p
  );
  for (const line of lines) {
    if (line.startsWith("|")) { if (!inTable) inTable = true; tableLines.push(line); continue; }
    if (inTable) flushTable();
    if (line.startsWith("## ")) elements.push(<h2 key={key++} style={{ fontSize: 16, fontWeight: 600, marginTop: 24, marginBottom: 8, borderBottom: "1px solid #eee", paddingBottom: 4 }}>{line.slice(3)}</h2>);
    else if (line.startsWith("### ")) elements.push(<h3 key={key++} style={{ fontSize: 14, fontWeight: 600, marginTop: 16, marginBottom: 6 }}>{line.slice(4)}</h3>);
    else if (line.startsWith("- ") || line.startsWith("• ")) elements.push(<div key={key++} style={{ fontSize: 13, lineHeight: 1.7, paddingLeft: 12, marginBottom: 2 }}>・{renderInline(line.slice(2))}</div>);
    else if (line.startsWith("---")) elements.push(<hr key={key++} style={{ border: "none", borderTop: "1px solid #eee", margin: "16px 0" }} />);
    else if (line.trim()) elements.push(<p key={key++} style={{ fontSize: 13, lineHeight: 1.8, margin: "4px 0" }}>{renderInline(line)}</p>);
  }
  if (inTable) flushTable();
  return <div>{elements}</div>;
}

export default function App() {
  const [customerName, setCustomerName] = useState("");
  const [period, setPeriod] = useState(365);
  const [summaryType, setSummaryType] = useState("relationship");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState("");
  const [rowCount, setRowCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const selectedType = SUMMARY_TYPES.find(t => t.id === summaryType);

  async function callAPI(messages, mcp_servers) {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, ...(mcp_servers ? { mcp_servers } : {}) }),
    });
    return res.json();
  }

  async function handleSubmit() {
    if (!customerName.trim()) { setError("顧客名を入力してください"); return; }
    setLoading(true); setError(""); setSummary(""); setRowCount(0);
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);
    try {
      setLoadingStep("Snowflakeからデータ取得中...");
      const sql = `SELECT channel_name, user_id, text, datetime FROM SLACK.MESSAGES WHERE text ILIKE '%${customerName.replace(/'/g, "''")}%' AND text != '' AND datetime >= DATEADD(day, -${period}, CURRENT_DATE) ORDER BY datetime ASC LIMIT 300`;
      const sfData = await callAPI(
        [{ role: "user", content: `次のSQLをSnowflakeで実行して結果をJSONのみで返してください。説明不要。\nSQL: ${sql}` }],
        [{ type: "url", url: SNOWFLAKE_MCP, name: "snowflake-workato" }]
      );
      let rows = [];
      for (const tr of sfData.content?.filter(b => b.type === "mcp_tool_result") || []) {
        try { const p = JSON.parse(tr.content?.[0]?.text || "{}"); rows = p?.result?.result?.rows || p?.rows || []; if (rows.length) break; } catch {}
      }
      if (!rows.length) {
        for (const tb of sfData.content?.filter(b => b.type === "text") || []) {
          const m = tb.text?.match(/\{[\s\S]+\}/);
          if (m) { try { const p = JSON.parse(m[0]); rows = p?.result?.result?.rows || p?.rows || []; if (rows.length) break; } catch {} }
        }
      }
      if (!rows.length) { setError(`「${customerName}」に関するメッセージが見つかりませんでした`); return; }
      setRowCount(rows.length);
      setLoadingStep(`${rows.length}件のメッセージをAIが分析中...`);
      const formatted = rows.map(r => `[${(r.datetime || "").slice(0, 16)}] #${r.channel_name || ""}\n${r.text || ""}`).join("\n\n");
      const sumData = await callAPI([{ role: "user", content: selectedType.prompt(customerName, period) + formatted }]);
      setSummary(sumData.content?.find(b => b.type === "text")?.text || "");
    } catch (e) {
      setError("エラー: " + e.message);
    } finally {
      clearInterval(timer); setLoading(false); setLoadingStep("");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f4", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#1a1a1a" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e8e6e0", padding: "14px 24px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ width: 32, height: 32, background: "#1a1a1a", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💬</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Slack サマリーツール</div>
          <div style={{ fontSize: 11, color: "#888" }}>Snowflake × Claude — CADDi Enterprise</div>
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px", display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #e8e6e0" }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>🏢 顧客名</div>
            <input value={customerName} onChange={e => setCustomerName(e.target.value)} onKeyDown={e => e.key === "Enter" && !loading && handleSubmit()} placeholder="例: ニデック、日立製作所" style={{ width: "100%", padding: "10px 12px", fontSize: 14, borderRadius: 8, border: "1px solid #ddd", outline: "none", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = "#1a1a1a"} onBlur={e => e.target.style.borderColor = "#ddd"} />
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {QUICK_NAMES.map(n => <button key={n} onClick={() => setCustomerName(n)} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, border: "1px solid #ddd", background: customerName === n ? "#1a1a1a" : "#f5f5f3", color: customerName === n ? "#fff" : "#555", cursor: "pointer" }}>{n}</button>)}
            </div>
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #e8e6e0" }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>📅 対象期間</div>
            {PERIOD_OPTIONS.map(opt => <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "7px 10px", borderRadius: 8, marginBottom: 4, border: period === opt.value ? "1.5px solid #1a1a1a" : "1px solid #eee", background: period === opt.value ? "#f5f5f3" : "transparent" }}><input type="radio" name="period" value={opt.value} checked={period === opt.value} onChange={() => setPeriod(opt.value)} /><span style={{ fontSize: 13, fontWeight: period === opt.value ? 600 : 400 }}>{opt.label}</span></label>)}
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #e8e6e0" }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>📊 サマリータイプ</div>
            {SUMMARY_TYPES.map(t => <button key={t.id} onClick={() => setSummaryType(t.id)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, textAlign: "left", cursor: "pointer", marginBottom: 4, border: summaryType === t.id ? "1.5px solid #1a1a1a" : "1px solid #eee", background: summaryType === t.id ? "#f5f5f3" : "transparent" }}><div style={{ fontSize: 13, fontWeight: summaryType === t.id ? 600 : 400 }}>{t.icon} {t.label}</div><div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>{t.desc}</div></button>)}
          </div>
          <button onClick={handleSubmit} disabled={loading || !customerName.trim()} style={{ padding: "13px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading || !customerName.trim() ? "not-allowed" : "pointer", background: loading || !customerName.trim() ? "#e8e6e0" : "#1a1a1a", color: loading || !customerName.trim() ? "#aaa" : "#fff", border: "none" }}>
            {loading ? `⏳ 処理中... (${elapsed}s)` : "🔍 サマリーを生成"}
          </button>
          {error && <div style={{ padding: "12px 14px", borderRadius: 8, background: "#fff0f0", color: "#c0392b", fontSize: 13, border: "1px solid #fcc" }}>{error}</div>}
        </div>
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e6e0", overflow: "hidden", minHeight: 500 }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 500, gap: 16 }}>
              <div style={{ fontSize: 40 }}>⚙️</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{loadingStep}</div>
              <div style={{ fontSize: 13, color: "#888" }}>「{customerName}」のSlackデータを分析中</div>
              <div style={{ fontSize: 12, color: "#aaa" }}>経過: {elapsed}秒</div>
            </div>
          ) : summary ? (
            <div>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafaf8" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedType.icon} {selectedType.label} — {customerName}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{PERIOD_OPTIONS.find(o => o.value === period)?.label} ／ {rowCount}件分析</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => navigator.clipboard?.writeText(summary)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", fontSize: 12, cursor: "pointer" }}>📋 コピー</button>
                  <button onClick={() => { setSummary(""); setRowCount(0); }} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", fontSize: 12, cursor: "pointer" }}>✕</button>
                </div>
              </div>
              <div style={{ padding: "20px 24px", overflowY: "auto", maxHeight: "calc(100vh - 200px)" }}>
                <MarkdownRenderer text={summary} />
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 500, gap: 10, color: "#aaa" }}>
              <div style={{ fontSize: 48, opacity: 0.2 }}>💬</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#666" }}>顧客名を入力してサマリーを生成</div>
              <div style={{ fontSize: 12 }}>Snowflakeから直接Slackデータを取得し、Claudeが分析します</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
