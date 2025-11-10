"use client";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

/** =============================
 *  Tipos e Constantes
 *  ============================= */

type Market = "Mundial" | "Guanabara" | "Assai";
type PriceTier = "low" | "mid" | "high";

type RawCategory =
  | "proteina"
  | "laticinio"
  | "carbo"
  | "graos"
  | "gordura"
  | "legumes_folhas"
  | "frutas"
  | "limpeza"
  | "cozinha"
  | "padaria"
  | "mercearia_misc";

type UIGroup =
  | "Laticínios"
  | "Mercearia"
  | "Limpeza"
  | "Itens de Cozinha"
  | "Padaria"
  | "Todos";

type Product = {
  id: string; // SKU
  name: string;
  brand: string;
  category: RawCategory; // categoria interna
  unit: string;
  quality: number; // 1..5
  prices: Record<Market, number>; // preço base por mercado
};

type Region = {
  country: string;
  state: string;
  city: string;
  code: string;
  multipliers: Record<Market, number>;
  deliveryAdj: number; // % extra logística
};

type BasketItem = { id: string; qty: number };

const LOGO_SIGLA = "PN"; // sua sigla
const MARKETS: Market[] = ["Mundial", "Guanabara", "Assai"];

const REGIONS: Region[] = [
  {
    country: "Brasil",
    state: "RJ",
    city: "Rio de Janeiro",
    code: "BR-RJ-Rio",
    multipliers: { Mundial: 0.995, Guanabara: 1.0, Assai: 0.995 },
    deliveryAdj: 0.02,
  },
  {
    country: "Brasil",
    state: "RJ",
    city: "Niterói",
    code: "BR-RJ-Niteroi",
    multipliers: { Mundial: 0.995, Guanabara: 1.01, Assai: 1.0 },
    deliveryAdj: 0.022,
  },
  {
    country: "Brasil",
    state: "SP",
    city: "São Paulo",
    code: "BR-SP-SP",
    multipliers: { Mundial: 0.995, Guanabara: 1.05, Assai: 1.0 },
    deliveryAdj: 0.015,
  },
];

/** =============================
 *  Helpers
 *  ============================= */

function currency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// viés comercial: Mundial sempre levemente mais barato na simulação
function marketBias(m: Market) {
  return m === "Mundial" ? 0.985 : 1; // -1.5%
}

function regionalPrice(base: number, market: Market, region: Region) {
  const biased = base * marketBias(market);
  return +(
    biased * (region.multipliers[market] ?? 1) * (1 + region.deliveryAdj)
  ).toFixed(2);
}

function minPriceAcrossMarkets(p: Product, region: Region) {
  const vals = MARKETS.map((m) => regionalPrice(p.prices[m], m, region));
  return Math.min(...vals);
}
/** Categoria interna -> nome legível no UI */
function toUiGroup(cat: RawCategory): UIGroup {
  if (cat === "laticinio") return "Laticínios";
  if (cat === "limpeza") return "Limpeza";
  if (cat === "cozinha") return "Itens de Cozinha";
  if (cat === "padaria") return "Padaria";
  if (["carbo", "graos", "gordura", "mercearia_misc", "frutas", "legumes_folhas"].includes(cat))
    return "Mercearia";
  return "Mercearia";
}

/** =============================
 *  Catálogo Curado + Gerador DEMO
 *  ============================= */

