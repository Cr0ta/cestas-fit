"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ShoppingCart,
  MapPin,
  Sparkles,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";

/** ========= BRANDING ========= */

const LOGO_SIGLA = "CF"; // Cestas Fit

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
  | "Todos"
  | "Laticínios"
  | "Mercearia"
  | "Limpeza"
  | "Itens de Cozinha"
  | "Padaria";

/** ========= TIPOS ========= */

type Product = {
  id: string; // SKU ou id
  name: string;
  brand: string;
  category: RawCategory;
  unit: string;
  quality: number; // 1..5
  prices: Record<Market, number>;
};

type Region = {
  country: string;
  state: string;
  city: string;
  code: string;
  multipliers: Record<Market, number>;
  deliveryAdj: number;
};

type BasketItem = { id: string; qty: number };

type ProductRow = {
  id: number;
  sku: string;
  name: string;
  brand: string;
  unit: string;
  category: string;
  quality: number | null;
};

type LatestPriceRow = {
  product_id: number;
  market_id: number;
  price: number;
};

type MarketRow = { id: number; name: string };

/** ========= CONFIG BÁSICA ========= */

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

/** ========= HELPERS ========= */

function currency(v: number) {
  if (!isFinite(v)) return "R$ 0,00";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function marketBias(m: Market) {
  // leve preferência para o parceiro principal
  return m === "Mundial" ? 0.985 : 1;
}

function regionalPrice(base: number, market: Market, region: Region) {
  const biased = base * marketBias(market);
  return +(
    biased * (region.multipliers[market] ?? 1) * (1 + region.deliveryAdj)
  ).toFixed(2);
}

function toUiGroup(cat: RawCategory): UIGroup {
  if (cat === "laticinio") return "Laticínios";
  if (cat === "limpeza") return "Limpeza";
  if (cat === "cozinha") return "Itens de Cozinha";
  if (cat === "padaria") return "Padaria";
  return "Mercearia";
}

function minPriceAcrossMarkets(p: Product, region: Region) {
  const vals = MARKETS.map((m) => regionalPrice(p.prices[m], m, region));
  return Math.min(...vals);
}

/** ========= CATÁLOGO DEMO (fallback local) ========= */

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

// gerador simples para simular milhares de SKUs
function prng(seed: number) {
  let x = seed || 123456789;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 0xffffffff;
  };
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
  "Wickbold",
  "Bauducco",
];

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

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function randRange(rng: () => number, min: number, max: number) {
  return min + (max - min) * rng();
}

function generateDemoCatalog(region: Region, total = 12000): Product[] {
  const seedBase = Array.from(region.code).reduce(
    (a, c) => a + c.charCodeAt(0),
    0
  );
  const rng = prng(seedBase + total);
  const res: Product[] = [];

  for (let i = 0; i < total; i++) {
    const cat = pick(rng, RAW_CATS);
    const baseName = pick(
      rng,
      [
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
      ].includes(cat)
        ? [
            "Frango",
            "Peito",
            "Leite",
            "Queijo",
            "Arroz",
            "Feijão",
            "Aveia",
            "Azeite",
            "Detergente",
            "Esponja",
            "Pão",
            "Biscoito",
            "Molho",
            "Atum",
          ]
        : ["Item"],
    );
    const brand = pick(rng, DEMO_BRANDS);
    const unit =
      cat === "proteina"
        ? "1 kg"
        : cat === "laticinio"
        ? "500 g"
        : cat === "carbo"
        ? "1 kg"
        : cat === "graos"
        ? "500 g"
        : cat === "gordura"
        ? "500 ml"
        : cat === "limpeza"
        ? rng() < 0.5
          ? "500 ml"
          : "1 L"
        : cat === "cozinha"
        ? rng() < 0.5
          ? "2 un"
          : "1 un"
        : cat === "padaria"
        ? "500 g"
        : cat === "mercearia_misc"
        ? "340 g"
        : "1 un";

    const quality = Math.max(
      1,
      Math.min(5, Math.round(randRange(rng, 2.5, 4.8)))
    );
    const base =
      cat === "proteina"
        ? randRange(rng, 12, 45)
        : cat === "laticinio"
        ? randRange(rng, 6, 30)
        : cat === "carbo"
        ? randRange(rng, 5, 18)
        : cat === "graos"
        ? randRange(rng, 6, 28)
        : cat === "gordura"
        ? randRange(rng, 12, 45)
        : cat === "legumes_folhas"
        ? randRange(rng, 3, 12)
        : cat === "frutas"
        ? randRange(rng, 4, 14)
        : cat === "limpeza"
        ? randRange(rng, 3, 35)
        : cat === "cozinha"
        ? randRange(rng, 4, 28)
        : cat === "padaria"
        ? randRange(rng, 6, 24)
        : randRange(rng, 5, 20);

    const brandAdj = 1 + ((DEMO_BRANDS.indexOf(brand) % 5) * 0.015);
    const pM = +(base * brandAdj * (0.98 + rng() * 0.06)).toFixed(2);
    const pG = +(base * brandAdj * (0.99 + rng() * 0.07)).toFixed(2);
    const pA = +(base * brandAdj * (0.99 + rng() * 0.08)).toFixed(2);

    res.push({
      id: makeSku(i + 1),
      name: `${baseName} ${unit}`,
      brand,
      category: cat,
      unit,
      quality,
      prices: { Mundial: pM, Guanabara: pG, Assai: pA },
    });
  }
  return res;
}

