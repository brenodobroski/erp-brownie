import { useState, useEffect, useRef } from "react";
import { Cookie, Users, BarChart3, ShoppingBag, ShoppingCart, Carrot, Plus, Trash2, X, ChevronRight, ChevronDown, Check, TrendingUp, TrendingDown, Store, Calendar, Settings, Cloud, CloudOff, RefreshCw } from "lucide-react";
import { getSheetUrl, setSheetUrl as persistUrl, readCache, writeCache, clearCache, pull, push } from "./storage";

const BRL = (n) => "R$ " + (Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const ymd = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`; };
const hojeISO = () => new Date().toISOString();

const SECOES = [
  { key: "massa", label: "Massa" },
  { key: "recheio", label: "Recheio" },
  { key: "embalagem", label: "Embalagem" },
  { key: "extras", label: "Extras" },
];

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
  const [syncStatus, setSyncStatus] = useState("idle"); // idle|syncing|ok|error|offline
  const [syncMsg, setSyncMsg] = useState("");
  const firstSave = useRef(true);
  const saveTimer = useRef(null);

  const applyData = (d) => {
    setIngredients(d.ingredients || []); setTrips(d.trips || []);
    setRecipes(d.recipes || []); setClients(d.clients || []);
  };

  // Inicialização: Sheets é a fonte da verdade. Cache só se a nuvem falhar.
  useEffect(() => {
    (async () => {
      const url = getSheetUrl();
      setSheetUrl(url);
      if (url) {
        setSyncStatus("syncing");
        const r = await pull(url);
        if (r.ok) { applyData(r.data); writeCache(r.data); setSyncStatus("ok"); setSyncMsg(""); }
        else {
          // nuvem falhou: usa cache como último recurso
          const c = readCache();
          if (c) applyData(c);
          setSyncStatus("error"); setSyncMsg(r.error || "falha ao puxar da nuvem");
        }
      } else {
        const c = readCache();
        if (c) applyData(c);
        setSyncStatus("idle");
      }
      firstSave.current = true;
      setLoaded(true);
    })();
  }, []);

  // Salvar: cache local sempre; push pro Sheets com debounce.
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

  const limparCache = () => { clearCache(); };

  const ultimaCompra = (ingId) => {
    let melhor = null;
    trips.forEach((t) => {
      (t.itens || []).forEach((it) => {
        if (it.ingredienteId === ingId) { if (!melhor || t.data > melhor.data) melhor = { ...it, data: t.data }; }
      });
    });
    return melhor;
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "clientes", label: "Clientes", icon: Users },
    { id: "mercado", label: "Mercado", icon: ShoppingCart },
    { id: "precificacao", label: "Precificação", icon: Cookie },
    { id: "ifood", label: "iFood", icon: ShoppingBag },
  ];

  if (!loaded) return <div className="min-h-screen flex items-center justify-center text-amber-900">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 text-stone-800">
      <Styles />
      <header className="bg-gradient-to-r from-amber-800 to-amber-900 text-amber-50 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-50/20 flex items-center justify-center"><Cookie size={26} /></div>
          <div className="flex-1">
            <h1 className="text-xl font-bold leading-tight">ERP Brownie</h1>
            <p className="text-amber-200 text-xs">Controle do negócio da família</p>
          </div>
          <SyncBadge status={syncStatus} connected={!!sheetUrl} onClick={doPull} />
          <button onClick={() => setShowConfig(true)} title="Configurar sincronização"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50/10 text-amber-200 hover:bg-amber-50/20 hover:text-amber-50 transition">
            <Settings size={18} />
          </button>
          <button onClick={() => setTab("ingredientes")} title="Ingredientes"
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${tab === "ingredientes" ? "bg-amber-50/25 text-amber-50" : "bg-amber-50/10 text-amber-200 hover:bg-amber-50/20 hover:text-amber-50"}`}>
            <Carrot size={18} /> <span className="hidden sm:inline">Ingredientes</span>
          </button>
        </div>
        <nav className="max-w-5xl mx-auto px-2 flex gap-1 overflow-x-auto">
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

      {showConfig && <ConfigModal sheetUrl={sheetUrl} saveUrl={saveUrl} onClose={() => setShowConfig(false)} onPull={doPull} onClear={limparCache} status={syncStatus} msg={syncMsg} />}
    </div>
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
    <button onClick={onClick} title="Clique para atualizar da nuvem"
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2"><Cloud size={20} /> Sincronização (Google Sheets)</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={22} /></button>
        </div>
        <ol className="text-sm text-stone-600 space-y-1.5 mb-4 list-decimal pl-5">
          <li>Crie uma planilha no Google Sheets.</li>
          <li>Menu <b>Extensões → Apps Script</b>, cole o código e salve.</li>
          <li><b>Implantar → App da Web</b>. Acesso: <b>Qualquer pessoa</b>.</li>
          <li>Copie a URL (termina em <code>/exec</code>) e cole abaixo.</li>
        </ol>
        <label className="flex flex-col">
          <span className="text-[11px] font-medium text-stone-500 mb-1">URL do App da Web</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" className="input" />
        </label>
        <div className="flex flex-wrap gap-2 mt-4">
          <button onClick={handleSave} className="btn-primary">{savedFlash ? "Salvo!" : "Salvar URL"}</button>
          <button onClick={onPull} className="btn-ghost"><RefreshCw size={15} /> Puxar dados da nuvem</button>
          <button onClick={onClear} className="btn-ghost">Limpar cache local</button>
        </div>
        <p className="text-xs text-stone-500 mt-3">Status: <b>{status}</b>{msg ? ` — ${msg}` : ""}. O app puxa do Sheets ao abrir e salva sozinho a cada mudança.</p>
        {(status === "error" || status === "offline") && (
          <p className="text-xs text-red-500 mt-2">Se aparecer erro aqui mas a URL abre o JSON no navegador, normalmente é a implantação sem acesso "Qualquer pessoa" ou uma URL antiga. Reimplante e cole a nova /exec.</p>
        )}
        <p className="text-xs text-orange-500 mt-2">⚠️ "Puxar da nuvem" substitui o que está na tela pelos dados da planilha.</p>
      </div>
    </div>
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
    .btn-ok { display:inline-flex; align-items:center; gap:6px; justify-content:center; background:#16a34a; color:#fff; font-weight:600; font-size:14px; padding:8px 16px; border-radius:10px; border:none; cursor:pointer; height:38px; }
    .btn-ok:hover { background:#15803d; }
  `}</style>;
}

function Dropdown({ value, onChange, options, placeholder = "Selecionar", style }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const sel = options.find((o) => o.value === value);
  return (
    <div className="relative" style={style} ref={ref}>
      <button type="button" onClick={() => setOpen(!open)}
        className="input flex items-center justify-between gap-1 text-left w-full"
        style={{ cursor: "pointer", color: sel ? "#292524" : "#a8a29e" }}>
        <span className="truncate">{sel ? sel.label : placeholder}</span>
        <ChevronDown size={15} className={`text-stone-400 shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-amber-100 rounded-xl shadow-lg max-h-56 overflow-y-auto py-1">
          {options.length === 0 && <div className="px-3 py-2 text-sm text-stone-400">Nada cadastrado</div>}
          {options.map((o) => (
            <button key={o.value} type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-amber-50 transition flex items-center justify-between ${o.value === value ? "bg-amber-50 text-amber-900 font-medium" : "text-stone-700"}`}>
              <span className="truncate">{o.label}</span>
              {o.value === value && <Check size={14} className="text-amber-600 shrink-0" />}
            </button>
          ))}
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
  const add = () => {
    if (!form.nome.trim() || !form.qtd) return;
    setIngredients([...ingredients, { id: Date.now().toString() + Math.random(), ...form }]);
    setForm(empty);
  };
  const remove = (id) => setIngredients(ingredients.filter((i) => i.id !== id));
  return (
    <div>
      <SectionTitle>Ingredientes</SectionTitle>
      <Card className="p-4 mb-4">
        <p className="text-sm text-stone-500 mb-3">Cadastre o que vocês usam. A <b>unidade</b> e o <b>peso de referência</b> são usados na receita e no mercado.</p>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Nome do ingrediente" style={{ flex: "1 1 200px" }}>
            <input value={form.nome} onChange={(e) => up("nome", e.target.value)} placeholder="Ex: Chocolate meio amargo" className="input" />
          </Field>
          <Field label="Peso / qtd de referência" style={{ width: 150 }}>
            <input type="number" value={form.qtd} onChange={(e) => up("qtd", e.target.value)} placeholder="1000" className="input" />
          </Field>
          <Field label="Unidade" style={{ width: 90 }}>
            <Dropdown value={form.unidade} onChange={(v) => up("unidade", v)} options={UNI_OPTS} />
          </Field>
          <button onClick={add} className="btn-ok"><Check size={16} /> Adicionar</button>
        </div>
      </Card>
      {ingredients.length === 0 ? (
        <Card className="p-10 text-center text-stone-400"><Carrot size={40} className="mx-auto mb-3 text-amber-200" />Nenhum ingrediente cadastrado ainda.</Card>
      ) : (
        <Card className="p-2">
          {ingredients.map((i) => (
            <div key={i.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-amber-50 rounded-lg">
              <span className="font-medium text-stone-700">{i.nome}</span>
              <span className="flex items-center gap-4">
                <span className="text-sm text-stone-500">ref. {i.qtd} {i.unidade}</span>
                <button onClick={() => remove(i.id)} className="text-stone-300 hover:text-red-500"><Trash2 size={16} /></button>
              </span>
            </div>
          ))}
        </Card>
      )}
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
      (t.itens || []).forEach((it) => {
        if (it.ingredienteId === ingId) { if (!melhor || t.data > melhor.data) melhor = { valor: Number(it.valor) || 0, data: t.data }; }
      });
    });
    return melhor;
  };
  const addItemLinha = () => {
    if (!ingSel || !valor) return;
    setItens([...itens, { id: Date.now().toString() + Math.random(), ingredienteId: ingSel, valor }]);
    setIngSel(""); setValor("");
  };
  const salvarIda = () => {
    if (itens.length === 0) return;
    setTrips([...trips, { id: Date.now().toString(), mercado: mercado || "Mercado", data: hojeISO(), itens }]);
    setMercado(""); setItens([]); setShowNew(false);
  };
  const removeTrip = (id) => setTrips(trips.filter((t) => t.id !== id));
  return (
    <div>
      <SectionTitle action={!showNew && <button onClick={() => setShowNew(true)} className="btn-primary"><Plus size={17} /> Nova ida ao mercado</button>}>Mercado</SectionTitle>
      {ingredients.length === 0 && !showNew && (
        <Card className="p-6 text-center text-stone-500 mb-4">Cadastre ingredientes primeiro (ícone de cenoura no topo) para registrar compras.</Card>
      )}
      {showNew && (
        <Card className="p-4 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Store size={18} className="text-amber-700" />
            <Field label="Qual mercado?" style={{ flex: "1 1 220px", maxWidth: 320 }}>
              <input value={mercado} onChange={(e) => setMercado(e.target.value)} placeholder="Ex: Atacadão" className="input" />
            </Field>
          </div>
          <div className="bg-stone-50 border border-stone-100 rounded-xl p-3 mb-3">
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Ingrediente" style={{ flex: "1 1 220px" }}>
                <Dropdown value={ingSel} onChange={setIngSel} options={ingOpts} placeholder="Escolher ingrediente" />
              </Field>
              <Field label="Quanto pagou R$" style={{ width: 130 }}>
                <input type="number" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="40" className="input" />
              </Field>
              <button onClick={addItemLinha} className="btn-ok"><Plus size={16} /> Item</button>
            </div>
          </div>
          {itens.length > 0 && (
            <div className="space-y-1 mb-3">
              {itens.map((it) => {
                const ant = compraAnterior(it.ingredienteId, hojeISO());
                let diff = null;
                if (ant && ant.valor > 0) diff = ((Number(it.valor) - ant.valor) / ant.valor) * 100;
                return (
                  <div key={it.id} className="flex items-center justify-between text-sm bg-amber-50/60 border border-amber-100 rounded-lg px-3 py-2">
                    <span className="text-stone-700"><b>{ingNome(it.ingredienteId)}</b> · {BRL(it.valor)}</span>
                    <span className="flex items-center gap-3">
                      {diff === null ? <span className="text-xs text-stone-400">primeira compra</span> : <DiffBadge diff={diff} />}
                      <button onClick={() => setItens(itens.filter((x) => x.id !== it.id))} className="text-stone-300 hover:text-red-500"><Trash2 size={15} /></button>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={salvarIda} className="btn-primary">Salvar ida ao mercado</button>
            <button onClick={() => { setShowNew(false); setItens([]); setMercado(""); }} className="btn-ghost">Cancelar</button>
          </div>
        </Card>
      )}
      <div className="space-y-3">
        {trips.slice().reverse().map((t) => {
          const total = (t.itens || []).reduce((s, i) => s + (Number(i.valor) || 0), 0);
          return (
            <Card key={t.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Store size={16} className="text-amber-600" />
                  <h3 className="font-bold text-amber-900">{t.mercado}</h3>
                  <span className="text-xs text-stone-400">{new Date(t.data).toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <b className="text-stone-700">{BRL(total)}</b>
                  <button onClick={() => removeTrip(t.id)} className="text-stone-300 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="space-y-1">
                {(t.itens || []).map((it) => {
                  const ant = compraAnterior(it.ingredienteId, t.data);
                  let diff = null;
                  if (ant && ant.valor > 0) diff = ((Number(it.valor) - ant.valor) / ant.valor) * 100;
                  return (
                    <div key={it.id} className="flex items-center justify-between text-sm py-1 px-2">
                      <span className="text-stone-600">{ingNome(it.ingredienteId)}</span>
                      <span className="flex items-center gap-3">
                        <span className="text-stone-700">{BRL(it.valor)}</span>
                        {diff !== null && <DiffBadge diff={diff} small />}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
        {trips.length === 0 && !showNew && ingredients.length > 0 && (
          <Card className="p-10 text-center text-stone-400"><ShoppingCart size={40} className="mx-auto mb-3 text-amber-200" />Nenhuma compra registrada ainda.</Card>
        )}
      </div>
    </div>
  );
}

function DiffBadge({ diff, small }) {
  const economia = diff < 0;
  const cls = economia ? "bg-green-50 text-green-700" : diff > 0 ? "bg-red-50 text-red-600" : "bg-stone-100 text-stone-500";
  const Icon = economia ? TrendingDown : TrendingUp;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${cls} ${small ? "text-[11px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"}`}>
      <Icon size={small ? 11 : 13} />
      {economia ? "economia " : "a mais "}{Math.abs(diff).toFixed(0)}%
    </span>
  );
}

function Precificacao({ recipes, setRecipes, ingredients, ultimaCompra }) {
  const [editing, setEditing] = useState(null);
  const blank = () => ({ id: Date.now().toString(), nome: "", rendimento: 12, margem: 100, secoes: { massa: [], recheio: [], embalagem: [], extras: [] } });
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
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-amber-900">{editing === "new" ? "Nova receita" : "Editar receita"}</h2>
          <button onClick={() => setEditing(null)} className="text-stone-400 hover:text-stone-600"><X size={22} /></button>
        </div>
        {ingredients.length === 0 && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 mb-4">Cadastre ingredientes (ícone de cenoura no topo) e registre compras no Mercado para os preços aparecerem.</div>}
        <div className="flex flex-wrap gap-4 mb-6">
          <Field label="Nome da receita" style={{ flex: "1 1 240px" }}><input value={draft.nome} onChange={(e) => setDraft({ ...draft, nome: e.target.value })} placeholder="Ex: Brownie tradicional" className="input" /></Field>
          <Field label="Rende por forma" style={{ width: 130 }}><input type="number" value={draft.rendimento} onChange={(e) => setDraft({ ...draft, rendimento: e.target.value })} className="input" /></Field>
          <Field label="Margem (%)" style={{ width: 110 }}><input type="number" value={draft.margem} onChange={(e) => setDraft({ ...draft, margem: e.target.value })} className="input" /></Field>
        </div>
        {SECOES.map((sec) => (
          <SecaoEditor key={sec.key} sec={sec} itens={draft.secoes[sec.key]} ingredients={ingredients} ultimaCompra={ultimaCompra}
            onAdd={(item) => addItem(sec.key, item)} onDel={(id) => delItem(sec.key, id)} />
        ))}
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
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-amber-900">{r.nome}</h3>
                  <button onClick={(e) => { e.stopPropagation(); remove(r.id); }} className="text-stone-300 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
                <p className="text-xs text-stone-500 mb-3">{totalItens} itens · rende {r.rendimento}/forma</p>
                <div className="grid grid-cols-3 gap-2">
                  <MiniStat label="Forma" value={BRL(custoReceita(r))} />
                  <MiniStat label="Por brownie" value={BRL(custoBrownie(r))} highlight />
                  <MiniStat label="Sugerido" value={BRL(precoSugerido(r))} accent />
                </div>
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
  const confirmar = () => { if (!form.ingredienteId || !form.qtdUsada) return; onAdd({ id: Date.now().toString() + Math.random(), ...form }); setForm(empty); };
  const subtotal = itens.reduce((a, i) => a + custoItemReceita(i, ultimaCompra, ingredients), 0);
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2"><h3 className="font-semibold text-amber-900">{sec.label}</h3><span className="text-xs text-stone-400">{BRL(subtotal)}</span></div>
      <div className="space-y-1 mb-2">
        {itens.map((i) => {
          const semPreco = !ultimaCompra(i.ingredienteId);
          return (
            <div key={i.id} className="flex items-center justify-between text-sm bg-amber-50/60 border border-amber-100 rounded-lg px-3 py-2">
              <span className="text-stone-700"><b>{ingNome(i.ingredienteId)}</b><span className="text-stone-400"> · usa {i.qtdUsada}{i.unidadeUso}</span>{semPreco && <span className="text-orange-500 text-xs"> · sem compra registrada</span>}</span>
              <span className="flex items-center gap-3"><b className="text-amber-800">{BRL(custoItemReceita(i, ultimaCompra, ingredients))}</b><button onClick={() => onDel(i.id)} className="text-stone-300 hover:text-red-500"><Trash2 size={15} /></button></span>
            </div>
          );
        })}
      </div>
      <div className="bg-stone-50 border border-stone-100 rounded-xl p-3">
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Ingrediente" style={{ flex: "1 1 180px" }}>
            <Dropdown value={form.ingredienteId} onChange={(v) => up("ingredienteId", v)} options={ingOpts} placeholder="Escolher" />
          </Field>
          <Field label="Usou" style={{ width: 80 }}><input type="number" value={form.qtdUsada} onChange={(e) => up("qtdUsada", e.target.value)} placeholder="100" className="input" /></Field>
          <Field label="Un." style={{ width: 80 }}><Dropdown value={form.unidadeUso} onChange={(v) => up("unidadeUso", v)} options={UNI_OPTS} /></Field>
          <div className="pb-1 text-right" style={{ width: 80 }}><p className="text-[10px] text-stone-400 uppercase leading-none">Custo</p><p className="font-semibold text-amber-800 text-sm">{BRL(previa)}</p></div>
          <button onClick={confirmar} className="btn-ok"><Check size={16} /> OK</button>
        </div>
      </div>
    </div>
  );
}

function Clientes({ clients, setClients, recipes }) {
  const [showNew, setShowNew] = useState(false);
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const addClient = () => { if (!nome.trim()) return; setClients([...clients, { id: Date.now().toString(), nome, endereco, movimentos: [] }]); setNome(""); setEndereco(""); setShowNew(false); };
  const remove = (id) => setClients(clients.filter((c) => c.id !== id));
  const addMov = (clientId, mov) => setClients(clients.map((c) => c.id === clientId ? { ...c, movimentos: [...c.movimentos, { id: Date.now().toString(), ...mov }] } : c));
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
              <Field label="Movimento" style={{ width: 170 }}>
                <Dropdown value={tipo} onChange={setTipo} options={[{ value: "entrega", label: "Deixar brownies" }, { value: "pagamento", label: "Pagamento recebido" }]} />
              </Field>
              {tipo === "entrega" && (
                <>
                  <Field label="Receita" style={{ width: 160 }}><Dropdown value={receitaId} onChange={setReceitaId} options={recOpts} placeholder="Qual brownie" /></Field>
                  <Field label="Quantidade" style={{ width: 100 }}><input type="number" value={qtd} onChange={(e) => setQtd(e.target.value)} className="input" placeholder="15" /></Field>
                  <Field label="Valor unit. R$" style={{ width: 110 }}><input type="number" value={valorUnit} onChange={(e) => setValorUnit(e.target.value)} className="input" placeholder="8,00" /></Field>
                </>
              )}
              {tipo === "pagamento" && <Field label="Valor recebido R$" style={{ width: 150 }}><input type="number" value={valor} onChange={(e) => setValor(e.target.value)} className="input" placeholder="0,00" /></Field>}
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
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    mesOpts.push({ value: ymd(d), label: `${MESES[d.getMonth()]} ${d.getFullYear()}` });
  }
  const recNome = (id) => { const x = recipes.find((r) => r.id === id); return x ? x.nome : "Brownies"; };
  const gastosMes = trips.filter((t) => ymd(t.data) === mes).reduce((s, t) => s + (t.itens || []).reduce((a, i) => a + (Number(i.valor) || 0), 0), 0);
  let entradasMes = 0;
  const porCliente = {};
  const entregasMes = [];
  let browniesMes = 0;
  const porReceita = {};
  clients.forEach((c) => {
    c.movimentos.forEach((m) => {
      if (ymd(m.data) !== mes) return;
      if (m.tipo === "pagamento") { entradasMes += Number(m.valor) || 0; porCliente[c.nome] = (porCliente[c.nome] || 0) + (Number(m.valor) || 0); }
      if (m.tipo === "entrega") {
        const q = Number(m.qtd) || 0; browniesMes += q;
        entregasMes.push({ id: m.id, cliente: c.nome, qtd: q, receita: m.receitaId ? recNome(m.receitaId) : "Brownies", data: m.data });
        const rn = m.receitaId ? recNome(m.receitaId) : "Brownies"; porReceita[rn] = (porReceita[rn] || 0) + q;
      }
    });
  });
  const lucro = entradasMes - gastosMes;
  const topClientes = Object.entries(porCliente).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topReceitas = Object.entries(porReceita).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const ultimasEntregas = entregasMes.sort((a, b) => (b.id > a.id ? 1 : -1)).slice(0, 6);
  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-amber-900">Dashboard</h2>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-amber-600" />
          <Dropdown value={mes} onChange={setMes} options={mesOpts} style={{ width: 180 }} />
        </div>
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
          {topClientes.length === 0 ? <p className="text-sm text-stone-400">Sem pagamentos neste mês.</p> : (
            <div className="space-y-2">
              {topClientes.map(([nome, v], idx) => (
                <div key={nome} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center">{idx + 1}</span>{nome}</span>
                  <b className="text-green-700">{BRL(v)}</b>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-4">
          <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2"><Cookie size={16} /> Receitas mais vendidas</h3>
          {topReceitas.length === 0 ? <p className="text-sm text-stone-400">Sem entregas neste mês.</p> : (
            <div className="space-y-2">
              {topReceitas.map(([nome, q], idx) => (
                <div key={nome} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center">{idx + 1}</span>{nome}</span>
                  <b className="text-amber-800">{q} un</b>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-4">
          <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2"><ChevronRight size={16} /> Últimas entregas</h3>
          {ultimasEntregas.length === 0 ? <p className="text-sm text-stone-400">Sem entregas neste mês.</p> : (
            <div className="space-y-2">
              {ultimasEntregas.map((e) => (
                <div key={e.id} className="text-sm">
                  <div className="flex items-center justify-between"><span className="text-stone-700">{e.cliente}</span><b className="text-stone-600">{e.qtd}×</b></div>
                  <div className="flex items-center justify-between text-xs text-stone-400"><span>{e.receita}</span><span>{new Date(e.data).toLocaleDateString("pt-BR")}</span></div>
                </div>
              ))}
            </div>
          )}
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