const CURATED: Product[] = [
  {
    id: "frango_1kg",
    name: "Frango Congelado 1kg",
    brand: "Seara",
    category: "proteina",
    unit: "1 kg",
    quality: 4,
    prices: { Mundial: 19.9, Guanabara: 18.5, Assai: 17.9 },
  },
  {
    id: "iogurte_5un",
    name: "Iogurte Natural 5 un.",
    brand: "Nestlé",
    category: "laticinio",
    unit: "bandeja 5",
    quality: 5,
    prices: { Mundial: 16.9, Guanabara: 15.9, Assai: 15.5 },
  },
  {
    id: "arroz_int_1kg",
    name: "Arroz Integral 1kg",
    brand: "Tio João",
    category: "carbo",
    unit: "1 kg",
    quality: 4,
    prices: { Mundial: 9.5, Guanabara: 8.9, Assai: 8.3 },
  },
  {
    id: "feijao_1kg",
    name: "Feijão Carioca 1kg",
    brand: "Kicaldo",
    category: "carbo",
    unit: "1 kg",
    quality: 3,
    prices: { Mundial: 8.2, Guanabara: 7.9, Assai: 7.7 },
  },
  {
    id: "ovos_duzia",
    name: "Ovos Brancos Dúzia",
    brand: "Granja Real",
    category: "proteina",
    unit: "12 un",
    quality: 3,
    prices: { Mundial: 14.5, Guanabara: 13.9, Assai: 13.5 },
  },
  {
    id: "azeite_500",
    name: "Azeite Extra Virgem 500 ml",
    brand: "Andorinha",
    category: "gordura",
    unit: "500 ml",
    quality: 4,
    prices: { Mundial: 31.9, Guanabara: 29.9, Assai: 30.5 },
  },
  {
    id: "detergente_500",
    name: "Detergente Neutro 500 ml",
    brand: "Ypê",
    category: "limpeza",
    unit: "500 ml",
    quality: 4,
    prices: { Mundial: 3.99, Guanabara: 3.79, Assai: 3.69 },
  },
  {
    id: "esponja_2un",
    name: "Esponja Multiuso 2 un.",
    brand: "Scotch-Brite",
    category: "cozinha",
    unit: "2 un",
    quality: 5,
    prices: { Mundial: 7.9, Guanabara: 7.5, Assai: 7.3 },
  },
  {
    id: "pao_integral",
    name: "Pão Integral 500 g",
    brand: "Wickbold",
    category: "padaria",
    unit: "500 g",
    quality: 4,
    prices: { Mundial: 11.9, Guanabara: 10.9, Assai: 10.7 },
  },
];

function prng(seed: number) {
  let x = seed || 123456789;
  return () => ((x ^= x << 13), (x ^= x >>> 17), (x ^= x << 5), (x >>> 0) / 0xffffffff);
}

const DEMO_BRANDS = [
  "Seara",
  "Perdigão",
  "Aurora",
  "Nestlé",
  "Danone",
  "Quaker",
  "Tio João",
  "Camil",
  "Kicaldo",
  "Tirolez",
  "Piracanjuba",
  "Itambé",
  "Ypê",
  "Scotch-Brite",
  "Bombril",
  "Sanremo",
  "Tramontina",
  "Wickbold",
  "Bauducco",
];

const NAME_SETS: Record<RawCategory, string[]> = {
  proteina: ["Frango", "Peito de Frango", "Coxa/Sobrecoxa", "Carne Moída", "Filé Tilápia", "Atum Lata", "Sardinha Lata", "Ovos"],
  laticinio: ["Iogurte", "Iogurte Natural", "Leite", "Queijo Minas", "Requeijão", "Manteiga", "Queijo Branco"],
  carbo: ["Arroz", "Arroz Integral", "Feijão", "Macarrão", "Tapioca"],
  graos: ["Aveia", "Granola", "Chia", "Quinoa", "Linhaça"],
  gordura: ["Azeite", "Óleo Girassol", "Óleo Soja", "Ghee"],
  legumes_folhas: ["Brócolis", "Couve-flor", "Alface", "Couve", "Abobrinha", "Cenoura"],
  frutas: ["Banana", "Maçã", "Laranja", "Mamão", "Uva", "Pera"],
  limpeza: ["Detergente", "Sabão em Pó", "Amaciante", "Água Sanitária", "Desinfetante", "Limpador Multiuso", "Esponja Aço"],
  cozinha: ["Esponja Multiuso", "Pano de Prato", "Luva de Borracha", "Rolo Filme PVC", "Saco Lixo 50L", "Esponja Antirriscos"],
  padaria: ["Pão Integral", "Pão Francês", "Pão de Forma", "Biscoito Cream Cracker", "Bolo Pullman", "Torrada"],
  mercearia_misc: ["Molho de Tomate", "Milho Lata", "Ervilha Lata", "Azeitona Vidro", "Atum Ralado", "Sardinha Molho"],
};

const RAW_CATS: RawCategory[] = [
  "proteina",
  "laticinio",
  "carbo",
  "graos",
  "gordura",
  "legumes_folhas",
  "frutas",
  "limpeza",
  "cozinha",
  "padaria",
  "mercearia_misc",
];

function makeSku(i: number) {
  return "SKU" + String(i).padStart(6, "0");
}
function pick<T>(rng: () => number, arr: T[]) {
  return arr[Math.floor(rng() * arr.length)];
}
function randRange(rng: () => number, min: number, max: number) {
  return min + (max - min) * rng();
}

