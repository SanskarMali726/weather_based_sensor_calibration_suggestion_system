import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Wind, Droplets, Thermometer, CloudRain, Gauge, Cloud, Eye,
  Zap, AlertTriangle, Bell, Search, Settings, LayoutDashboard,
  BarChart3, History as HistoryIcon, FileText, ChevronDown,
  MapPin, Radar, ShieldCheck, Activity, Download, X, RefreshCw,
  WifiOff, Wifi, Sun, Moon, Info,
} from "lucide-react";

// City keys must match backend/services/weather_service.py CITY_COORDS exactly.
const CITIES = [
  { key: "Sector 4 - North Perimeter", label: "Sector 4 — North Perimeter" },
  { key: "Sector 7 - East Fence Line", label: "Sector 7 — East Fence Line" },
  { key: "Sector 2 - Coastal Gate", label: "Sector 2 — Coastal Gate" },
  { key: "Sector 9 - Ridge Watchtower", label: "Sector 9 — Ridge Watchtower" },
];

// Backend base URL — fixed, matches the FastAPI server (uvicorn app:app --port 8000).
// Not user-editable in the UI anymore; change this constant only if your backend
// actually runs somewhere else.
const API_BASE = "http://localhost:8000";

const NAV_ITEMS = [
  { key: "Dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "Weather", label: "Weather", icon: Cloud },
  { key: "Recommendations", label: "Recommendations", icon: ShieldCheck },
  { key: "Analytics", label: "Analytics", icon: BarChart3 },
  { key: "History", label: "History", icon: HistoryIcon },
  { key: "Reports", label: "Reports", icon: FileText },
];

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

const SENS_COLOR = { LOW: "var(--red)", MEDIUM: "var(--amber)", HIGH: "var(--green)" };
const RISK_COLOR = (r) => (r >= 65 ? "var(--red)" : r >= 32 ? "var(--amber)" : "var(--green)");

function fmtClock(d) {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}
function fmtTime(iso) {
  try { return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); }
  catch { return "--:--:--"; }
}

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let detail = res.statusText;
    try { const body = await res.json(); detail = body.detail || detail; } catch {}
    throw new Error(`${res.status} ${detail}`);
  }
  return res.json();
}

