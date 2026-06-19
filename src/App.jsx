import { useState, useEffect, useRef } from "react";
import { Cookie, Users, BarChart3, ShoppingBag, ShoppingCart, Carrot, Plus, Trash2, Pencil, X, ChevronRight, ChevronDown, Check, Search, TrendingUp, TrendingDown, Store, Calendar, Settings, Cloud, CloudOff, RefreshCw } from "lucide-react";
import { getSheetUrl, setSheetUrl as persistUrl, readCache, writeCache, clearCache, pull, push } from "./storage";

const BRL = (n) => "R$ " + (Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const ymd = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`; };
const hojeISO = () => new Date().toISOString();
let _idc = 0;
const uid = (p = "id") => `${p}_${Date.now().toString(36)}${(_idc++).toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

const SECOES = [
  { key: "massa", label: "Massa" },
  { key: "recheio", label: "Recheio" },
  { key: "embalagem", label: "Embalagem" },
  { key: "extras", label: "Extras" },
];
const SEC_ESTILO = {
  massa: { cor: "bg-amber-100 text-amber-800", emoji: "🍫" },
  recheio: { cor: "bg-rose-100 text-rose-700", emoji: "🍓" },
  embalagem: { cor: "bg-sky-100 text-sky-700", emoji: "📦" },
  extras: { cor: "bg-violet-100 text-violet-700", emoji: "✨" },
};

const UNI = {
  g:  { dim: "peso", fator: 1 },
  kg: { dim: "peso", fator: 1000 },
  ml: { dim: "vol", fator: 1 },
  l:  { dim: "vol", fator: 1000 },
  un: { dim: "un", fator: 1 },
};
const UNI_OPTS = [
  { value: "g", label: "g" }, { value: "kg", label: "kg" },
  { value: "ml", label: "ml" }, { value: "l", label: "l" }, { value: "un", label: "un" },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [loaded, setLoaded] = useState(false);

  const [ingredients, setIngredients] = useState([]);
  const [trips, setTrips] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [clients, setClients] = useState([]);

  const [sheetUrl, setSheetUrl] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [syncStatus, setSyncStatus] = useState("idle");
  const [syncMsg, setSyncMsg] = useState("");
  const firstSave = useRef(true);
  const saveTimer = useRef(null);

  // modais rápidos (usados pelo FAB no mobile)
  const [quickClient, setQuickClient] = useState(false);
  const [quickTrip, setQuickTrip] = useState(false);

  const applyData = (d) => {
    setIngredients(d.ingredients || []); setTrips(d.trips || []);
    setRecipes(d.recipes || []); setClients(d.clients || []);
  };

  useEffect(() => {
    (async () => {
      const url = getSheetUrl();
      setSheetUrl(url);
      if (url) {
        setSyncStatus("syncing");
        const r = await pull(url);
        if (r.ok) { applyData(r.data); writeCache(r.data); setSyncStatus("ok"); setSyncMsg(""); }
        else { const c = readCache(); if (c) applyData(c); setSyncStatus("error"); setSyncMsg(r.error || "falha ao puxar"); }
      } else {
        const c = readCache(); if (c) applyData(c); setSyncStatus("idle");
      }
      firstSave.current = true;
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const payload = { ingredients, trips, recipes, clients };
    writeCache(payload);
    if (firstSave.current) { firstSave.current = false; return; }
    if (sheetUrl) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSyncStatus("syncing");
      saveTimer.current = setTimeout(async () => {
        const r = await push(sheetUrl, payload);
        if (r.ok) { setSyncStatus("ok"); setSyncMsg(""); }
        else { setSyncStatus("error"); setSyncMsg(r.error || "falha ao salvar"); }
      }, 1000);
    }
  }, [ingredients, trips, recipes, clients, loaded]);

  const saveUrl = (url) => { setSheetUrl(url); persistUrl(url); };
  const doPull = async () => {
    if (!sheetUrl) return;
    setSyncStatus("syncing");
    const r = await pull(sheetUrl);
    if (r.ok) { applyData(r.data); writeCache(r.data); firstSave.current = true; setSyncStatus("ok"); setSyncMsg(""); }
    else { setSyncStatus("error"); setSyncMsg(r.error || "falha ao puxar"); }
  };

  const ultimaCompra = (ingId) => {
    let melhor = null;
    trips.forEach((t) => {
      (t.itens || []).forEach((it) => {
        if (it.ingredienteId === ingId) { if (!melhor || t.data > melhor.data) melhor = { ...it, data: t.data }; }
      });
    });
    return melhor;
  };

  // helper de compra usado pelo modal rápido
  const addTripObj = (obj) => setTrips((ts) => [...ts, { id: uid("trip"), data: hojeISO(), ...obj }]);

  const tabs = [
    { id: "dashboard", label: "Início", icon: BarChart3 },
    { id: "clientes", label: "Clientes", icon: Users },
    { id: "mercado", label: "Mercado", icon: ShoppingCart },
    { id: "precificacao", label: "Preços", icon: Cookie },
    { id: "ifood", label: "iFood", icon: ShoppingBag },
  ];

  if (!loaded) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 text-stone-800 pb-20 md:pb-0">
      <Styles />
      <header className="bg-gradient-to-r from-amber-800 to-amber-900 text-amber-50 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50/20 flex items-center justify-center"><Cookie size={24} /></div>
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-tight">ERP - Doce Sabor</h1>
          </div>
          <SyncBadge status={syncStatus} connected={!!sheetUrl} onClick={doPull} />
          <button onClick={() => setShowConfig(true)} title="Configurar"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50/10 text-amber-200 hover:bg-amber-50/20 hover:text-amber-50 transition">
            <Settings size={18} />
          </button>
          <button onClick={() => setTab("ingredientes")} title="Ingredientes"
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${tab === "ingredientes" ? "bg-amber-50/25 text-amber-50" : "bg-amber-50/10 text-amber-200 hover:bg-amber-50/20 hover:text-amber-50"}`}>
            <Carrot size={18} /> <span className="hidden sm:inline">Ingredientes</span>
          </button>
        </div>
        {/* nav desktop */}
        <nav className="hidden md:flex max-w-5xl mx-auto px-2 gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const Icon = t.icon; const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${active ? "border-amber-50 text-amber-50" : "border-transparent text-amber-300 hover:text-amber-100"}`}>
                <Icon size={17} /> {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {tab === "dashboard" && <Dashboard trips={trips} clients={clients} recipes={recipes} />}
        {tab === "clientes" && <Clientes clients={clients} setClients={setClients} recipes={recipes} />}
        {tab === "mercado" && <Mercado trips={trips} setTrips={setTrips} ingredients={ingredients} />}
        {tab === "ingredientes" && <Ingredientes ingredients={ingredients} setIngredients={setIngredients} />}
        {tab === "precificacao" && <Precificacao recipes={recipes} setRecipes={setRecipes} ingredients={ingredients} ultimaCompra={ultimaCompra} />}
        {tab === "ifood" && <Ifood />}
      </main>

      {/* navegação mobile: tab bar + FAB */}
      <MobileNav tab={tab} setTab={setTab} tabs={tabs} onNewClient={() => setQuickClient(true)} onNewTrip={() => setQuickTrip(true)} />

      {showConfig && <ConfigModal sheetUrl={sheetUrl} saveUrl={saveUrl} onClose={() => setShowConfig(false)} onPull={doPull} onClear={clearCache} status={syncStatus} msg={syncMsg} />}
      {quickClient && <QuickClientModal clients={clients} recipes={recipes} onClose={() => setQuickClient(false)}
        onCreateClient={(o) => { const nc = { id: uid("cli"), movimentos: [], ...o }; setClients((cs) => [...cs, nc]); return nc.id; }}
        onAddEntrega={(clientId, mov) => setClients((cs) => cs.map((c) => c.id === clientId ? { ...c, movimentos: [...c.movimentos, { id: uid("mov"), ...mov }] } : c))}
        onDone={() => { setQuickClient(false); setTab("clientes"); }} />}
      {quickTrip && <QuickTripModal ingredients={ingredients} onClose={() => setQuickTrip(false)} onSave={(o) => { addTripObj(o); setQuickTrip(false); setTab("mercado"); }} />}
    </div>
  );
}

/* ====== LOADING: ícone pequeno com anel girando (estilos inline p/ funcionar sem o CSS global) ====== */
function LoadingScreen() {
  const [imgOk, setImgOk] = useState(true);
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(to bottom right, #fffbeb, #fff7ed)" }}>
      <style>{`@keyframes ldspin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ position: "relative", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ position: "absolute", inset: 0, borderRadius: "9999px", border: "4px solid rgba(146,64,14,.15)", borderTopColor: "#92400e", animation: "ldspin 0.9s linear infinite" }} />
        {imgOk ? (
          <img src="/icon-512.png" alt="Doce Sabor" onError={() => setImgOk(false)}
            style={{ width: 44, height: 44, objectFit: "contain" }} />
        ) : (
          <span style={{ fontSize: 32 }}>🍫</span>
        )}
      </div>
    </div>
  );
}

/* ====== NAV MOBILE ====== */
function MobileNav({ tab, setTab, tabs, onNewClient, onNewTrip }) {
  const [fabOpen, setFabOpen] = useState(false);
  // 4 itens na barra (sem ifood, que fica acessível mas priorizamos os principais) + centro pro FAB
  const left = [tabs[0], tabs[1]];
  const right = [tabs[2], tabs[3]];
  const Item = ({ t }) => {
    const Icon = t.icon; const active = tab === t.id;
    return (
      <button onClick={() => setTab(t.id)} className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 ${active ? "text-amber-800" : "text-stone-400"}`}>
        <Icon size={20} /><span className="text-[10px] font-medium">{t.label}</span>
      </button>
    );
  };
  return (
    <>
      {fabOpen && <div className="fixed inset-0 z-40 md:hidden" style={{ backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", background: "rgba(0,0,0,0.25)" }} onClick={() => setFabOpen(false)} />}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
        {/* leque do FAB */}
        {fabOpen && (
          <div className="flex justify-center gap-4 mb-3 px-4">
            <button onClick={() => { setFabOpen(false); onNewClient(); }}
              className="flex flex-col items-center gap-1 animate-pop">
              <span className="w-14 h-14 rounded-full bg-white shadow-lg border border-amber-100 flex items-center justify-center text-amber-700"><Users size={22} /></span>
              <span className="text-xs font-medium text-stone-700 bg-white px-2 py-0.5 rounded-full shadow">Cliente</span>
            </button>
            <button onClick={() => { setFabOpen(false); onNewTrip(); }}
              className="flex flex-col items-center gap-1 animate-pop">
              <span className="w-14 h-14 rounded-full bg-white shadow-lg border border-amber-100 flex items-center justify-center text-amber-700"><ShoppingCart size={22} /></span>
              <span className="text-xs font-medium text-stone-700 bg-white px-2 py-0.5 rounded-full shadow">Compra</span>
            </button>
          </div>
        )}
        <div className="bg-white border-t border-amber-100 shadow-lg flex items-center px-2 relative">
          <Item t={left[0]} /><Item t={left[1]} />
          <div className="w-16 flex justify-center">
            <button onClick={() => setFabOpen(!fabOpen)}
              className={`w-14 h-14 -mt-6 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-xl flex items-center justify-center transition ${fabOpen ? "rotate-45" : ""}`}>
              <Plus size={26} />
            </button>
          </div>
          <Item t={right[0]} /><Item t={right[1]} />
        </div>
      </div>
    </>
  );
}

/* ====== MODAIS RÁPIDOS ====== */
function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-amber-900">{title}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={22} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function QuickClientModal({ clients, recipes, onClose, onCreateClient, onAddEntrega, onDone }) {
  const [modo, setModo] = useState(clients.length > 0 ? "existente" : "novo"); // existente | novo
  const [clienteId, setClienteId] = useState("");
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  // entrega (opcional)
  const [comEntrega, setComEntrega] = useState(true);
  const [receitaId, setReceitaId] = useState("");
  const [qtd, setQtd] = useState("");
  const [valorUnit, setValorUnit] = useState("");

  const cliOpts = clients.map((c) => ({ value: c.id, label: c.nome }));
  const recOpts = recipes.map((r) => ({ value: r.id, label: r.nome }));

  const salvar = () => {
    // resolve o cliente (cria ou usa existente)
    let id;
    if (modo === "novo") {
      if (!nome.trim()) return;
      id = onCreateClient({ nome, endereco });
    } else {
      if (!clienteId) return;
      id = clienteId;
    }
    // registra entrega se marcada e preenchida
    if (comEntrega && qtd && valorUnit) {
      onAddEntrega(id, { tipo: "entrega", receitaId, qtd, valorUnit, data: hojeISO() });
    }
    onDone();
  };

  const total = (Number(qtd) || 0) * (Number(valorUnit) || 0);

  return (
    <ModalShell title="Cliente e entrega" onClose={onClose}>
      <div className="space-y-3">
        {/* alternador novo / existente */}
        {clients.length > 0 && (
          <div className="flex gap-2 bg-stone-100 rounded-xl p-1">
            <button onClick={() => setModo("existente")} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${modo === "existente" ? "bg-white shadow text-amber-900" : "text-stone-500"}`}>Cliente existente</button>
            <button onClick={() => setModo("novo")} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${modo === "novo" ? "bg-white shadow text-amber-900" : "text-stone-500"}`}>Novo cliente</button>
          </div>
        )}

        {modo === "existente" ? (
          <Field label="Escolher cliente"><Dropdown value={clienteId} onChange={setClienteId} options={cliOpts} placeholder="Selecionar cliente" searchable /></Field>
        ) : (
          <>
            <Field label="Nome do estabelecimento"><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Cafeteria Centro" className="input" /></Field>
            <Field label="Endereço / observação"><input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Opcional" className="input" /></Field>
          </>
        )}

        {/* entrega */}
        <div className="border-t border-amber-100 pt-3">
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input type="checkbox" checked={comEntrega} onChange={(e) => setComEntrega(e.target.checked)} className="w-4 h-4 accent-amber-700" />
            <span className="text-sm font-medium text-stone-700">Já deixei brownies neste cliente</span>
          </label>
          {comEntrega && (
            <div className="space-y-3 bg-amber-50/50 rounded-xl p-3">
              <Field label="Qual receita (brownie)"><Dropdown value={receitaId} onChange={setReceitaId} options={recOpts} placeholder="Escolher brownie" searchable /></Field>
              <div className="flex gap-2">
                <Field label="Quantidade" style={{ flex: 1 }}><input type="number" value={qtd} onChange={(e) => setQtd(e.target.value)} placeholder="15" className="input" /></Field>
                <Field label="Valor unit. R$" style={{ flex: 1 }}><input type="number" value={valorUnit} onChange={(e) => setValorUnit(e.target.value)} placeholder="8.00" className="input" /></Field>
              </div>
              {total > 0 && <p className="text-xs text-stone-500">Total que o cliente passa a dever: <b className="text-amber-800">{BRL(total)}</b></p>}
            </div>
          )}
        </div>

        <button onClick={salvar} className="btn-primary w-full">Salvar</button>
      </div>
    </ModalShell>
  );
}

function QuickTripModal({ ingredients, onClose, onSave }) {
  const [mercado, setMercado] = useState("");
  const [itens, setItens] = useState([]);
  const [ingSel, setIngSel] = useState("");
  const [valor, setValor] = useState("");
  const ingOpts = ingredients.map((i) => ({ value: i.id, label: i.nome }));
  const ingNome = (id) => { const x = ingredients.find((i) => i.id === id); return x ? x.nome : "?"; };
  const addItem = () => { if (!ingSel || !valor) return; setItens([...itens, { id: uid("it"), ingredienteId: ingSel, valor }]); setIngSel(""); setValor(""); };
  return (
    <ModalShell title="Nova compra no mercado" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Qual mercado?"><input value={mercado} onChange={(e) => setMercado(e.target.value)} placeholder="Ex: Atacadão" className="input" /></Field>
        {ingredients.length === 0 ? (
          <p className="text-sm text-stone-500">Cadastre ingredientes primeiro (ícone de cenoura no topo).</p>
        ) : (
          <>
            <Field label="Ingrediente"><Dropdown value={ingSel} onChange={setIngSel} options={ingOpts} placeholder="Escolher" searchable /></Field>
            <div className="flex items-end gap-2">
              <Field label="Quanto pagou R$" style={{ flex: 1 }}><input type="number" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="40" className="input" /></Field>
              <button onClick={addItem} className="btn-ok"><Plus size={16} /></button>
            </div>
          </>
        )}
        {itens.length > 0 && (
          <div className="space-y-1">
            {itens.map((it) => (
              <div key={it.id} className="flex items-center justify-between text-sm bg-amber-50/60 rounded-lg px-3 py-2">
                <span><b>{ingNome(it.ingredienteId)}</b> · {BRL(it.valor)}</span>
                <button onClick={() => setItens(itens.filter((x) => x.id !== it.id))} className="text-stone-300 hover:text-red-500"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => itens.length > 0 && onSave({ mercado: mercado || "Mercado", itens })} className="btn-primary w-full">Salvar compra</button>
      </div>
    </ModalShell>
  );
}

function SyncBadge({ status, connected, onClick }) {
  if (!connected) return (
    <span className="flex items-center gap-1 text-amber-300 text-xs px-2 py-1 rounded-lg bg-amber-50/10" title="Sem sincronização">
      <CloudOff size={15} /> <span className="hidden sm:inline">local</span>
    </span>
  );
  const map = {
    syncing: { icon: RefreshCw, txt: "sincronizando", cls: "text-amber-200", spin: true },
    ok: { icon: Cloud, txt: "salvo", cls: "text-green-300" },
    error: { icon: CloudOff, txt: "erro", cls: "text-red-300" },
    offline: { icon: CloudOff, txt: "offline", cls: "text-red-300" },
    idle: { icon: Cloud, txt: "nuvem", cls: "text-amber-200" },
  };
  const s = map[status] || map.idle;
  const Icon = s.icon;
  return (
    <button onClick={onClick} title="Atualizar da nuvem"
      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-amber-50/10 hover:bg-amber-50/20 transition ${s.cls}`}>
      <Icon size={15} className={s.spin ? "animate-spin" : ""} /> <span className="hidden sm:inline">{s.txt}</span>
    </button>
  );
}

function ConfigModal({ sheetUrl, saveUrl, onClose, onPull, onClear, status, msg }) {
  const [url, setUrl] = useState(sheetUrl || "");
  const [savedFlash, setSavedFlash] = useState(false);
  const handleSave = () => { saveUrl(url.trim()); setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500); };
  return (
    <ModalShell title="Configuração" onClose={onClose}>
      <ol className="text-sm text-stone-600 space-y-1.5 mb-4 list-decimal pl-5">
        <li>Crie uma planilha no Google Sheets.</li>
        <li><b>Extensões → Apps Script</b>, cole o código e salve.</li>
        <li><b>Implantar → App da Web</b>. Acesso: <b>Qualquer pessoa</b>.</li>
        <li>Copie a URL (<code>/exec</code>) e cole abaixo.</li>
      </ol>
      <Field label="URL do App da Web"><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" className="input" /></Field>
      <div className="flex flex-wrap gap-2 mt-4">
        <button onClick={handleSave} className="btn-primary">{savedFlash ? "Salvo!" : "Salvar URL"}</button>
        <button onClick={onPull} className="btn-ghost"><RefreshCw size={15} /> Puxar da nuvem</button>
        <button onClick={onClear} className="btn-ghost">Limpar cache</button>
      </div>
      <p className="text-xs text-stone-500 mt-3">Status: <b>{status}</b>{msg ? ` — ${msg}` : ""}.</p>
      <p className="text-xs text-orange-500 mt-2">⚠️ "Puxar da nuvem" substitui o que está na tela pelos dados da planilha.</p>
    </ModalShell>
  );
}

function Styles() {
  return <style>{`
    .input { box-sizing:border-box; padding:8px 11px; border:1px solid #e7d4b5; border-radius:10px; font-size:14px; background:#fff; color:#292524; outline:none; transition:border-color .15s, box-shadow .15s; height:38px; line-height:1.2; width:100%; }
    .input:focus { border-color:#d97706; box-shadow:0 0 0 3px rgba(217,119,6,.15); }
    .btn-primary { display:inline-flex; align-items:center; gap:6px; justify-content:center; background:linear-gradient(to right,#b45309,#92400e); color:#fffbeb; font-weight:600; font-size:14px; padding:9px 16px; border-radius:10px; border:none; cursor:pointer; transition:opacity .15s; }
    .btn-primary:hover { opacity:.9; }
    .btn-ghost { display:inline-flex; align-items:center; gap:6px; background:#f5f5f4; color:#57534e; font-weight:500; font-size:14px; padding:9px 16px; border-radius:10px; border:none; cursor:pointer; }
    .btn-ghost:hover { background:#e7e5e4; }
    .btn-ok { display:inline-flex; align-items:center; gap:6px; justify-content:center; background:#16a34a; color:#fff; font-weight:600; font-size:14px; padding:8px 14px; border-radius:10px; border:none; cursor:pointer; height:38px; }
    .btn-ok:hover { background:#15803d; }
    .choco-bar { display:grid; grid-template-columns:repeat(3,1fr); gap:4px; padding:8px; background:linear-gradient(145deg,#7b3f00,#5c2e00); border-radius:10px; box-shadow:0 8px 20px rgba(91,46,0,.4); }
    .choco-sq { width:28px; height:28px; background:linear-gradient(145deg,#8b4513,#6b3410); border-radius:5px; box-shadow:inset 2px 2px 3px rgba(255,255,255,.2), inset -2px -2px 3px rgba(0,0,0,.4); animation:chocopulse 1.1s ease-in-out infinite; }
    @keyframes chocopulse { 0%,100%{opacity:.35; transform:scale(.92);} 50%{opacity:1; transform:scale(1);} }
    @keyframes pop { 0%{opacity:0; transform:translateY(12px) scale(.8);} 100%{opacity:1; transform:translateY(0) scale(1);} }
    .animate-pop { animation:pop .18s ease-out; }
    @keyframes loadingpulse { 0%,100%{ transform:scale(.9); opacity:.7; } 50%{ transform:scale(1.05); opacity:1; } }
    .loading-pulse { animation:loadingpulse 1.2s ease-in-out infinite; }
    .loading-wrap { position:relative; width:96px; height:96px; display:flex; align-items:center; justify-content:center; }
    .loading-icon { width:56px; height:56px; object-fit:contain; }
    .loading-ring { position:absolute; inset:0; border-radius:9999px; border:4px solid rgba(146,64,14,.15); border-top-color:#92400e; animation:spin 0.9s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
  `}</style>;
}

function Dropdown({ value, onChange, options, placeholder = "Selecionar", style, searchable = false }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQ(""); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const sel = options.find((o) => o.value === value);
  const filtered = searchable && q.trim() ? options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase())) : options;
  return (
    <div className="relative" style={style} ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} className="input flex items-center justify-between gap-1 text-left w-full" style={{ cursor: "pointer", color: sel ? "#292524" : "#a8a29e" }}>
        <span className="truncate">{sel ? sel.label : placeholder}</span>
        <ChevronDown size={15} className={`text-stone-400 shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-amber-100 rounded-xl shadow-lg overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-amber-50 sticky top-0 bg-white">
              <div className="flex items-center gap-2 bg-stone-50 rounded-lg px-2">
                <Search size={14} className="text-stone-400 shrink-0" />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className="bg-transparent outline-none text-sm py-2 w-full" />
              </div>
            </div>
          )}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 && <div className="px-3 py-2 text-sm text-stone-400">{options.length === 0 ? "Nada cadastrado" : "Nada encontrado"}</div>}
            {filtered.map((o) => (
              <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); setQ(""); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-amber-50 transition flex items-center justify-between ${o.value === value ? "bg-amber-50 text-amber-900 font-medium" : "text-stone-700"}`}>
                <span className="truncate">{o.label}</span>
                {o.value === value && <Check size={14} className="text-amber-600 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ children, className = "" }) {
  return <div className={`bg-white rounded-2xl shadow-sm border border-amber-100 ${className}`}>{children}</div>;
}
function SectionTitle({ children, action }) {
  return <div className="flex items-center justify-between mb-4 gap-3 flex-wrap"><h2 className="text-lg font-bold text-amber-900">{children}</h2>{action}</div>;
}
function Field({ label, children, style }) {
  return <label className="flex flex-col" style={style}><span className="text-[11px] font-medium text-stone-500 mb-1">{label}</span>{children}</label>;
}
function Stat({ label, value, highlight, accent, danger }) {
  const cls = danger ? "bg-red-50 text-red-700 border-red-100" : accent ? "bg-green-50 text-green-700 border-green-100" : highlight ? "bg-amber-100 text-amber-900 border-amber-200" : "bg-stone-50 text-stone-700 border-stone-100";
  return <div className={`rounded-xl p-3 border ${cls}`}><p className="text-[10px] uppercase tracking-wide opacity-70 mb-0.5">{label}</p><p className="text-lg font-bold">{value}</p></div>;
}
function MiniStat({ label, value, highlight, accent }) {
  const cls = accent ? "text-green-700" : highlight ? "text-amber-800" : "text-stone-600";
  return <div className="bg-amber-50/50 rounded-lg p-2 text-center"><p className="text-[9px] uppercase text-stone-400">{label}</p><p className={`font-bold text-sm ${cls}`}>{value}</p></div>;
}

function custoItemReceita(item, ultimaCompra, ingredients) {
  const ing = ingredients.find((i) => i.id === item.ingredienteId);
  if (!ing) return 0;
  const compra = ultimaCompra(item.ingredienteId);
  if (!compra) return 0;
  const precoCompra = Number(compra.valor) || 0;
  const qtdCompra = Number(ing.qtd) || 0;
  const qtdUsada = Number(item.qtdUsada) || 0;
  if (!precoCompra || !qtdCompra || !qtdUsada) return 0;
  const uCompra = UNI[ing.unidade] || UNI.un;
  const uUso = UNI[item.unidadeUso || ing.unidade] || uCompra;
  let usadaNaBase;
  if (uCompra.dim === uUso.dim) usadaNaBase = (qtdUsada * uUso.fator) / uCompra.fator;
  else usadaNaBase = qtdUsada;
  return (precoCompra / qtdCompra) * usadaNaBase;
}

function Ingredientes({ ingredients, setIngredients }) {
  const empty = { nome: "", unidade: "g", qtd: "" };
  const [form, setForm] = useState(empty);
  const up = (k, v) => setForm({ ...form, [k]: v });
  const add = () => { if (!form.nome.trim() || !form.qtd) return; setIngredients([...ingredients, { id: uid("ing"), ...form }]); setForm(empty); };
  const remove = (id) => setIngredients(ingredients.filter((i) => i.id !== id));
  const updateIng = (id, patch) => setIngredients(ingredients.map((i) => i.id === id ? { ...i, ...patch } : i));
  return (
    <div>
      <SectionTitle>Ingredientes</SectionTitle>
      <Card className="p-4 mb-4">
        <p className="text-sm text-stone-500 mb-3">Cadastre o que vocês usam. A <b>unidade</b> e o <b>peso de referência</b> são usados na receita e no mercado. Use <b>ponto</b> para decimais (ex: 1.5).</p>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Nome do ingrediente" style={{ flex: "1 1 200px" }}><input value={form.nome} onChange={(e) => up("nome", e.target.value)} placeholder="Ex: Chocolate meio amargo" className="input" /></Field>
          <Field label="Peso / qtd de referência" style={{ width: 150 }}><input type="number" value={form.qtd} onChange={(e) => up("qtd", e.target.value)} placeholder="1000" className="input" /></Field>
          <Field label="Unidade" style={{ width: 90 }}><Dropdown value={form.unidade} onChange={(v) => up("unidade", v)} options={UNI_OPTS} /></Field>
          <button onClick={add} className="btn-ok"><Check size={16} /> Adicionar</button>
        </div>
      </Card>
      {ingredients.length === 0 ? (
        <Card className="p-10 text-center text-stone-400"><Carrot size={40} className="mx-auto mb-3 text-amber-200" />Nenhum ingrediente cadastrado ainda.</Card>
      ) : (
        <Card className="p-2">{ingredients.map((i) => <IngredientRow key={i.id} ing={i} onSave={(patch) => updateIng(i.id, patch)} onRemove={() => remove(i.id)} />)}</Card>
      )}
    </div>
  );
}

function IngredientRow({ ing, onSave, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(ing.nome);
  const [qtd, setQtd] = useState(ing.qtd);
  const [unidade, setUnidade] = useState(ing.unidade);
  const salvar = () => { if (!nome.trim() || !qtd) return; onSave({ nome, qtd, unidade }); setEditing(false); };
  const cancelar = () => { setNome(ing.nome); setQtd(ing.qtd); setUnidade(ing.unidade); setEditing(false); };
  if (editing) {
    return (
      <div className="flex flex-wrap items-end gap-2 px-3 py-2.5 bg-amber-50/50 rounded-lg">
        <Field label="Nome" style={{ flex: "1 1 180px" }}><input value={nome} onChange={(e) => setNome(e.target.value)} className="input" /></Field>
        <Field label="Qtd ref." style={{ width: 110 }}><input type="number" value={qtd} onChange={(e) => setQtd(e.target.value)} className="input" /></Field>
        <Field label="Unidade" style={{ width: 90 }}><Dropdown value={unidade} onChange={setUnidade} options={UNI_OPTS} /></Field>
        <button onClick={salvar} className="btn-ok"><Check size={16} /> Salvar</button>
        <button onClick={cancelar} className="btn-ghost">Cancelar</button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between px-3 py-2.5 hover:bg-amber-50 rounded-lg">
      <span className="font-medium text-stone-700">{ing.nome}</span>
      <span className="flex items-center gap-4">
        <span className="text-sm text-stone-500">{Number(ing.qtd) || 0} {ing.unidade}</span>
        <button onClick={() => setEditing(true)} title="Editar" className="text-stone-300 hover:text-amber-600"><Pencil size={16} /></button>
        <button onClick={onRemove} title="Excluir" className="text-stone-300 hover:text-red-500"><Trash2 size={16} /></button>
      </span>
    </div>
  );
}

function Mercado({ trips, setTrips, ingredients }) {
  const [showNew, setShowNew] = useState(false);
  const [mercado, setMercado] = useState("");
  const [itens, setItens] = useState([]);
  const [ingSel, setIngSel] = useState("");
  const [valor, setValor] = useState("");
  const ingOpts = ingredients.map((i) => ({ value: i.id, label: `${i.nome} (${i.qtd}${i.unidade})` }));
  const ingNome = (id) => { const x = ingredients.find((i) => i.id === id); return x ? x.nome : "?"; };
  const compraAnterior = (ingId, antesDe) => {
    let melhor = null;
    trips.forEach((t) => {
      if (t.data >= antesDe) return;
      (t.itens || []).forEach((it) => { if (it.ingredienteId === ingId) { if (!melhor || t.data > melhor.data) melhor = { valor: Number(it.valor) || 0, data: t.data }; } });
    });
    return melhor;
  };
  const addItemLinha = () => { if (!ingSel || !valor) return; setItens([...itens, { id: uid("it"), ingredienteId: ingSel, valor }]); setIngSel(""); setValor(""); };
  const salvarIda = () => { if (itens.length === 0) return; setTrips([...trips, { id: uid("trip"), mercado: mercado || "Mercado", data: hojeISO(), itens }]); setMercado(""); setItens([]); setShowNew(false); };
  const removeTrip = (id) => setTrips(trips.filter((t) => t.id !== id));
  return (
    <div>
      <SectionTitle action={!showNew && <button onClick={() => setShowNew(true)} className="btn-primary"><Plus size={17} /> Nova ida ao mercado</button>}>Mercado</SectionTitle>
      {ingredients.length === 0 && !showNew && <Card className="p-6 text-center text-stone-500 mb-4">Cadastre ingredientes primeiro (ícone de cenoura no topo).</Card>}
      {showNew && (
        <Card className="p-4 mb-4">
          <div className="flex items-center gap-2 mb-4"><Store size={18} className="text-amber-700" /><Field label="Qual mercado?" style={{ flex: "1 1 220px", maxWidth: 320 }}><input value={mercado} onChange={(e) => setMercado(e.target.value)} placeholder="Ex: Atacadão" className="input" /></Field></div>
          <div className="bg-stone-50 border border-stone-100 rounded-xl p-3 mb-3">
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Ingrediente" style={{ flex: "1 1 220px" }}><Dropdown value={ingSel} onChange={setIngSel} options={ingOpts} placeholder="Escolher ingrediente" searchable /></Field>
              <Field label="Quanto pagou R$" style={{ width: 130 }}><input type="number" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="40" className="input" /></Field>
              <button onClick={addItemLinha} className="btn-ok"><Plus size={16} /> Item</button>
            </div>
          </div>
          {itens.length > 0 && (
            <div className="space-y-1 mb-3">
              {itens.map((it) => {
                const ant = compraAnterior(it.ingredienteId, hojeISO());
                let diff = null; if (ant && ant.valor > 0) diff = ((Number(it.valor) - ant.valor) / ant.valor) * 100;
                return (
                  <div key={it.id} className="flex items-center justify-between text-sm bg-amber-50/60 border border-amber-100 rounded-lg px-3 py-2">
                    <span className="text-stone-700"><b>{ingNome(it.ingredienteId)}</b> · {BRL(it.valor)}</span>
                    <span className="flex items-center gap-3">{diff === null ? <span className="text-xs text-stone-400">primeira compra</span> : <DiffBadge diff={diff} />}<button onClick={() => setItens(itens.filter((x) => x.id !== it.id))} className="text-stone-300 hover:text-red-500"><Trash2 size={15} /></button></span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex gap-2"><button onClick={salvarIda} className="btn-primary">Salvar ida ao mercado</button><button onClick={() => { setShowNew(false); setItens([]); setMercado(""); }} className="btn-ghost">Cancelar</button></div>
        </Card>
      )}
      <div className="space-y-3">
        {trips.slice().reverse().map((t) => {
          const total = (t.itens || []).reduce((s, i) => s + (Number(i.valor) || 0), 0);
          return (
            <Card key={t.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><Store size={16} className="text-amber-600" /><h3 className="font-bold text-amber-900">{t.mercado}</h3><span className="text-xs text-stone-400">{new Date(t.data).toLocaleDateString("pt-BR")}</span></div>
                <div className="flex items-center gap-3"><b className="text-stone-700">{BRL(total)}</b><button onClick={() => removeTrip(t.id)} className="text-stone-300 hover:text-red-500"><Trash2 size={16} /></button></div>
              </div>
              <div className="space-y-1">
                {(t.itens || []).map((it) => {
                  const ant = compraAnterior(it.ingredienteId, t.data);
                  let diff = null; if (ant && ant.valor > 0) diff = ((Number(it.valor) - ant.valor) / ant.valor) * 100;
                  return (
                    <div key={it.id} className="flex items-center justify-between text-sm py-1 px-2"><span className="text-stone-600">{ingNome(it.ingredienteId)}</span><span className="flex items-center gap-3"><span className="text-stone-700">{BRL(it.valor)}</span>{diff !== null && <DiffBadge diff={diff} small />}</span></div>
                  );
                })}
              </div>
            </Card>
          );
        })}
        {trips.length === 0 && !showNew && ingredients.length > 0 && <Card className="p-10 text-center text-stone-400"><ShoppingCart size={40} className="mx-auto mb-3 text-amber-200" />Nenhuma compra registrada ainda.</Card>}
      </div>
    </div>
  );
}

function DiffBadge({ diff, small }) {
  const economia = diff < 0;
  const cls = economia ? "bg-green-50 text-green-700" : diff > 0 ? "bg-red-50 text-red-600" : "bg-stone-100 text-stone-500";
  const Icon = economia ? TrendingDown : TrendingUp;
  return <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${cls} ${small ? "text-[11px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"}`}><Icon size={small ? 11 : 13} />{economia ? "economia " : "a mais "}{Math.abs(diff).toFixed(0)}%</span>;
}

function Precificacao({ recipes, setRecipes, ingredients, ultimaCompra }) {
  const [editing, setEditing] = useState(null);
  const blank = () => ({ id: uid("rec"), nome: "", rendimento: 12, margem: 100, secoes: { massa: [], recheio: [], embalagem: [], extras: [] } });
  const [draft, setDraft] = useState(blank());
  const normalize = (r) => ({ ...r, secoes: { massa: r.secoes?.massa || [], recheio: r.secoes?.recheio || [], embalagem: r.secoes?.embalagem || [], extras: r.secoes?.extras || [] } });
  const openNew = () => { setDraft(blank()); setEditing("new"); };
  const openEdit = (r) => { setDraft(JSON.parse(JSON.stringify(normalize(r)))); setEditing(r.id); };
  const save = () => { if (!draft.nome.trim()) return; if (editing === "new") setRecipes([...recipes, draft]); else setRecipes(recipes.map((r) => r.id === draft.id ? draft : r)); setEditing(null); };
  const remove = (id) => setRecipes(recipes.filter((r) => r.id !== id));
  const custoReceita = (r) => { const s = normalize(r).secoes; return SECOES.reduce((tot, sec) => tot + (s[sec.key] || []).reduce((a, i) => a + custoItemReceita(i, ultimaCompra, ingredients), 0), 0); };
  const custoBrownie = (r) => custoReceita(r) / (Number(r.rendimento) || 1);
  const precoSugerido = (r) => custoBrownie(r) * (1 + (Number(r.margem) || 0) / 100);
  if (editing !== null) {
    const total = custoReceita(draft);
    const porBrownie = total / (Number(draft.rendimento) || 1);
    const venda = porBrownie * (1 + (Number(draft.margem) || 0) / 100);
    const addItem = (secKey, item) => setDraft({ ...draft, secoes: { ...draft.secoes, [secKey]: [...draft.secoes[secKey], item] } });
    const delItem = (secKey, id) => setDraft({ ...draft, secoes: { ...draft.secoes, [secKey]: draft.secoes[secKey].filter((x) => x.id !== id) } });
    return (
      <Card className="p-5">
        <div className="flex items-center justify-between mb-5"><h2 className="text-lg font-bold text-amber-900">{editing === "new" ? "Nova receita" : "Editar receita"}</h2><button onClick={() => setEditing(null)} className="text-stone-400 hover:text-stone-600"><X size={22} /></button></div>
        {ingredients.length === 0 && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 mb-4">Cadastre ingredientes (ícone de cenoura no topo) e registre compras no Mercado para os preços aparecerem.</div>}
        <div className="flex flex-wrap gap-4 mb-6">
          <Field label="Nome da receita" style={{ flex: "1 1 240px" }}><input value={draft.nome} onChange={(e) => setDraft({ ...draft, nome: e.target.value })} placeholder="Ex: Brownie tradicional" className="input" /></Field>
          <Field label="Rende por forma" style={{ width: 130 }}><input type="number" value={draft.rendimento} onChange={(e) => setDraft({ ...draft, rendimento: e.target.value })} className="input" /></Field>
          <Field label="Margem (%)" style={{ width: 110 }}><input type="number" value={draft.margem} onChange={(e) => setDraft({ ...draft, margem: e.target.value })} className="input" /></Field>
        </div>
        <div className="grid md:grid-cols-2 gap-4 mb-2">
          {SECOES.map((sec) => <SecaoEditor key={sec.key} sec={sec} itens={draft.secoes[sec.key]} ingredients={ingredients} ultimaCompra={ultimaCompra} onAdd={(item) => addItem(sec.key, item)} onDel={(id) => delItem(sec.key, id)} />)}
        </div>
        <div className="grid grid-cols-3 gap-3 my-6">
          <Stat label="Custo da forma" value={BRL(total)} />
          <Stat label="Custo por brownie" value={BRL(porBrownie)} highlight />
          <Stat label="Preço sugerido" value={BRL(venda)} accent />
        </div>
        <div className="flex gap-2"><button onClick={save} className="btn-primary">Salvar receita</button><button onClick={() => setEditing(null)} className="btn-ghost">Cancelar</button></div>
      </Card>
    );
  }
  return (
    <div>
      <SectionTitle action={<button onClick={openNew} className="btn-primary"><Plus size={17} /> Nova receita</button>}>Precificação</SectionTitle>
      {recipes.length === 0 && <Card className="p-10 text-center text-stone-400"><Cookie size={40} className="mx-auto mb-3 text-amber-200" />Nenhuma receita ainda.</Card>}
      <div className="grid sm:grid-cols-2 gap-4">
        {recipes.map((r) => {
          const n = normalize(r);
          const totalItens = SECOES.reduce((a, s) => a + n.secoes[s.key].length, 0);
          return (
            <Card key={r.id} className="p-4 hover:shadow-md transition">
              <div className="cursor-pointer" onClick={() => openEdit(r)}>
                <div className="flex items-start justify-between"><h3 className="font-bold text-amber-900">{r.nome}</h3><button onClick={(e) => { e.stopPropagation(); remove(r.id); }} className="text-stone-300 hover:text-red-500"><Trash2 size={16} /></button></div>
                <p className="text-xs text-stone-500 mb-3">{totalItens} itens · rende {r.rendimento}/forma</p>
                <div className="grid grid-cols-3 gap-2"><MiniStat label="Forma" value={BRL(custoReceita(r))} /><MiniStat label="Por brownie" value={BRL(custoBrownie(r))} highlight /><MiniStat label="Sugerido" value={BRL(precoSugerido(r))} accent /></div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SecaoEditor({ sec, itens, ingredients, ultimaCompra, onAdd, onDel }) {
  const empty = { ingredienteId: "", qtdUsada: "", unidadeUso: "g" };
  const [form, setForm] = useState(empty);
  const up = (k, v) => setForm({ ...form, [k]: v });
  const ingOpts = ingredients.map((i) => ({ value: i.id, label: i.nome }));
  const ingNome = (id) => { const x = ingredients.find((i) => i.id === id); return x ? x.nome : "?"; };
  const previa = custoItemReceita(form, ultimaCompra, ingredients);
  const confirmar = () => { if (!form.ingredienteId || !form.qtdUsada) return; onAdd({ id: uid("ri"), ...form }); setForm(empty); };
  const subtotal = itens.reduce((a, i) => a + custoItemReceita(i, ultimaCompra, ingredients), 0);
  const est = SEC_ESTILO[sec.key] || SEC_ESTILO.massa;
  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-50">
        <h3 className="font-bold text-stone-800 flex items-center gap-2"><span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm ${est.cor}`}>{est.emoji}</span>{sec.label}</h3>
        <span className="text-sm font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg">{BRL(subtotal)}</span>
      </div>
      <div className="px-4 py-3 flex-1">
        {itens.length === 0 ? <p className="text-sm text-stone-400 py-2 text-center">Nenhum item ainda.</p> : (
          <div className="space-y-1.5 mb-2">
            {itens.map((i) => {
              const semPreco = !ultimaCompra(i.ingredienteId);
              return (
                <div key={i.id} className="flex items-center justify-between gap-2 text-sm bg-amber-50/40 rounded-lg px-3 py-2">
                  <div className="min-w-0"><p className="font-medium text-stone-700 truncate">{ingNome(i.ingredienteId)}</p><p className="text-xs text-stone-400">usa {i.qtdUsada}{i.unidadeUso}{semPreco && <span className="text-orange-500"> · sem compra registrada</span>}</p></div>
                  <div className="flex items-center gap-2 shrink-0"><b className="text-amber-800">{BRL(custoItemReceita(i, ultimaCompra, ingredients))}</b><button onClick={() => onDel(i.id)} className="text-stone-300 hover:text-red-500"><Trash2 size={15} /></button></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="bg-stone-50 border-t border-stone-100 px-4 py-3">
        <Field label="Ingrediente"><Dropdown value={form.ingredienteId} onChange={(v) => up("ingredienteId", v)} options={ingOpts} placeholder="Escolher" searchable /></Field>
        <div className="flex items-end gap-2 mt-2">
          <Field label="Quanto usa" style={{ flex: "1 1 auto" }}><input type="number" value={form.qtdUsada} onChange={(e) => up("qtdUsada", e.target.value)} placeholder="100" className="input" /></Field>
          <Field label="Un." style={{ width: 78 }}><Dropdown value={form.unidadeUso} onChange={(v) => up("unidadeUso", v)} options={UNI_OPTS} /></Field>
          <button onClick={confirmar} className="btn-ok shrink-0" title="Adicionar item"><Plus size={16} /></button>
        </div>
        {form.ingredienteId && form.qtdUsada ? <p className="text-xs text-stone-500 mt-2">Custo deste item: <b className="text-amber-800">{BRL(previa)}</b></p> : null}
      </div>
    </div>
  );
}

function Clientes({ clients, setClients, recipes }) {
  const [showNew, setShowNew] = useState(false);
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const addClient = () => { if (!nome.trim()) return; setClients([...clients, { id: uid("cli"), nome, endereco, movimentos: [] }]); setNome(""); setEndereco(""); setShowNew(false); };
  const remove = (id) => setClients(clients.filter((c) => c.id !== id));
  const addMov = (clientId, mov) => setClients(clients.map((c) => c.id === clientId ? { ...c, movimentos: [...c.movimentos, { id: uid("mov"), ...mov }] } : c));
  const delMov = (clientId, movId) => setClients(clients.map((c) => c.id === clientId ? { ...c, movimentos: c.movimentos.filter((m) => m.id !== movId) } : c));
  return (
    <div>
      <SectionTitle action={<button onClick={() => setShowNew(true)} className="btn-primary"><Plus size={17} /> Novo cliente</button>}>Clientes (consignação)</SectionTitle>
      {showNew && (
        <Card className="p-4 mb-4">
          <div className="flex flex-wrap gap-3 mb-3">
            <Field label="Nome do estabelecimento" style={{ flex: "1 1 200px" }}><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Cafeteria Centro" className="input" /></Field>
            <Field label="Endereço / observação" style={{ flex: "1 1 200px" }}><input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Opcional" className="input" /></Field>
          </div>
          <div className="flex gap-2"><button onClick={addClient} className="btn-primary">Adicionar</button><button onClick={() => setShowNew(false)} className="btn-ghost">Cancelar</button></div>
        </Card>
      )}
      {clients.length === 0 && !showNew && <Card className="p-10 text-center text-stone-400"><Users size={40} className="mx-auto mb-3 text-amber-200" />Cadastre os estabelecimentos onde vocês deixam brownies.</Card>}
      <div className="space-y-4">{clients.map((c) => <ClientCard key={c.id} c={c} recipes={recipes} addMov={addMov} delMov={delMov} remove={remove} />)}</div>
    </div>
  );
}

function saldoCliente(c) {
  let consignados = 0, deve = 0;
  c.movimentos.forEach((m) => {
    if (m.tipo === "entrega") { consignados += Number(m.qtd) || 0; deve += (Number(m.qtd) || 0) * (Number(m.valorUnit) || 0); }
    if (m.tipo === "pagamento") deve -= Number(m.valor) || 0;
  });
  if (deve < 0) deve = 0;
  return { consignados, deve };
}

function ClientCard({ c, recipes, addMov, delMov, remove }) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("entrega");
  const [receitaId, setReceitaId] = useState("");
  const [qtd, setQtd] = useState("");
  const [valorUnit, setValorUnit] = useState("");
  const [valor, setValor] = useState("");
  const s = saldoCliente(c);
  const recOpts = recipes.map((r) => ({ value: r.id, label: r.nome }));
  const recNome = (id) => { const x = recipes.find((r) => r.id === id); return x ? x.nome : ""; };
  const submit = () => {
    if (tipo === "pagamento") { if (!valor) return; addMov(c.id, { tipo, valor, data: hojeISO() }); setValor(""); }
    else { if (!qtd || !valorUnit) return; addMov(c.id, { tipo: "entrega", receitaId, qtd, valorUnit, data: hojeISO() }); setQtd(""); setValorUnit(""); setReceitaId(""); }
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="cursor-pointer flex-1 min-w-0" onClick={() => setOpen(!open)}>
          <div className="flex items-center gap-2"><ChevronRight size={18} className={`text-amber-400 transition shrink-0 ${open ? "rotate-90" : ""}`} /><h3 className="font-bold text-amber-900 truncate">{c.nome}</h3></div>
          {c.endereco && <p className="text-xs text-stone-500 ml-6 truncate">{c.endereco}</p>}
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right"><p className="text-[10px] text-stone-400 uppercase">No cliente</p><p className="font-bold text-amber-800">{s.consignados} 🍫</p></div>
          <div className="text-right"><p className="text-[10px] text-stone-400 uppercase">Deve</p><p className={`font-bold ${s.deve > 0.005 ? "text-orange-600" : "text-green-600"}`}>{BRL(s.deve)}</p></div>
          <button onClick={() => remove(c.id)} className="text-stone-300 hover:text-red-500"><Trash2 size={16} /></button>
        </div>
      </div>
      {open && (
        <div className="mt-4 pt-4 border-t border-amber-100">
          <div className="bg-amber-50/50 p-3 rounded-xl mb-4">
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Movimento" style={{ width: 170 }}><Dropdown value={tipo} onChange={setTipo} options={[{ value: "entrega", label: "Deixar brownies" }, { value: "pagamento", label: "Pagamento recebido" }]} /></Field>
              {tipo === "entrega" && (<>
                <Field label="Receita" style={{ width: 160 }}><Dropdown value={receitaId} onChange={setReceitaId} options={recOpts} placeholder="Qual brownie" searchable /></Field>
                <Field label="Quantidade" style={{ width: 100 }}><input type="number" value={qtd} onChange={(e) => setQtd(e.target.value)} className="input" placeholder="15" /></Field>
                <Field label="Valor unit. R$" style={{ width: 110 }}><input type="number" value={valorUnit} onChange={(e) => setValorUnit(e.target.value)} className="input" placeholder="8.00" /></Field>
              </>)}
              {tipo === "pagamento" && <Field label="Valor recebido R$" style={{ width: 150 }}><input type="number" value={valor} onChange={(e) => setValor(e.target.value)} className="input" placeholder="0.00" /></Field>}
              <button onClick={submit} className="btn-ok"><Check size={16} /> Lançar</button>
            </div>
          </div>
          <div className="space-y-1">
            {c.movimentos.length === 0 && <p className="text-sm text-stone-400">Nenhum movimento ainda.</p>}
            {[...c.movimentos].reverse().map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm py-1.5 px-2 hover:bg-amber-50 rounded-lg">
                <span className="flex items-center gap-2 flex-wrap">
                  {m.tipo === "entrega" && <span className="text-blue-600">📦 {m.qtd}× {m.receitaId ? recNome(m.receitaId) : "brownies"} × {BRL(m.valorUnit)} = <b>{BRL((Number(m.qtd) || 0) * (Number(m.valorUnit) || 0))}</b></span>}
                  {m.tipo === "pagamento" && <span className="text-green-700">✅ Pagou {BRL(m.valor)}</span>}
                  <span className="text-stone-400 text-xs">{new Date(m.data).toLocaleDateString("pt-BR")}</span>
                </span>
                <button onClick={() => delMov(c.id, m.id)} className="text-stone-300 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function Dashboard({ trips, clients, recipes }) {
  const now = new Date();
  const [mes, setMes] = useState(ymd(now));
  const mesOpts = [];
  for (let i = 0; i < 12; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); mesOpts.push({ value: ymd(d), label: `${MESES[d.getMonth()]} ${d.getFullYear()}` }); }
  const recNome = (id) => { const x = recipes.find((r) => r.id === id); return x ? x.nome : "Brownies"; };
  const gastosMes = trips.filter((t) => ymd(t.data) === mes).reduce((s, t) => s + (t.itens || []).reduce((a, i) => a + (Number(i.valor) || 0), 0), 0);
  let entradasMes = 0; const porCliente = {}; const entregasMes = []; let browniesMes = 0; const porReceita = {};
  clients.forEach((c) => {
    c.movimentos.forEach((m) => {
      if (ymd(m.data) !== mes) return;
      if (m.tipo === "pagamento") { entradasMes += Number(m.valor) || 0; porCliente[c.nome] = (porCliente[c.nome] || 0) + (Number(m.valor) || 0); }
      if (m.tipo === "entrega") { const q = Number(m.qtd) || 0; browniesMes += q; entregasMes.push({ id: m.id, cliente: c.nome, qtd: q, receita: m.receitaId ? recNome(m.receitaId) : "Brownies", data: m.data }); const rn = m.receitaId ? recNome(m.receitaId) : "Brownies"; porReceita[rn] = (porReceita[rn] || 0) + q; }
    });
  });
  const lucro = entradasMes - gastosMes;
  const topClientes = Object.entries(porCliente).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topReceitas = Object.entries(porReceita).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const ultimasEntregas = entregasMes.sort((a, b) => (b.id > a.id ? 1 : -1)).slice(0, 6);
  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-amber-900">Início</h2>
        <div className="flex items-center gap-2"><Calendar size={16} className="text-amber-600" /><Dropdown value={mes} onChange={setMes} options={mesOpts} style={{ width: 180 }} /></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Entradas do mês" value={BRL(entradasMes)} accent />
        <Stat label="Gastos do mês" value={BRL(gastosMes)} />
        <Stat label="Lucro do mês" value={BRL(lucro)} highlight={lucro >= 0} danger={lucro < 0} />
        <Stat label="Brownies entregues" value={browniesMes} />
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2"><Users size={16} /> Melhores clientes</h3>
          {topClientes.length === 0 ? <p className="text-sm text-stone-400">Sem pagamentos neste mês.</p> : <div className="space-y-2">{topClientes.map(([nome, v], idx) => <div key={nome} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center">{idx + 1}</span>{nome}</span><b className="text-green-700">{BRL(v)}</b></div>)}</div>}
        </Card>
        <Card className="p-4">
          <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2"><Cookie size={16} /> Receitas mais vendidas</h3>
          {topReceitas.length === 0 ? <p className="text-sm text-stone-400">Sem entregas neste mês.</p> : <div className="space-y-2">{topReceitas.map(([nome, q], idx) => <div key={nome} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center">{idx + 1}</span>{nome}</span><b className="text-amber-800">{q} un</b></div>)}</div>}
        </Card>
        <Card className="p-4">
          <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2"><ChevronRight size={16} /> Últimas entregas</h3>
          {ultimasEntregas.length === 0 ? <p className="text-sm text-stone-400">Sem entregas neste mês.</p> : <div className="space-y-2">{ultimasEntregas.map((e) => <div key={e.id} className="text-sm"><div className="flex items-center justify-between"><span className="text-stone-700">{e.cliente}</span><b className="text-stone-600">{e.qtd}×</b></div><div className="flex items-center justify-between text-xs text-stone-400"><span>{e.receita}</span><span>{new Date(e.data).toLocaleDateString("pt-BR")}</span></div></div>)}</div>}
        </Card>
      </div>
    </div>
  );
}

function Ifood() {
  return (
    <Card className="p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4"><ShoppingBag size={32} className="text-red-500" /></div>
      <h2 className="text-xl font-bold text-amber-900 mb-2">Vendas iFood</h2>
      <p className="text-stone-500 max-w-md mx-auto">Em breve! Aqui vocês vão poder lançar e acompanhar as vendas feitas pelo iFood.</p>
      <span className="inline-block mt-4 text-xs font-semibold bg-amber-100 text-amber-800 px-3 py-1 rounded-full">Em desenvolvimento</span>
    </Card>
  );
}