function generateDemoCatalog(region: Region, total = 12000): Product[] {
  const seedBase = Array.from(region.code).reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = prng(seedBase + total);
  const res: Product[] = [];

  for (let i = 0; i < total; i++) {
    const cat = pick(rng, RAW_CATS);
    const baseName = pick(rng, NAME_SETS[cat]);
    const brand = pick(rng, DEMO_BRANDS);
    const unit =
      cat === "proteina" ? "1 kg" :
      cat === "laticinio" ? "500 g" :
      cat === "carbo" ? "1 kg" :
      cat === "graos" ? "500 g" :
      cat === "gordura" ? "500 ml" :
      cat === "limpeza" ? (rng() < 0.5 ? "500 ml" : "1 L") :
      cat === "cozinha" ? (rng() < 0.5 ? "2 un" : "1 rolo") :
      cat === "padaria" ? "500 g" :
      cat === "mercearia_misc" ? "340 g" :
      "1 un";

    const quality = Math.max(1, Math.min(5, Math.round(randRange(rng, 2.5, 4.8))));
    const base =
      cat === "proteina" ? randRange(rng, 12, 45) :
      cat === "laticinio" ? randRange(rng, 6, 30) :
      cat === "carbo" ? randRange(rng, 5, 18) :
      cat === "graos" ? randRange(rng, 6, 28) :
      cat === "gordura" ? randRange(rng, 12, 45) :
      cat === "legumes_folhas" ? randRange(rng, 3, 12) :
      cat === "frutas" ? randRange(rng, 4, 14) :
      cat === "limpeza" ? randRange(rng, 3, 35) :
      cat === "cozinha" ? randRange(rng, 4, 28) :
      cat === "padaria" ? randRange(rng, 6, 24) :
      randRange(rng, 5, 20);

    const brandAdj = 1 + (DEMO_BRANDS.indexOf(brand) % 5) * 0.015;
    const pM = +(base * brandAdj * (0.98 + rng() * 0.06)).toFixed(2);
    const pG = +(base * brandAdj * (0.99 + rng() * 0.07)).toFixed(2);
    const pA = +(base * brandAdj * (0.99 + rng() * 0.08)).toFixed(2);

    res.push({
      id: makeSku(i + 1),
      name: baseName + " " + unit,
      brand,
      category: cat,
      unit,
      quality,
      prices: { Mundial: pM, Guanabara: pG, Assai: pA },
    });
  }
  return res;
}

/** =============================
 *  Página
 *  ============================= */