function Gauge3({ value, size = 168 }) {
  const r = size * 0.393, c = 2 * Math.PI * r;
  const pct = clamp(value, 0, 100) / 100;
  const color = RISK_COLOR(value);
  const cx = size / 2;
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <div className="radar-spin" style={{ position: "absolute", inset: 0, borderRadius: "50%" }} />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="10" />
        <circle
          cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`} transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: "stroke-dasharray 0.8s ease, stroke 0.5s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span className="mono" style={{ fontSize: size * 0.2, fontWeight: 600, color, lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--muted)", marginTop: 4 }}>RISK SCORE</span>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, unit, tint, loading }) {
  return (
    <div className="glass statcard" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--muted)" }}>{label.toUpperCase()}</span>
        <Icon size={15} color={tint || "var(--cyan)"} strokeWidth={1.75} />
      </div>
      <div className={`mono ${loading ? "pulse" : ""}`} style={{ fontSize: 22, fontWeight: 600, color: "var(--hi)" }}>
        {value}<span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 3, fontWeight: 400 }}>{unit}</span>
      </div>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`navbtn ${active ? "active" : ""}`} style={{ background: active ? "var(--cyanDim)" : "transparent", color: active ? "var(--cyan)" : "var(--muted)", fontWeight: active ? 600 : 400 }}>
      <Icon size={17} strokeWidth={1.75} />
      <span>{label}</span>
    </button>
  );
}

function SectionLabel({ children, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
      <div style={{ fontSize: 12, letterSpacing: "0.06em", color: "var(--muted)" }}>{children}</div>
      {right}
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("aegis-theme") || "dark"; } catch { return "dark"; }
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [cityIdx, setCityIdx] = useState(0);
  const [cityOpen, setCityOpen] = useState(false);
  const [page, setPage] = useState("Dashboard");
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(new Date());

  const [weather, setWeather] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [connected, setConnected] = useState(null); // null = never tried, true/false after first attempt
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const searchTimer = useRef(null);

  const cityKey = CITIES[cityIdx].key;

  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try { localStorage.setItem("aegis-theme", next); } catch {}
      return next;
    });
  };

  useEffect(() => {
    const clockId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockId);
  }, []);

  const refreshAll = useCallback(async (search) => {
    setLoading(true);
    try {
      const w = await fetchJSON(`${API_BASE}/weather?city=${encodeURIComponent(cityKey)}`);

      const rec = await fetchJSON(`${API_BASE}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: cityKey,
          temperature: w.temperature,
          humidity: w.humidity,
          wind_speed: w.wind_speed,
          rainfall: w.rainfall,
          pressure: w.pressure,
          cloud_cover: w.cloud_cover,
          visibility: w.visibility,
          storm: w.storm,
        }),
      });

      const historyUrl = `${API_BASE}/history?city=${encodeURIComponent(cityKey)}&limit=15${search ? `&search=${encodeURIComponent(search)}` : ""}`;
      const [al, hist, an] = await Promise.all([
        fetchJSON(`${API_BASE}/alerts?city=${encodeURIComponent(cityKey)}&limit=10`),
        fetchJSON(historyUrl),
        fetchJSON(`${API_BASE}/analytics?city=${encodeURIComponent(cityKey)}&limit=20`),
      ]);

      setWeather(w);
      setRecommendation(rec);
      setAlerts(al);
      setHistory(hist);
      setAnalytics(an);
      setConnected(true);
      setErrorMsg("");
      setLastUpdated(new Date());
    } catch (err) {
      setConnected(false);
      setErrorMsg(err.message || "Could not reach the backend");
    } finally {
      setLoading(false);
    }
  }, [cityKey]);

  // Reload everything when city changes
  useEffect(() => {
    setWeather(null); setRecommendation(null); setAlerts([]); setHistory([]); setAnalytics(null);
    refreshAll();
    const id = setInterval(() => refreshAll(query), 20000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityKey]);

  // Debounced search against /history only (doesn't re-run /recommend)
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const historyUrl = `${API_BASE}/history?city=${encodeURIComponent(cityKey)}&limit=15${query ? `&search=${encodeURIComponent(query)}` : ""}`;
        const hist = await fetchJSON(historyUrl);
        setHistory(hist);
      } catch { /* keep last known history on failure */ }
    }, 350);
    return () => clearTimeout(searchTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const riskTrend = useMemo(() => (analytics?.risk_trend || []).map((p) => ({ t: fmtTime(p.timestamp), risk: p.risk_score })), [analytics]);
  const weatherTrend = useMemo(() => (analytics?.weather_trend || []).map((p) => ({
    t: fmtTime(p.timestamp), temp: Math.round(p.temperature), hum: Math.round(p.humidity), wind: Math.round(p.wind_speed),
  })), [analytics]);

  const pieData = useMemo(() => {
    const d = analytics?.sensitivity_distribution || { LOW: 0, MEDIUM: 0, HIGH: 0 };
    return [
      { name: "Low", value: d.LOW || 0.0001, color: "var(--red)" },
      { name: "Medium", value: d.MEDIUM || 0.0001, color: "var(--amber)" },
      { name: "High", value: d.HIGH || 0.0001, color: "var(--green)" },
    ];
  }, [analytics]);

  const alertSev = (priority) => (priority === "CRITICAL" ? "critical" : priority === "HIGH" ? "high" : priority === "MEDIUM" ? "medium" : "low");
  const alertSevColor = (sev) => (sev === "critical" ? "var(--red)" : sev === "high" ? "var(--amber)" : "var(--muted)");

  const risk = recommendation?.risk_score ?? 0;
  const sensitivity = recommendation?.sensitivity ?? "—";
  const confidence = recommendation?.confidence ?? "--";
  const reason = errorMsg
    ? `Not connected to the backend (${errorMsg}). Start the FastAPI server on ${API_BASE} and hit refresh.`
    : recommendation?.reason ?? "Waiting for the first reading from the backend...";

  // Chart colors follow the active theme (recharts needs literal color strings, not var()).
  const chart = theme === "light"
    ? { grid: "rgba(15,23,42,0.08)", axis: "#5b6472", tooltipBg: "#ffffff", tooltipBorder: "rgba(15,23,42,0.12)", tooltipText: "#5b6472", cyan: "#0891b2", amber: "#b45309", green: "#16a34a" }
    : { grid: "rgba(148,163,184,0.08)", axis: "#8592a6", tooltipBg: "#0d121a", tooltipBorder: "rgba(148,163,184,0.15)", tooltipText: "#8592a6", cyan: "#22d3ee", amber: "#f5a623", green: "#3fd598" };

  const statLoading = loading && !weather;
  const weatherStatCards = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
      <StatCard icon={Thermometer} label="Temperature" value={weather ? weather.temperature.toFixed(1) : "--"} unit="°C" tint="var(--amber)" loading={statLoading} />
      <StatCard icon={Droplets} label="Humidity" value={weather ? Math.round(weather.humidity) : "--"} unit="%" tint="var(--cyan)" loading={statLoading} />
      <StatCard icon={Wind} label="Wind speed" value={weather ? Math.round(weather.wind_speed) : "--"} unit="km/h" tint="var(--cyan)" loading={statLoading} />
      <StatCard icon={CloudRain} label="Rainfall" value={weather ? weather.rainfall.toFixed(1) : "--"} unit="mm/h" tint="var(--cyan)" loading={statLoading} />
      <StatCard icon={Gauge} label="Pressure" value={weather ? Math.round(weather.pressure) : "--"} unit="hPa" tint="var(--muted)" loading={statLoading} />
      <StatCard icon={Eye} label="Visibility" value={weather ? weather.visibility.toFixed(1) : "--"} unit="km" tint="var(--muted)" loading={statLoading} />
      <StatCard icon={Zap} label="Storm status" value={weather ? (weather.storm ? "ACTIVE" : "CLEAR") : "--"} unit="" tint={weather?.storm ? "var(--red)" : "var(--green)"} loading={statLoading} />
    </div>
  );

  const riskTrendChart = (
    <div className="glass" style={{ padding: "16px 18px" }}>
      <div style={{ fontSize: 12, letterSpacing: "0.06em", color: "var(--muted)", marginBottom: 10 }}>RISK TREND</div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={riskTrend}>
          <defs>
            <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chart.cyan} stopOpacity={0.35} />
              <stop offset="100%" stopColor={chart.cyan} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={chart.grid} vertical={false} />
          <XAxis dataKey="t" tick={{ fill: chart.axis, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={30} />
          <YAxis domain={[0, 100]} tick={{ fill: chart.axis, fontSize: 10 }} axisLine={false} tickLine={false} width={26} />
          <Tooltip contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: chart.tooltipText }} />
          <Area type="monotone" dataKey="risk" stroke={chart.cyan} strokeWidth={2} fill="url(#riskFill)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  const weatherTrendChart = (
    <div className="glass" style={{ padding: "16px 18px" }}>
      <div style={{ fontSize: 12, letterSpacing: "0.06em", color: "var(--muted)", marginBottom: 10 }}>WEATHER TREND</div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={weatherTrend}>
          <CartesianGrid stroke={chart.grid} vertical={false} />
          <XAxis dataKey="t" tick={{ fill: chart.axis, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={30} />
          <YAxis tick={{ fill: chart.axis, fontSize: 10 }} axisLine={false} tickLine={false} width={26} />
          <Tooltip contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: chart.tooltipText }} />
          <Line type="monotone" dataKey="temp" stroke={chart.amber} strokeWidth={2} dot={false} isAnimationActive={false} name="Temp °C" />
          <Line type="monotone" dataKey="wind" stroke={chart.cyan} strokeWidth={2} dot={false} isAnimationActive={false} name="Wind km/h" />
          <Line type="monotone" dataKey="hum" stroke={chart.green} strokeWidth={2} dot={false} isAnimationActive={false} name="Humidity %" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const pieChart = (
    <div className="glass" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ fontSize: 12, letterSpacing: "0.06em", color: "var(--muted)", marginBottom: 6, alignSelf: "flex-start" }}>SENSITIVITY MIX</div>
      <ResponsiveContainer width="100%" height={150}>
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={3} isAnimationActive={false}>
            {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
        {pieData.map((d) => (
          <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "var(--muted)" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: d.color, display: "inline-block" }} /> {d.name}
          </div>
        ))}
      </div>
    </div>
  );

  const alertsPanel = (
    <div className="glass" style={{ padding: "16px 18px" }}>
      <div style={{ fontSize: 12, letterSpacing: "0.06em", color: "var(--muted)", marginBottom: 12 }}>ACTIVE ALERTS</div>
      {alerts.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--dim)", padding: "10px 0" }}>No active alerts. Conditions nominal.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {alerts.map((a) => {
            const sev = alertSev(a.priority);
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 9, background: "rgba(148,163,184,0.06)" }}>
                <AlertTriangle size={14} color={alertSevColor(sev)} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{a.type}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{a.message}</div>
                </div>
                <span className="badge" style={{ background: "rgba(148,163,184,0.08)", color: alertSevColor(sev) }}>{a.priority}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const historySearchBox = (
    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(148,163,184,0.06)", border: "1px solid var(--glassBorder)", borderRadius: 8, padding: "6px 10px" }}>
      <Search size={13} color="var(--muted)" />
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search history"
        style={{ background: "none", border: "none", outline: "none", color: "var(--hi)", fontSize: 12, width: 150 }} />
      {query && <X size={12} color="var(--muted)" style={{ cursor: "pointer" }} onClick={() => setQuery("")} />}
    </div>
  );

  const exportLink = (
    <a href={`${API_BASE}/report?city=${encodeURIComponent(cityKey)}`} target="_blank" rel="noreferrer"
      style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--cyanDim)", border: "1px solid rgba(34,211,238,0.25)", color: "var(--cyan)", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", textDecoration: "none" }}>
      <Download size={13} /> Export
    </a>
  );

  const historyTable = (rows) => (
    <div className="scrollx" style={{ overflowX: "auto" }}>
      <table className="hist">
        <thead>
          <tr><th>Time</th><th>Sensitivity</th><th>Risk</th><th>Reason</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={4} style={{ color: "var(--dim)", padding: "16px 10px" }}>
              {connected === false ? "No data — connect to the backend to load history." : "No matching records yet — history builds as live data streams in."}
            </td></tr>
          ) : rows.map((r) => (
            <tr key={r.id}>
              <td className="mono" style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{fmtTime(r.generated_at)}</td>
              <td><span className="badge" style={{ background: "rgba(148,163,184,0.08)", color: SENS_COLOR[r.sensitivity] }}>{r.sensitivity}</span></td>
              <td className="mono" style={{ color: RISK_COLOR(r.risk_score) }}>{r.risk_score}</td>
              <td style={{ color: "var(--muted)", maxWidth: 420 }}>{r.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div data-theme={theme} style={{ background: "var(--bg-image), var(--bg)", minHeight: 720, display: "flex", fontFamily: "var(--sans)", color: "var(--hi)", transition: "background-color .3s ease, color .3s ease" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        :root, [data-theme="dark"]{
          --bg:#080b10; --panel:#0d121a;
          --glass: rgba(255,255,255,0.035); --glassBorder: rgba(148,163,184,0.10);
          --hi:#e7edf5; --muted:#8592a6; --dim:#4d5766;
          --cyan:#22d3ee; --cyanDim: rgba(34,211,238,0.12);
          --amber:#f5a623; --red:#fb5757; --green:#3fd598;
          --shadow: 0 12px 32px rgba(0,0,0,0.35);
          --bg-image: radial-gradient(1100px 520px at 12% -8%, rgba(34,211,238,0.07), transparent 60%),
                      radial-gradient(900px 460px at 92% 8%, rgba(63,213,152,0.05), transparent 55%);
          --sans: 'IBM Plex Sans', system-ui, sans-serif;
          --mono: 'IBM Plex Mono', ui-monospace, monospace;
        }
        [data-theme="light"]{
          --bg:#eef1f6; --panel:#ffffff;
          --glass: rgba(15,23,42,0.035); --glassBorder: rgba(15,23,42,0.10);
          --hi:#101826; --muted:#5b6472; --dim:#94a3b8;
          --cyan:#0891b2; --cyanDim: rgba(8,145,178,0.12);
          --amber:#b45309; --red:#dc2626; --green:#16a34a;
          --shadow: 0 12px 28px rgba(15,23,42,0.07);
          --bg-image: radial-gradient(1100px 520px at 12% -8%, rgba(8,145,178,0.06), transparent 60%),
                      radial-gradient(900px 460px at 92% 8%, rgba(22,163,74,0.05), transparent 55%);
        }
        *{ box-sizing: border-box; }
        .mono{ font-family: var(--mono); }
        .glass{ background: var(--glass); border: 1px solid var(--glassBorder); border-radius: 16px; backdrop-filter: blur(8px); box-shadow: var(--shadow); transition: background-color .25s ease, border-color .25s ease, box-shadow .2s ease, transform .2s ease; }
        .glass-hover{ cursor:pointer; }
        .glass-hover:hover{ border-color: rgba(34,211,238,0.35); transform: translateY(-1px); }
        .navbtn{ position:relative; display:flex; align-items:center; gap:10px; width:100%; padding:9px 12px 9px 14px; border:none; border-radius:10px; font-size:13px; cursor:pointer; transition:background .18s ease,color .18s ease; text-align:left; }
        .navbtn:hover{ background: rgba(148,163,184,0.08); }
        .navbtn.active::before{ content:""; position:absolute; left:-6px; top:20%; height:60%; width:3px; border-radius:3px; background: var(--cyan); }
        .radar-spin{ background: conic-gradient(from 0deg, transparent 0%, rgba(34,211,238,0.16) 12%, transparent 24%); animation: spin 3.2s linear infinite; }
        @keyframes spin{ to{ transform: rotate(360deg); } }
        .pulse{ animation: pulse 1.6s ease-in-out infinite; }
        @keyframes pulse{ 0%,100%{ opacity:1; } 50%{ opacity:0.35; } }
        .spin-icon{ animation: spin 1s linear infinite; }
        .scrollx::-webkit-scrollbar{ height:6px; width:6px; }
        .scrollx::-webkit-scrollbar-thumb{ background: rgba(148,163,184,0.2); border-radius:6px; }
        table.hist{ width:100%; border-collapse:collapse; font-size:12.5px; }
        table.hist th{ text-align:left; color:var(--muted); font-weight:500; font-size:10.5px; letter-spacing:0.06em; padding:8px 10px; border-bottom:1px solid var(--glassBorder); }
        table.hist td{ padding:10px; border-bottom:1px solid rgba(148,163,184,0.06); color:var(--hi); vertical-align:top; }
        table.hist tbody tr{ transition: background-color .15s ease; }
        table.hist tbody tr:hover{ background: rgba(148,163,184,0.05); }
        .badge{ display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; border:1px solid currentColor; border-color: color-mix(in srgb, currentColor 30%, transparent); }
        .statcard{ transition: transform .2s ease, border-color .2s ease; }
        .statcard:hover{ transform: translateY(-2px); border-color: rgba(34,211,238,0.3); }
        .themebtn{ display:flex; align-items:center; justify-content:center; gap:8px; flex:1; padding:8px 10px; border-radius:8px; border:1px solid var(--glassBorder); background:transparent; color:var(--muted); font-size:12px; cursor:pointer; transition: all .15s ease; }
        .themebtn:hover{ color: var(--hi); }
        .page-fade{ animation: fadeIn .35s ease; }
        @keyframes fadeIn{ from{ opacity:0; transform: translateY(4px); } to{ opacity:1; transform: translateY(0); } }
        .iconbtn{ display:flex; align-items:center; justify-content:center; width:32px; height:32px; border:1px solid var(--glassBorder); cursor:pointer; color:var(--muted); border-radius:10px; transition: all .15s ease; }
        .iconbtn:hover{ color: var(--cyan); border-color: rgba(34,211,238,0.3); }
        .themebtn.active{ background: var(--cyanDim); color: var(--cyan); border-color: rgba(34,211,238,0.25); }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: 208, borderRight: "1px solid var(--glassBorder)", padding: "18px 14px", display: "flex", flexDirection: "column", gap: 22, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 4px" }}>
          <div style={{ position: "relative", width: 30, height: 30, borderRadius: 9, background: "var(--cyanDim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="radar-spin" style={{ position: "absolute", inset: 0, borderRadius: 9 }} />
            <Radar size={16} color="var(--cyan)" strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "0.02em" }}>AEGIS-PIDS</div>
            <div style={{ fontSize: 9.5, color: "var(--muted)", letterSpacing: "0.08em" }}>CALIBRATION CONSOLE</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {NAV_ITEMS.map((n) => (
            <NavItem key={n.key} icon={n.icon} label={n.label} active={page === n.key} onClick={() => setPage(n.key)} />
          ))}
          <NavItem icon={Settings} label="Settings" active={settingsOpen} onClick={() => setSettingsOpen((o) => !o)} />
        </div>

        {settingsOpen && (
          <div className="glass" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 10.5, color: "var(--muted)", letterSpacing: "0.06em" }}>APPEARANCE</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button className={`themebtn ${theme === "dark" ? "active" : ""}`} onClick={() => theme !== "dark" && toggleTheme()}>
                <Moon size={13} /> Dark
              </button>
              <button className={`themebtn ${theme === "light" ? "active" : ""}`} onClick={() => theme !== "light" && toggleTheme()}>
                <Sun size={13} /> Light
              </button>
            </div>
            <div style={{ borderTop: "1px solid var(--glassBorder)", margin: "2px 0" }} />
            <span style={{ fontSize: 10.5, color: "var(--muted)", letterSpacing: "0.06em" }}>BACKEND</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5 }} className="mono">
              <Info size={12} color="var(--muted)" />
              <span style={{ color: "var(--hi)" }}>{API_BASE}</span>
            </div>
            <span style={{ fontSize: 10.5, color: "var(--dim)", lineHeight: 1.5 }}>
              Run the FastAPI server with <span className="mono">uvicorn app:app --port 8000</span> — the dashboard connects automatically.
            </span>
          </div>
        )}

        <div style={{ marginTop: "auto" }} className="glass">
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Activity size={13} color="var(--green)" />
              <span style={{ fontSize: 11, color: "var(--muted)" }}>Sensor health</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 600 }} className="mono">98.2%</div>
            <div style={{ height: 4, borderRadius: 4, background: "rgba(148,163,184,0.12)" }}>
              <div style={{ width: "98%", height: "100%", borderRadius: 4, background: "var(--green)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, padding: "18px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Topbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em" }}>{page === "Dashboard" ? "Perimeter sensor calibration" : page}</div>
            <div style={{ position: "relative", marginTop: 5 }}>
              <button onClick={() => setCityOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--muted)", fontSize: 12.5, cursor: "pointer", padding: 0, transition: "color .15s ease" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "var(--cyan)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--muted)"}>
                <MapPin size={12} /> {CITIES[cityIdx].label} <ChevronDown size={13} style={{ transform: cityOpen ? "rotate(180deg)" : "none", transition: "transform .2s ease" }} />
              </button>
              {cityOpen && (
                <div className="glass" style={{ position: "absolute", top: 24, left: 0, zIndex: 20, minWidth: 230, padding: 6 }}>
                  {CITIES.map((c, i) => (
                    <div key={c.key} onClick={() => { setCityIdx(i); setCityOpen(false); }}
                      style={{ padding: "8px 10px", borderRadius: 8, fontSize: 12.5, cursor: "pointer", color: i === cityIdx ? "var(--cyan)" : "var(--hi)", background: i === cityIdx ? "var(--cyanDim)" : "transparent", transition: "background .15s ease" }}>
                      {c.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={toggleTheme} title="Toggle theme" className="iconbtn">
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <div className="glass glass-hover" style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px" }}
              onClick={() => refreshAll(query)} title="Refresh now">
              {loading ? <RefreshCw size={12} className="spin-icon" color="var(--cyan)" /> : connected === false ? <WifiOff size={12} color="var(--red)" /> : <Wifi size={12} color="var(--green)" />}
              <span style={{ fontSize: 11.5, letterSpacing: "0.06em", color: connected === false ? "var(--red)" : "var(--muted)" }}>
                {connected === null ? "CONNECTING" : connected ? "LIVE" : "OFFLINE"}
              </span>
            </div>
            <div className="mono" style={{ fontSize: 13, color: "var(--muted)" }}>{fmtClock(now)}</div>
            <div style={{ position: "relative" }}>
              <Bell size={17} color="var(--muted)" />
              {alerts.length > 0 && <span style={{ position: "absolute", top: -4, right: -4, width: 15, height: 15, borderRadius: "50%", background: "var(--red)", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, color: "#fff" }}>{alerts.length}</span>}
            </div>
          </div>
        </div>

        {connected === false && (
          <div className="glass" style={{ padding: "10px 14px", borderColor: "rgba(251,87,87,0.3)", display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "var(--muted)" }}>
            <AlertTriangle size={14} color="var(--red)" />
            Can't reach <span className="mono" style={{ color: "var(--hi)" }}>{API_BASE}</span>. Make sure the backend is running (<span className="mono">uvicorn app:app --port 8000</span>) and reachable from your browser, then hit refresh.
          </div>
        )}

        {/* ---------- DASHBOARD ---------- */}
        {page === "Dashboard" && (
          <div key="dashboard" className="page-fade" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {weatherStatCards}

            <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, alignItems: "start" }}>
              <div className="glass" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, letterSpacing: "0.06em", color: "var(--muted)" }}>AI RECOMMENDATION</span>
                  <span className="badge" style={{ background: "rgba(148,163,184,0.1)", color: "var(--cyan)" }}>
                    <ShieldCheck size={11} /> {confidence}% confidence
                  </span>
                </div>
                <Gauge3 value={risk} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{ fontSize: 11.5, color: "var(--muted)" }}>Sensor sensitivity</span>
                  <span className="badge" style={{ background: "rgba(148,163,184,0.08)", color: SENS_COLOR[sensitivity] || "var(--muted)" }}>{sensitivity}</span>
                </div>
                <div style={{ borderTop: "1px solid var(--glassBorder)", paddingTop: 12, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>
                  {reason}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {riskTrendChart}
                {weatherTrendChart}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 16, alignItems: "start" }}>
              {alertsPanel}
              {pieChart}
            </div>

            <div className="glass" style={{ padding: "16px 18px" }}>
              <SectionLabel right={
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {historySearchBox}
                  {exportLink}
                </div>
              }>RECOMMENDATION HISTORY</SectionLabel>
              {historyTable(history)}
            </div>
          </div>
        )}

        {/* ---------- WEATHER ---------- */}
        {page === "Weather" && (
          <div key="weather" className="page-fade" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="glass" style={{ padding: "14px 18px", fontSize: 12.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 10 }}>
              <Cloud size={16} color="var(--cyan)" />
              Live conditions for <span style={{ color: "var(--hi)" }}>{CITIES[cityIdx].label}</span>, pulled from the open-source weather API on the backend and refreshed every 20 seconds.
            </div>
            {weatherStatCards}
            {weatherTrendChart}
          </div>
        )}

        {/* ---------- RECOMMENDATIONS ---------- */}
        {page === "Recommendations" && (
          <div key="recommendations" className="page-fade" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
            <div className="glass" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <span style={{ fontSize: 12, letterSpacing: "0.06em", color: "var(--muted)" }}>CALIBRATION SUGGESTION</span>
                <span className="badge" style={{ background: "rgba(148,163,184,0.1)", color: "var(--cyan)" }}>
                  <ShieldCheck size={11} /> {confidence}% confidence
                </span>
              </div>
              <Gauge3 value={risk} size={200} />
              <div className="badge" style={{ background: "rgba(148,163,184,0.08)", color: SENS_COLOR[sensitivity] || "var(--muted)", fontSize: 13, padding: "6px 16px" }}>
                Recommended sensitivity: {sensitivity}
              </div>
              <div style={{ borderTop: "1px solid var(--glassBorder)", paddingTop: 14, fontSize: 13, color: "var(--muted)", lineHeight: 1.7, width: "100%" }}>
                {reason}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {riskTrendChart}
              <div className="glass" style={{ padding: "16px 18px", fontSize: 12, color: "var(--muted)", lineHeight: 1.8 }}>
                <div style={{ letterSpacing: "0.06em", marginBottom: 8 }}>HOW THIS IS CALCULATED</div>
                High wind and active storms push sensitivity down to cut false alarms; calm, clear conditions raise it back up so real intrusions aren't missed. Heavy rain settles on a medium sensitivity as a balance between the two.
              </div>
            </div>
          </div>
        )}

        {/* ---------- ANALYTICS ---------- */}
        {page === "Analytics" && (
          <div key="analytics" className="page-fade" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {riskTrendChart}
              {weatherTrendChart}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, alignItems: "start" }}>
              {pieChart}
              <div className="glass" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 12, letterSpacing: "0.06em", color: "var(--muted)" }}>SNAPSHOT</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <StatCard icon={ShieldCheck} label="Current risk" value={risk} unit="/100" tint={RISK_COLOR(risk)} />
                  <StatCard icon={Activity} label="Confidence" value={confidence} unit="%" tint="var(--cyan)" />
                  <StatCard icon={AlertTriangle} label="Active alerts" value={alerts.length} unit="" tint={alerts.length ? "var(--red)" : "var(--green)"} />
                  <StatCard icon={HistoryIcon} label="Records" value={history.length} unit="" tint="var(--muted)" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------- HISTORY ---------- */}
        {page === "History" && (
          <div key="history" className="page-fade glass" style={{ padding: "16px 18px" }}>
            <SectionLabel right={
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {historySearchBox}
                {exportLink}
              </div>
            }>RECOMMENDATION HISTORY — {CITIES[cityIdx].label}</SectionLabel>
            {historyTable(history)}
          </div>
        )}

        {/* ---------- REPORTS ---------- */}
        {page === "Reports" && (
          <div key="reports" className="page-fade" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
            <div className="glass" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileText size={18} color="var(--cyan)" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Calibration report</span>
              </div>
              <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.7, margin: 0 }}>
                Generates a report for <span style={{ color: "var(--hi)" }}>{CITIES[cityIdx].label}</span> covering current weather conditions,
                the latest sensitivity recommendation, active alerts, and recent calibration history — pulled live from the backend's <span className="mono">/report</span> endpoint.
              </p>
              {exportLink}
            </div>
            <div className="glass" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 12, letterSpacing: "0.06em", color: "var(--muted)" }}>WHAT'S INCLUDED</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 2 }}>
                <div>• Current sensitivity: <span className="badge" style={{ background: "rgba(148,163,184,0.08)", color: SENS_COLOR[sensitivity] || "var(--muted)" }}>{sensitivity}</span></div>
                <div>• Risk score: <span className="mono" style={{ color: RISK_COLOR(risk) }}>{risk}/100</span></div>
                <div>• Active alerts: <span className="mono" style={{ color: "var(--hi)" }}>{alerts.length}</span></div>
                <div>• History records available: <span className="mono" style={{ color: "var(--hi)" }}>{history.length}</span></div>
              </div>
            </div>
          </div>
        )}

        {lastUpdated && (
          <div style={{ fontSize: 10.5, color: "var(--dim)", textAlign: "right" }}>
            Last synced {fmtClock(lastUpdated)} · refreshes every 20s
          </div>
        )}
      </div>
    </div>
  );
}