/** ========= PÁGINA ========= */

export default function AppPage() {
  /** Localização */
  const [country, setCountry] = useState("Brasil");
  const [stateUF, setStateUF] = useState("RJ");
  const [city, setCity] = useState("Rio de Janeiro");

  const currentRegion = useMemo(
    () =>
      REGIONS.find(
        (r) => r.country === country && r.state === stateUF && r.city === city
      ) ?? REGIONS[0],
    [country, stateUF, city]
  );

  /** Controles principais */
  const [tier, setTier] = useState<PriceTier>("low");
  const [minQuality, setMinQuality] = useState(3);
  const [delivery, setDelivery] = useState<"retirada" | "entrega">("retirada");
  const [payment, setPayment] = useState<
    "picpay" | "credito" | "debito" | "pix" | "alimentacao"
  >("pix");
  const [showCheckout, setShowCheckout] = useState(false);

  /** Dados vindos do Supabase (se disponíveis) */
  const [marketsIndex, setMarketsIndex] = useState<Record<number, string>>({});
  const [dbProducts, setDbProducts] = useState<ProductRow[]>([]);
  const [dbPrices, setDbPrices] = useState<
    Record<number, Record<string, number>>
  >({});
  const [supabaseOk, setSupabaseOk] = useState(false);

  // tenta carregar dados reais – se falhar, seguimos com demo
  useEffect(() => {
    (async () => {
      try {
        const { data: mkts, error: mErr } = await supabase
          .from("markets")
          .select("id,name");
        if (mErr || !mkts) {
          console.log("Supabase markets error", mErr);
          return;
        }
        const idx: Record<number, string> = {};
        (mkts as MarketRow[]).forEach((m) => (idx[m.id] = m.name));
        setMarketsIndex(idx);

        const { data: prods, error: pErr } = await supabase
          .from("products")
          .select(
            "id, sku, name, brand, unit, category, quality"
          )
          .limit(5000);
        if (pErr || !prods) {
          console.log("Supabase products error", pErr);
          return;
        }
        setDbProducts(prods as ProductRow[]);

        const { data: latest, error: lErr } = await supabase
          .from("latest_prices")
          .select("product_id, market_id, price")
          .limit(50000);
        if (lErr || !latest) {
          console.log("Supabase latest_prices error", lErr);
          return;
        }

        const priceMap: Record<number, Record<string, number>> = {};
        (latest as LatestPriceRow[]).forEach((row) => {
          const marketName = idx[row.market_id];
          if (!marketName) return;
          if (!priceMap[row.product_id]) priceMap[row.product_id] = {};
          priceMap[row.product_id][marketName] = row.price;
        });
        setDbPrices(priceMap);
        setSupabaseOk(true);
      } catch (e) {
        console.log("Supabase init error", e);
      }
    })();
  }, []);

  /** Monta catálogo final (prioriza Supabase) */
  const CATALOG: Product[] = useMemo(() => {
    if (supabaseOk && dbProducts.length) {
      const result: Product[] = [];
      for (const row of dbProducts) {
        const pricesRaw = dbPrices[row.id] || {};
        const prices: Record<Market, number> = {
          Mundial: pricesRaw["Mundial"] ?? 9999,
          Guanabara: pricesRaw["Guanabara"] ?? 9999,
          Assai: pricesRaw["Assai"] ?? 9999,
        };
        result.push({
          id: row.sku || String(row.id),
          name: row.name,
          brand: row.brand,
          unit: row.unit,
          category: (row.category || "mercearia_misc") as RawCategory,
          quality: row.quality || 3,
          prices,
        });
      }
      if (result.length) return result;
    }

    // fallback demo: curados + gerados
    const demo = generateDemoCatalog(currentRegion, 6000);
    const ids = new Set(CURATED.map((p) => p.id));
    return [...CURATED, ...demo.filter((p) => !ids.has(p.id))];
  }, [supabaseOk, dbProducts, dbPrices, currentRegion]);

  /** Filtros UI */
  const GROUPS: UIGroup[] = [
    "Todos",
    "Laticínios",
    "Mercearia",
    "Limpeza",
    "Itens de Cozinha",
    "Padaria",
  ];
  const [uiGroup, setUiGroup] = useState<UIGroup>("Todos");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOG.filter((p) => {
      const group =
        uiGroup === "Todos" ? true : toUiGroup(p.category) === uiGroup;
      const byQuality = p.quality >= minQuality;
      const bySearch =
        !q ||
        (p.name + " " + p.brand)
          .toLowerCase()
          .normalize("NFD")
          .includes(q);
      return group && byQuality && bySearch;
    }).slice(0, 40);
  }, [CATALOG, uiGroup, query, minQuality]);

  /** Cesta */
  const [basket, setBasket] = useState<BasketItem[]>([]);

  function addToBasket(id: string) {
    setBasket((prev) => {
      const found = prev.find((i) => i.id === id);
      if (found) {
        return prev.map((i) =>
          i.id === id ? { ...i, qty: Math.min(99, i.qty + 1) } : i
        );
      }
      return [...prev, { id, qty: 1 }];
    });
  }

  function changeQty(id: string, delta: number) {
    setBasket((prev) =>
      prev
        .map((i) =>
          i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i
        )
        .filter((i) => i.qty > 0)
    );
  }

  function removeItem(id: string) {
    setBasket((prev) => prev.filter((i) => i.id !== id));
  }

  /** Tier premium → monta cesta automática */
  useEffect(() => {
    if (tier !== "high") return;
    const auto = CATALOG.filter((p) => p.quality >= 4)
      .sort(
        (a, b) =>
          minPriceAcrossMarkets(a, currentRegion) -
          minPriceAcrossMarkets(b, currentRegion)
      )
      .slice(0, 12)
      .map((p) => ({ id: p.id, qty: 1 }));
    setBasket(auto);
    const el = document.getElementById("cesta");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, [tier, CATALOG, currentRegion]);

  /** Detalhes da cesta / comparação */
  const basketDetail = useMemo(() => {
    const items = basket
      .map((b) => {
        const p = CATALOG.find((x) => x.id === b.id);
        if (!p) return null;
        const prices: Record<Market, number> = {
          Mundial: regionalPrice(p.prices.Mundial, "Mundial", currentRegion),
          Guanabara: regionalPrice(
            p.prices.Guanabara,
            "Guanabara",
            currentRegion
          ),
          Assai: regionalPrice(p.prices.Assai, "Assai", currentRegion),
        };
        return { product: p, qty: b.qty, prices };
      })
      .filter(Boolean) as {
      product: Product;
      qty: number;
      prices: Record<Market, number>;
    }[];

    const totals: Record<Market, number> = {
      Mundial: 0,
      Guanabara: 0,
      Assai: 0,
    };
    items.forEach((it) => {
      MARKETS.forEach((m) => {
        totals[m] += it.prices[m] * it.qty;
      });
    });

    MARKETS.forEach((m) => {
      totals[m] = +totals[m].toFixed(2);
    });

    const applyDelivery = (v: number) =>
      delivery === "entrega" ? +(v * 1.05).toFixed(2) : v;

    const totalsWithDelivery: Record<Market, number> = {
      Mundial: applyDelivery(totals.Mundial),
      Guanabara: applyDelivery(totals.Guanabara),
      Assai: applyDelivery(totals.Assai),
    };

    const winner = MARKETS.reduce((best, m) =>
      totalsWithDelivery[m] < totalsWithDelivery[best] ? m : best
    );

    return { items, totals: totalsWithDelivery, winner };
  }, [basket, CATALOG, currentRegion, delivery]);

  /** Enter → calcular */
  const [showResult, setShowResult] = useState(false);
  function runCheapest() {
    if (!basket.length) return;
    setShowResult(true);
    const el = document.getElementById("resultado");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") runCheapest();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basket]);

  /** Mapas */
  function mapsUrl(market: Market) {
    const qCity = encodeURIComponent(`${market} perto de ${city} ${stateUF}`);
    return `https://www.google.com/maps/search/?q=${qCity}`;
  }

  /** Checkout (simulado) */
  function doCheckout() {
    if (!basket.length) return;
    const order = {
      createdAt: new Date().toISOString(),
      region: currentRegion.code,
      deliveryMode: delivery,
      payment,
      marketWinner: basketDetail.winner,
      totals: basketDetail.totals,
      items: basketDetail.items.map((i) => ({
        sku: i.product.id,
        name: i.product.name,
        qty: i.qty,
      })),
    };
    const blob = new Blob([JSON.stringify(order, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedido-${Date.now()}.json`;
    a.click();
    setShowCheckout(true);
  }

  /** ========= UI ========= */

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* topo */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-emerald-500/90 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25">
              {LOGO_SIGLA}
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight">
                  Cestas Fit
                </span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  Multimercado inteligente
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                Matching de cesta ideal x menor preço real
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3 text-[10px] text-slate-400">
            <MapPin className="h-3 w-3" />
            <span>
              {currentRegion.city}/{currentRegion.state}
            </span>
            <span className="mx-1">•</span>
            <TrendingDown className="h-3 w-3" />
            <span>
              logística {((currentRegion.deliveryAdj || 0) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </header>

      {/* HERO */}
      <main>
        <section className="border-b border-slate-800 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900/40">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:flex-row md:items-center">
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1 text-[10px] text-slate-300 ring-1 ring-emerald-500/20">
                <Sparkles className="h-3 w-3 text-emerald-400" />
                Motor de comparação estilo “Trivago das Cestas”.
              </div>
              <h1 className="text-3xl font-semibold leading-tight text-slate-50 md:text-4xl">
                Encontre, em segundos,{" "}
                <span className="text-emerald-400">
                  onde montar a cesta ideal
                </span>{" "}
                com o menor custo em cada cidade.
              </h1>
              <p className="max-w-xl text-sm text-slate-300">
                O algoritmo lê milhares de SKUs reais, compara{" "}
                <b>Mundial</b>, <b>Guanabara</b>, <b>Assaí</b> e parceiros,
                monta a cesta por categoria (low, médio, premium) e aponta o
                mercado vencedor com transparência.
              </p>
              <div className="flex flex-wrap gap-3 text-[10px] text-slate-300">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  Dados diários via planilha oficial
                </div>
                <div className="flex items-center gap-1">
                  <ShoppingCart className="h-3 w-3 text-emerald-400" />
                  +10.000 SKUs elegíveis
                </div>
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-emerald-400" />
                  Cesta com melhor preço garantido na simulação
                </div>
              </div>
            </div>

            {/* Painel rápido de config */}
            <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl shadow-emerald-500/5">
              <p className="mb-2 text-xs font-medium text-slate-200">
                Configurar contexto da simulação
              </p>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div>
                  <label className="text-slate-400">País</label>
                  <select
                    className="mt-1 w-full rounded-md bg-slate-950/80 px-2 py-1.5 text-[10px] outline-none ring-1 ring-slate-800"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  >
                    {Array.from(
                      new Set(REGIONS.map((r) => r.country))
                    ).map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400">Estado</label>
                  <select
                    className="mt-1 w-full rounded-md bg-slate-950/80 px-2 py-1.5 text-[10px] outline-none ring-1 ring-slate-800"
                    value={stateUF}
                    onChange={(e) => setStateUF(e.target.value)}
                  >
                    {Array.from(
                      new Set(
                        REGIONS.filter(
                          (r) => r.country === country
                        ).map((r) => r.state)
                      )
                    ).map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400">Cidade</label>
                  <select
                    className="mt-1 w-full rounded-md bg-slate-950/80 px-2 py-1.5 text-[10px] outline-none ring-1 ring-slate-800"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  >
                    {REGIONS.filter(
                      (r) =>
                        r.country === country &&
                        r.state === stateUF
                    ).map((r) => (
                      <option key={r.code}>{r.city}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <label className="text-slate-400">Perfil de preço</label>
                  <select
                    className="mt-1 w-full rounded-md bg-slate-950/80 px-2 py-1.5 text-[10px] ring-1 ring-slate-800"
                    value={tier}
                    onChange={(e) =>
                      setTier(e.target.value as PriceTier)
                    }
                  >
                    <option value="low">Low price</option>
                    <option value="mid">Equilíbrio</option>
                    <option value="high">
                      Premium (cesta sugerida)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400">Qualidade mínima</label>
                  <select
                    className="mt-1 w-full rounded-md bg-slate-950/80 px-2 py-1.5 text-[10px] ring-1 ring-slate-800"
                    value={String(minQuality)}
                    onChange={(e) =>
                      setMinQuality(Number(e.target.value))
                    }
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <label className="text-slate-400">Entrega</label>
                  <select
                    className="mt-1 w-full rounded-md bg-slate-950/80 px-2 py-1.5 text-[10px] ring-1 ring-slate-800"
                    value={delivery}
                    onChange={(e) =>
                      setDelivery(e.target.value as "retirada" | "entrega")
                    }
                  >
                    <option value="retirada">
                      Retirar na loja
                    </option>
                    <option value="entrega">
                      Entrega em casa (+5%)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400">Pagamento</label>
                  <select
                    className="mt-1 w-full rounded-md bg-slate-950/80 px-2 py-1.5 text-[10px] ring-1 ring-slate-800"
                    value={payment}
                    onChange={(e) =>
                      setPayment(
                        e.target.value as
                          | "picpay"
                          | "credito"
                          | "debito"
                          | "pix"
                          | "alimentacao"
                      )
                    }
                  >
                    <option value="pix">PIX</option>
                    <option value="credito">
                      Cartão Crédito
                    </option>
                    <option value="debito">
                      Cartão Débito
                    </option>
                    <option value="picpay">PicPay</option>
                    <option value="alimentacao">
                      Cartão Alimentação
                    </option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    const el =
                      document.getElementById("cesta");
                    if (el)
                      el.scrollIntoView({
                        behavior: "smooth",
                      });
                  }}
                  className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-3 py-1.5 text-[10px] font-semibold text-slate-950 shadow-lg shadow-emerald-500/20"
                >
                  <ShoppingCart className="h-3 w-3" />
                  Montar cesta agora
                </button>
                <span className="text-[9px] text-slate-500">
                  Pressione <b>Enter</b> para achar o mercado
                  mais barato.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* VITRINE */}
        <section className="mx-auto max-w-6xl px-4 py-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {GROUPS.map((g) => {
              const active = uiGroup === g;
              return (
                <button
                  key={g}
                  onClick={() => setUiGroup(g)}
                  className={`rounded-full px-3 py-1 text-[10px] ring-1 ${
                    active
                      ? "bg-emerald-500 text-slate-950 ring-emerald-500"
                      : "bg-slate-950 text-slate-300 ring-slate-700 hover:bg-slate-900"
                  }`}
                >
                  {g}
                </button>
              );
            })}
            <input
              placeholder="Buscar por item ou marca..."
              className="ml-auto h-8 w-48 rounded-full bg-slate-950 px-3 text-[10px] text-slate-200 outline-none ring-1 ring-slate-700"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/80 p-3 shadow-sm shadow-slate-900/60 transition hover:-translate-y-1 hover:border-emerald-500/70 hover:shadow-emerald-500/20"
              >
                <div>
                  <div className="text-[11px] font-medium text-slate-50">
                    {p.name}
                  </div>
                  <div className="mt-0.5 text-[9px] text-slate-400">
                    {p.brand} • {p.unit} • {toUiGroup(p.category)} •
                    Qual {p.quality}/5
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-[9px] text-slate-500">
                      a partir de
                    </span>
                    <span className="text-[12px] font-semibold text-emerald-400">
                      {currency(
                        minPriceAcrossMarkets(
                          p,
                          currentRegion
                        )
                      )}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => addToBasket(p.id)}
                  className="mt-3 inline-flex items-center justify-center gap-1 rounded-2xl bg-emerald-500/90 px-3 py-1.5 text-[10px] font-semibold text-slate-950 shadow-md shadow-emerald-500/30 hover:bg-emerald-400"
                >
                  <ShoppingCart className="h-3 w-3" />
                  Adicionar à cesta
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-[10px] text-slate-400">
                Nenhum item com esses filtros. Ajuste a busca ou a
                categoria.
              </div>
            )}
          </div>
        </section>

        {/* CESTA + COMPARAÇÃO */}
        <section
          id="cesta"
          className="mx-auto max-w-6xl gap-6 px-4 pb-10 pt-4 md:grid md:grid-cols-3"
        >
          {/* Cesta */}
          <div className="md:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-50">
                Sua cesta inteligente
              </h2>
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[9px] text-slate-400">
                {basket.length} itens selecionados
              </span>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-3">
              {basketDetail.items.length === 0 ? (
                <p className="text-[10px] text-slate-400">
                  Adicione produtos da vitrine para comparar mercados
                  em tempo real.
                </p>
              ) : (
                <div className="space-y-2">
                  {basketDetail.items.map(
                    ({ product, qty, prices }) => (
                      <div
                        key={product.id}
                        className="flex items-start justify-between gap-3 rounded-2xl bg-slate-900/80 p-2"
                      >
                        <div>
                          <div className="text-[10px] font-medium text-slate-50">
                            {product.name}
                          </div>
                          <div className="text-[8px] text-slate-400">
                            {product.brand} • {product.unit} •{" "}
                            {toUiGroup(product.category)}
                          </div>
                          <div className="mt-1 text-[8px] text-slate-400">
                            {MARKETS.map((m) => (
                              <span
                                key={m}
                                className="mr-2 inline-flex"
                              >
                                {m}:{" "}
                                <b className="ml-0.5 text-emerald-400">
                                  {currency(prices[m])}
                                </b>
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1">
                            <button
                              className="h-5 w-5 rounded-full border border-slate-700 text-[9px]"
                              onClick={() =>
                                changeQty(product.id, -1)
                              }
                            >
                              -
                            </button>
                            <div className="w-6 text-center text-[9px]">
                              {qty}
                            </div>
                            <button
                              className="h-5 w-5 rounded-full border border-slate-700 text-[9px]"
                              onClick={() =>
                                changeQty(product.id, +1)
                              }
                            >
                              +
                            </button>
                          </div>
                          <button
                            className="text-[8px] text-red-400"
                            onClick={() =>
                              removeItem(product.id)
                            }
                          >
                            remover
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={runCheapest}
                  disabled={!basket.length}
                  className="inline-flex items-center gap-1 rounded-2xl bg-emerald-500 px-3 py-1.5 text-[10px] font-semibold text-slate-950 shadow-md shadow-emerald-500/30 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:shadow-none"
                >
                  <TrendingDown className="h-3 w-3" />
                  Encontrar mercado mais barato (Enter)
                </button>
                {basket.length > 0 && (
                  <span className="text-[8px] text-slate-500">
                    Calculamos automaticamente considerando
                    logística e taxa de entrega.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Totais por mercado */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-50">
              Comparação por mercado
            </h3>
            <div className="space-y-2">
              {MARKETS.map((m) => (
                <div
                  key={m}
                  className={`flex items-center justify-between rounded-3xl border p-3 text-[10px] ${
                    basketDetail.winner === m &&
                    basket.length
                      ? "border-emerald-500/80 bg-emerald-500/5 shadow-lg shadow-emerald-500/15"
                      : "border-slate-800 bg-slate-950/80"
                  }`}
                >
                  <div>
                    <div className="text-[9px] text-slate-400">
                      {m}
                    </div>
                    <div className="text-lg font-semibold text-emerald-400">
                      {currency(
                        basketDetail.totals[m] || 0
                      )}
                    </div>
                    {basketDetail.winner === m &&
                      basket.length > 0 && (
                        <div className="mt-0.5 text-[8px] text-emerald-400">
                          ▼ Mais competitivo para esta cesta
                        </div>
                      )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <a
                      href={mapsUrl(m)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-slate-700 px-2 py-1 text-[8px] text-slate-300 hover:border-emerald-500/70 hover:text-emerald-400"
                    >
                      Ver unidades no mapa
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Resultado / CTA final */}
        {showResult && basket.length > 0 && (
          <section
            id="resultado"
            className="mx-auto max-w-6xl px-4 pb-10"
          >
            <div className="rounded-3xl border border-emerald-500/40 bg-emerald-500/5 p-4 text-[10px] text-slate-100">
              <p>
                <b>Resultado para esta simulação:</b>{" "}
                o mercado mais vantajoso é{" "}
                <b>{basketDetail.winner}</b> com total de{" "}
                <b>
                  {currency(
                    basketDetail.totals[
                      basketDetail.winner
                    ]
                  )}
                </b>{" "}
                {delivery === "entrega" &&
                  "(inclui 5% de taxa de entrega)"}
                .
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={doCheckout}
                  className="rounded-2xl bg-slate-950 px-4 py-2 text-[10px] font-semibold text-emerald-400 ring-1 ring-emerald-500/60 hover:bg-slate-900"
                >
                  Gerar pedido (JSON demo)
                </button>
                <a
                  href={mapsUrl(basketDetail.winner)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-slate-700 px-4 py-2 text-[10px] text-slate-200 hover:border-emerald-500/70 hover:text-emerald-400"
                >
                  Abrir {basketDetail.winner} no mapa
                </a>
                <span className="text-[8px] text-slate-500">
                  Integrações reais: gateway de pagamento, ERP
                  do varejista, ingestão diária de planilha de
                  preços via Supabase.
                </span>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-[9px] text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="font-medium text-slate-200">
              Cestas Fit
            </span>{" "}
            • Engine multimercado para cestas inteligentes.
          </div>
          <div className="flex flex-wrap gap-2">
            <span>
              Demo com dados simulados + Supabase pronto para
              ingestão diária de planilhas.
            </span>
          </div>
        </div>
      </footer>

      {/* Modal checkout */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60">
          <div className="w-[90%] max-w-sm rounded-3xl border border-slate-800 bg-slate-950 p-4 text-[10px] text-slate-100 shadow-2xl">
            <h4 className="mb-1 text-sm font-semibold">
              Pagamento simulado gerado
            </h4>
            <p className="text-[9px] text-slate-400">
              Um arquivo <b>pedido.json</b> foi baixado com os
              dados da cesta e do mercado vencedor. Aqui você
              pluga o gateway real (PicPay, Stripe, Mercado Pago,
              cartão alimentação, etc).
            </p>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setShowCheckout(false)}
                className="rounded-2xl border border-slate-700 px-3 py-1.5 text-[9px] text-slate-200 hover:border-emerald-500/70 hover:text-emerald-400"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