export default function AppPage() {
  /** Localização */
  const [country, setCountry] = useState("Brasil");
  const [stateUF, setStateUF] = useState("RJ");
  const [city, setCity] = useState("Rio de Janeiro");

  const currentRegion = useMemo(
    () =>
      REGIONS.find((r) => r.country === country && r.state === stateUF && r.city === city) ??
      REGIONS[0],
    [country, stateUF, city]
  );

  /** Regras de preço/qualidade */
  const [tier, setTier] = useState<PriceTier>("low");
  const [minQuality, setMinQuality] = useState(3);

  /** Entrega e pagamento */
  const [delivery, setDelivery] = useState<"retirada" | "entrega">("retirada");
  const [payment, setPayment] = useState<"picpay" | "credito" | "debito" | "pix" | "alimentacao">("pix");
  const [showCheckout, setShowCheckout] = useState(false);

  /** Catálogo (curado + demo 12k) */
  const demoCatalog = useMemo(() => generateDemoCatalog(currentRegion, 12000), [currentRegion]);
  const CATALOG = useMemo(() => {
    const ids = new Set(CURATED.map((p) => p.id));
    return [...CURATED, ...demoCatalog.filter((p) => !ids.has(p.id))];
  }, [demoCatalog]);

  /** Vitrine (abas + busca) */
  const GROUPS: UIGroup[] = ["Todos", "Laticínios", "Mercearia", "Limpeza", "Itens de Cozinha", "Padaria"];
  const [uiGroup, setUiGroup] = useState<UIGroup>("Todos");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOG.filter((p) => {
      const inGroup = uiGroup === "Todos" ? true : toUiGroup(p.category) === uiGroup;
      const byQuality = p.quality >= minQuality;
      const bySearch = !q || (p.name + " " + p.brand).toLowerCase().includes(q);
      return inGroup && byQuality && bySearch;
    }).slice(0, 36);
  }, [CATALOG, uiGroup, query, minQuality]);

  /** Cesta do cliente */
  const [basket, setBasket] = useState<BasketItem[]>([]);
  function addToBasket(id: string) {
    setBasket((prev) => {
      const found = prev.find((i) => i.id === id);
      if (found) return prev.map((i) => (i.id === id ? { ...i, qty: Math.min(99, i.qty + 1) } : i));
      return [...prev, { id, qty: 1 }];
    });
  }
  function changeQty(id: string, delta: number) {
    setBasket((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)));
  }
  function removeItem(id: string) {
    setBasket((prev) => prev.filter((i) => i.id !== id));
  }

  /** Detalhe de preços por mercado para a cesta */
  const basketDetail = useMemo(() => {
    const items = basket
      .map((b) => {
        const p = CATALOG.find((x) => x.id === b.id);
        if (!p) return null;
        const prices: Record<Market, number> = {
          Mundial: regionalPrice(p.prices.Mundial, "Mundial", currentRegion),
          Guanabara: regionalPrice(p.prices.Guanabara, "Guanabara", currentRegion),
          Assai: regionalPrice(p.prices.Assai, "Assai", currentRegion),
        };
        return { product: p, qty: b.qty, prices };
      })
      .filter(Boolean) as { product: Product; qty: number; prices: Record<Market, number> }[];

    const totals = { Mundial: 0, Guanabara: 0, Assai: 0 } as Record<Market, number>;
    items.forEach((it) => {
      (MARKETS as Market[]).forEach((m) => (totals[m] += it.prices[m] * it.qty));
    });
    (MARKETS as Market[]).forEach((m) => (totals[m] = +totals[m].toFixed(2)));

    const withDelivery = (m: Market, v: number) => (delivery === "entrega" ? +(v * 1.05).toFixed(2) : v);
    const totalsWithDelivery: Record<Market, number> = {
      Mundial: withDelivery("Mundial", totals.Mundial),
      Guanabara: withDelivery("Guanabara", totals.Guanabara),
      Assai: withDelivery("Assai", totals.Assai),
    };

    const winner = (Object.keys(totalsWithDelivery) as Market[]).reduce(
      (best, m) => (totalsWithDelivery[m] < totalsWithDelivery[best] ? m : best),
      "Mundial" as Market
    );

    return { items, totals: totalsWithDelivery, winner };
  }, [basket, CATALOG, currentRegion, delivery]);

  /** Ação “Enter” → calcular e rolar */
  const [showResult, setShowResult] = useState(false);
  function runCheapest() {
    if (!basket.length) return;
    setShowResult(true);
    setTimeout(() => {
      const el = document.getElementById("resultado");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 0);
  }
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter") runCheapest();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [basket]);

  /** Mapas */
  function mapsUrl(market: Market) {
    const qCity = encodeURIComponent(market + " perto de " + city + " " + stateUF);
    return "https://www.google.com/maps/search/?q=" + qCity;
  }

  /** Checkout simulado */
  function doCheckout() {
    const order = {
      createdAt: new Date().toISOString(),
      region: currentRegion,
      deliveryMode: delivery,
      deliveryFeePct: delivery === "entrega" ? 0.05 : 0,
      payment,
      winner: basketDetail.winner,
      totals: basketDetail.totals,
      items: basketDetail.items.map((i) => ({ sku: i.product.id, name: i.product.name, qty: i.qty })),
    };
    const blob = new Blob([JSON.stringify(order, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pedido-" + Date.now() + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowCheckout(true);
  }

  /** =============================
   *  UI
   *  ============================= */
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-800">
      {/* Header com sigla */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/80 border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white grid place-items-center font-bold">
              {LOGO_SIGLA}
            </div>
            <h1 className="font-bold text-xl">Cestas Fit</h1>
            <span className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 ml-2">Multimercado</span>
          </div>
          <div className="ml-auto text-sm text-slate-600">
            {currentRegion.city}/{currentRegion.state} • logística {(currentRegion.deliveryAdj * 100).toFixed(1)}%
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
              Monte sua cesta por <span className="text-emerald-700">categoria</span> e encontre o
              <span className="text-emerald-700"> mercado mais barato</span>
            </h2>
            <p className="mt-3 text-slate-600">
              Escolha seus itens livremente — o sistema compara <b>Mundial</b>, <b>Guanabara</b> e <b>Assaí</b> na sua
              região e indica onde comprar mais barato. Pressione <b>Enter</b> quando terminar.
            </p>
          </div>

          <div className="bg-white border rounded-2xl p-4">
            <h3 className="font-semibold mb-2">Localização e Preferências</h3>
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm">País</label>
                <select className="mt-1 w-full border rounded-md h-10 px-3" value={country} onChange={(e) => setCountry(e.target.value)}>
                  {Array.from(new Set(REGIONS.map((r) => r.country))).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm">Estado</label>
                <select className="mt-1 w-full border rounded-md h-10 px-3" value={stateUF} onChange={(e) => setStateUF(e.target.value)}>
                  {Array.from(new Set(REGIONS.filter((r) => r.country === country).map((r) => r.state))).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm">Cidade</label>
                <select className="mt-1 w-full border rounded-md h-10 px-3" value={city} onChange={(e) => setCity(e.target.value)}>
                  {REGIONS.filter((r) => r.country === country && r.state === stateUF).map((r) => (
                    <option key={r.code} value={r.city}>{r.city}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-sm">Faixa de Preço</label>
                <select className="mt-1 w-full border rounded-md h-10 px-3" value={tier} onChange={(e) => setTier(e.target.value as PriceTier)}>
                  <option value="low">Low Price</option>
                  <option value="mid">Médio</option>
                  <option value="high">Premium (cesta automática)</option>
                </select>
              </div>
              <div>
                <label className="text-sm">Qualidade mínima</label>
                <select className="mt-1 w-full border rounded-md h-10 px-3" value={String(minQuality)} onChange={(e) => setMinQuality(Number(e.target.value))}>
                  {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}/5</option>)}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-sm">Entrega</label>
                <select className="mt-1 w-full border rounded-md h-10 px-3" value={delivery} onChange={(e) => setDelivery(e.target.value as any)}>
                  <option value="retirada">Retirar na loja (separação pelo mercado)</option>
                  <option value="entrega">Entrega em casa (+5%)</option>
                </select>
              </div>
              <div>
                <label className="text-sm">Pagamento</label>
                <select className="mt-1 w-full border rounded-md h-10 px-3" value={payment} onChange={(e) => setPayment(e.target.value as any)}>
                  <option value="picpay">PicPay</option>
                  <option value="credito">Cartão de Crédito</option>
                  <option value="debito">Cartão de Débito</option>
                  <option value="pix">PIX</option>
                  <option value="alimentacao">Cartão Alimentação</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BUSCA e ABAS de categorias de vitrine */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="bg-white border rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {GROUPS.map((g) => {
              const baseBtn = "px-3 h-9 rounded border ";
              const active = "bg-slate-900 text-white";
              const inactive = "bg-white";
              const cls = baseBtn + (uiGroup === g ? active : inactive);
              return (
                <button key={g} onClick={() => setUiGroup(g)} className={cls}>
                  {g}
                </button>
              );
            })}
            <input
              placeholder="Buscar por nome ou marca…"
              className="ml-auto border rounded-md h-10 px-3 w-64"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Cards de produtos (até 36) */}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((p) => (
              <div key={p.id} className="border rounded-xl p-3 bg-white">
                <div className="font-medium leading-tight">{p.name}</div>
                <div className="text-xs text-slate-500">
                  {p.brand} • {p.unit} • {toUiGroup(p.category)} • Qual {p.quality}/5
                </div>
                <div className="mt-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">a partir de</span>
                    <span className="font-semibold">{currency(minPriceAcrossMarkets(p, currentRegion))}</span>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => addToBasket(p.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-3 h-9"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CESTA personalizada + cálculo por mercado */}
      <section id="cesta" className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cesta */}
          <div className="lg:col-span-2 bg-white border rounded-2xl p-4">
            <h3 className="font-semibold mb-3">Sua cesta (escolha livre)</h3>
            {basketDetail.items.length === 0 ? (
              <p className="text-sm text-slate-500">Adicione produtos para ver os totais por mercado.</p>
            ) : (
              <div className="space-y-3">
                {basketDetail.items.map(({ product, qty, prices }) => (
                  <div key={product.id} className="border rounded-xl p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium leading-tight">{product.name}</div>
                        <div className="text-xs text-slate-500">
                          {product.brand} • {product.unit} • {toUiGroup(product.category)}
                        </div>
                      </div>

                      <button className="text-red-600" onClick={() => removeItem(product.id)}>
                        remover
                      </button>
                    </div>

                    {/* Controles de quantidade */}
                    <div className="mt-3 flex items-center gap-2">
                      <button className="border rounded px-3 h-8" onClick={() => changeQty(product.id, -1)}>
                        -
                      </button>
                      <span className="text-sm">{qty}</span>
                      <button className="border rounded px-3 h-8" onClick={() => changeQty(product.id, 1)}>
                        +
                      </button>
                    </div>

                    {/* Preços por mercado */}
                    <div className="mt-3 grid sm:grid-cols-3 gap-2 text-sm">
                      {(MARKETS as Market[]).map((m) => (
                        <div key={m} className="rounded border p-2">
                          <div className="text-slate-500">{m}</div>
                          <div className="font-semibold">{currency(prices[m])}</div>
                          <div className="text-xs">Subtotal: {currency(prices[m] * qty)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-4 h-10 disabled:opacity-50"
                    onClick={runCheapest}
                    disabled={!basket.length}
                  >
                    Encontrar mercado mais barato (Enter)
                  </button>
                  {basket.length > 0 && (
                    <span className="text-xs text-slate-500">
                      Dica: pressione <b>Enter</b> para calcular rapidamente.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Totais por mercado + mapas */}
          <div className="bg-white border rounded-2xl p-4">
            <h3 className="font-semibold mb-3">Totais por mercado</h3>
            <div className="grid gap-3">
              {(MARKETS as Market[]).map((m) => (
                <div
                  key={m}
                  className={
                    "rounded-xl border p-3 " +
                    (basketDetail.winner === m && basket.length ? "border-emerald-500" : "")
                  }
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-slate-500">{m}</div>
                      <div className="text-2xl font-bold">{currency(basketDetail.totals[m] || 0)}</div>
                      {basketDetail.winner === m && basket.length ? (
                        <div className="text-xs text-emerald-700 mt-1">▼ Mais barato</div>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-2">
                      <a
                        className="border rounded px-3 h-9 grid place-items-center"
                        href={mapsUrl(m)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ver no mapa
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Resultado final / checkout */}
      {showResult && basket.length > 0 && (
        <section id="resultado" className="max-w-6xl mx-auto px-4 pb-10">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <p className="text-sm">
              <b>Resultado:</b> Para a sua cesta, o mercado mais barato é <b>{basketDetail.winner}</b> com total de
              <b> {currency(basketDetail.totals[basketDetail.winner])}</b>{" "}
              {delivery === "entrega" ? "(inclui 5% de entrega)" : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="bg-slate-900 hover:bg-slate-800 text-white rounded px-4 h-10" onClick={doCheckout}>
                Pagar agora (simulado)
              </button>
              <a
                className="border rounded px-4 h-10 grid place-items-center"
                href={mapsUrl(basketDetail.winner)}
                target="_blank"
                rel="noreferrer"
              >
                Abrir {basketDetail.winner} no mapa
              </a>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              * Integrações reais: PicPay (Checkout API), Cartões (Stripe/Mercado Pago), PIX (Copia e Cola), Cartão
              Alimentação (Alelo/VR). Este botão gera um JSON do pedido para demonstração.
            </p>
          </div>
        </section>
      )}

      {/* Modal de confirmação simples */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center">
          <div className="bg-white rounded-2xl p-6 w-[95%] max-w-xl border">
            <h4 className="font-semibold text-lg">Pagamento iniciado</h4>
            <p className="text-sm text-slate-600 mt-1">
              Método: <b>{payment.toUpperCase()}</b>. Você pode plugar o gateway real aqui. Um arquivo <i>pedido.json</i>{" "}
              foi baixado com os dados.
            </p>
            <div className="mt-4 flex justify-end">
              <button className="border rounded px-4 h-10" onClick={() => setShowCheckout(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-slate-600">
          <p className="font-medium">Cestas Fit • {LOGO_SIGLA}</p>
          <p>
            Pagamentos: PicPay, Cartões, PIX, Cartão Alimentação (demo). Entrega opcional com taxa de 5%. Links de
            mapas leves para não travar o app.
          </p>
        </div>
      </footer>
    </div>
  );
}
