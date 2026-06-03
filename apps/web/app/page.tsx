'use client';

import { Navbar } from '../components/navbar';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { useEffect, useRef, useState } from 'react';

// ─── Telegram link handler ─────────────────────────────────────────────────────
function TelegramLinkHandler() {
  const [status, setStatus] = useState<'idle' | 'linking' | 'success' | 'error' | 'noauth'>('idle');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const telegramId = params.get('telegram_id');
    if (!telegramId) return;

    setStatus('linking');
    fetch('/api/telegram/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId }),
    }).then(async (res) => {
      if (res.status === 401) { setStatus('noauth'); return; }
      if (!res.ok) { setStatus('error'); return; }
      setStatus('success');
      const url = new URL(window.location.href);
      url.searchParams.delete('telegram_id');
      window.history.replaceState({}, '', url.toString());
    }).catch(() => setStatus('error'));
  }, []);

  if (status === 'idle') return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center text-xs font-mono border-b ${
      status === 'success' ? 'bg-green-light text-green border-green/20' :
      status === 'error' || status === 'noauth' ? 'bg-red-50 text-red-600 border-red-200' :
      'bg-amber-l text-amber border-amber/20'
    }`}>
      {status === 'linking' && 'Vinculando cuenta de Telegram...'}
      {status === 'success' && 'Cuenta de Telegram vinculada correctamente'}
      {status === 'error' && 'Error al vincular cuenta de Telegram'}
      {status === 'noauth' && 'Inicia sesión primero para vincular tu cuenta de Telegram'}
    </div>
  );
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      let cur = 0;
      const tick = () => {
        cur += Math.ceil(to / 40);
        if (cur >= to) { setVal(to); return; }
        setVal(cur);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      obs.disconnect();
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [credits, setCredits] = useState(1000);
  const [burning, setBurning] = useState(false);

  const burn = () => {
    if (credits <= 0 || burning) return;
    setBurning(true);
    setTimeout(() => {
      setCredits(c => Math.max(0, c - Math.floor(Math.random() * 12 + 3)));
      setBurning(false);
    }, 700);
  };

  return (
    <div className="bg-white text-ink font-sans text-sm">

      <TelegramLinkHandler />

      {/* ── NAV ───────────────────────────────────── */}
      <div className="max-w-[680px] mx-auto px-5">
        <Navbar variant="landing" />
      </div>

      {/* ── HERO ───────────────────────────────────── */}
      <section className="max-w-[680px] mx-auto px-5 py-14 pb-12 border-b border-black/[0.09]">

        <h1 className="font-display text-[46px] leading-[1.04] tracking-tight text-ink m-0 mb-[18px]">
          Los agentes de AI<br />ya pueden pagar.<br /><em className="italic text-amber not-italic">Tú los controlas.</em>
        </h1>

        <p className="text-[15px] leading-relaxed text-ink-3 max-w-[500px] m-0 mb-[30px] font-[300]">
          open402 es la infraestructura financiera que le faltaba a la economía agéntica en México y LATAM. <strong className="font-medium text-ink">Una integración</strong> y tu agente paga APIs vía x402, servicios mexicanos (CFE, Telmex, Telcel), ejecuta pagos programados — sin que el usuario toque una wallet ni una llave privada.
        </p>

        <div className="flex gap-2.5 flex-wrap mb-10">
          <SignedOut>
            <SignInButton>
              <button className="font-mono text-[11px] px-[22px] py-[11px] bg-ink text-white cursor-pointer hover:bg-ink-2 transition-colors border-none tracking-[0.02em]">
                npm install @open402/agents →
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <a href="/dashboard" className="font-mono text-[11px] px-[22px] py-[11px] bg-ink text-white no-underline hover:bg-ink-2 transition-colors tracking-[0.02em]">
              Ir al Dashboard →
            </a>
          </SignedIn>
          <a href="/sdk" className="font-mono text-[11px] px-[22px] py-[11px] bg-transparent text-ink border border-black/[0.09] no-underline cursor-pointer hover:border-black/30 transition-colors">
            leer documentación
          </a>
          <a href="https://github.com/Irwingduran/open402.git" className="font-mono text-[11px] px-[22px] py-[11px] bg-transparent text-ink border border-black/[0.09] no-underline cursor-pointer hover:border-black/30 transition-colors">
            ★ ver en github
          </a>
        </div>

        <div className="grid grid-cols-4 border border-black/[0.09]">
          {[
            { n: 400, s: '+', l: 'servicios mexicanos disponibles' },
            { n: 44, s: '%', l: 'CAGR mercado AI agéntica' },
            { n: 199, s: 'B', l: 'proyección de mercado 2034', prefix: '$' },
            { n: 1, s: '', l: 'SDK. dos canales. cero wallets.' },
          ].map(({ n, s, l, prefix = '' }, i) => (
            <div key={l} className={`px-4 py-[18px] ${i < 3 ? 'border-r border-black/[0.09]' : ''}`}>
              <span className="font-mono text-[19px] font-medium text-ink block mb-[2px]">
                {prefix}<Counter to={n} />{s}
              </span>
              <span className="text-[11px] text-ink-3 leading-relaxed block">{l}</span>
            </div>
          ))}
        </div>
      </section>


      {/* ── POR QUÉ OPEN402 ────────────────────────────── */}
      <section className="max-w-[680px] mx-auto px-5 py-9 border-b border-black/[0.09]">
        <span className="font-mono text-[10px] tracking-[0.1em] text-ink-4 block mb-[10px]">por qué open402</span>
        <h2 className="font-display text-2xl text-ink leading-tight m-0 mb-1.5">El moat que los gigantes no tienen.</h2>
        <p className="text-sm text-ink-3 font-[300] max-w-[520px] leading-relaxed m-0">
          Stripe ACP, Google AP2 y Visa VIC están construyendo capas globales. Ninguno paga CFE. Ninguno usa SPEI. Ninguno habla MXM.
        </p>

        <div className="border border-black/[0.09] mt-6">
          {[
            { label: 'on-ramp local', title: 'SPEI + Bitso → MXM en Stellar', desc: 'El usuario transfiere MXN con SPEI — lo que ya sabe hacer. open402 convierte a MXM de forma asíncrona. <strong>Sin criptomonedas visibles. Sin cuentas en exchanges.</strong> El primer on-ramp de México conectado a economía agéntica.' },
            { label: 'servicios reales', title: '400+ servicios mexicanos vía Prontipagos', desc: 'CFE, Telmex, Telcel, Izzi y 400 servicios más. <strong>Tu agente paga la luz el día 5 de cada mes, automáticamente</strong> — sin que el usuario haga nada. Eso no lo tiene ningún protocolo global.' },
            { label: 'protocolo x402', title: 'El estándar que ganó — y open402 ya lo habla', desc: 'x402 es el protocolo que Linux Foundation formalizó en abril 2026. Visa, Mastercard, Google, AWS y Stripe son miembros. <strong>open402 ya implementa x402 sobre Stellar</strong> con stablecoin MXM — primer proyecto LATAM-first sobre este estándar.' },
            { label: 'control del usuario', title: 'Policy engine granular — el agente nunca se pasa', desc: 'Tope diario, monto máximo por tx, confirmación obligatoria, pagos programados, alertas previas. <strong>Si el agente viola una regla, se detiene</strong> — no ejecuta y notifica. Las reglas son bloqueantes, no sugerencias.' },

          ].map(({ label, title, desc }) => (
            <div key={label} className="grid grid-cols-[160px_1fr] border-b border-black/[0.09] last:border-b-0">
              <div className="font-mono text-[10px] tracking-[0.06em] text-ink-4 px-[14px] py-4 border-r border-black/[0.09] leading-relaxed">{label}</div>
              <div className="px-[18px] py-4">
                <div className="text-sm font-medium text-ink mb-1">{title}</div>
                <div className="text-xs text-ink-3 font-[300] leading-relaxed" dangerouslySetInnerHTML={{ __html: desc }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CÓMO SE USA ────────────────────────────────── */}
      <section className="max-w-[680px] mx-auto px-5 py-9 border-b border-black/[0.09]">
        <span className="font-mono text-[10px] tracking-[0.1em] text-ink-4 block mb-[10px]">cómo se usa</span>
        <h2 className="font-display text-2xl text-ink leading-tight m-0 mb-1.5">Para developers. Para builders. Para todos.</h2>
        <p className="text-sm text-ink-3 font-[300] max-w-[520px] leading-relaxed m-0">No necesitas entender blockchain. El SDK abstrae todo lo complejo.</p>

        <div className="flex flex-col gap-2.5 mt-6">
          {[
            {
              persona: 'Developer', role: 'backend · saas · agente',
              want: '"Quiero que mi agente pague APIs de terceros automáticamente sin manejar wallets."',
              steps: [
                'Instala <em>@open402/agents</em> con npm. Configura tu API key.',
                'Llama a <em>agent.payX402({ url })</em>. El SDK maneja el flujo HTTP 402 → firma → reintento.',
                'El agente paga la API en MXM sobre Arbitrum. Queda registrado on-chain. Tú no ves crypto.',
              ],
            },
            {
              persona: 'Familia / usuario final', role: 'telegram · no técnico',
              want: '"Quiero que alguien pague mis servicios sin que yo tenga que acordarme cada mes."',
              steps: [
                'Le escribes al bot de Telegram: <em>"paga mi CFE cada mes, máximo $500"</em>.',
                'El agente valida las reglas, te confirma antes de ejecutar si supera el límite.',
                'Recibes notificación con desglose. El recibo llega. Nunca más olvidas pagar la luz.',
              ],
            },
            {
              persona: 'Empresa / fintech', role: 'b2b · sdk · integración',
              want: '"Quiero ofrecer pagos agénticos a mis clientes sin construir la infraestructura desde cero."',
              steps: [
                'Integra el SDK en tu producto. Define las políticas de gasto por usuario o cuenta.',
                'Tus usuarios cargan créditos vía SPEI. El backend maneja conversión MXN → MXM.',
                'Cobras 1.5% por tx. open402 maneja la infraestructura on-chain. Tú te enfocas en tu producto.',
              ],
            },
          ].map(({ persona, role, want, steps }) => (
            <div key={persona} className="border border-black/[0.09] grid grid-cols-1 sm:grid-cols-[180px_1fr]">
              <div className="px-5 py-[18px] border-b sm:border-b-0 sm:border-r border-black/[0.09] bg-[#fafaf9]">
                <div className="text-xs font-medium text-ink mb-1">{persona}</div>
                <div className="text-[11px] text-ink-4 font-mono mb-3.5">{role}</div>
                <div className="text-[11.5px] text-ink-3 font-[300] leading-relaxed italic">{want}</div>
              </div>
              <div className="px-5 py-[18px] flex flex-col gap-[7px]">
                {steps.map((step, i) => (
                  <div key={i} className="flex gap-2.5 items-start">
                    <span className="font-mono text-[10px] text-ink-4 min-w-[18px] mt-[1px]">0{i + 1}</span>
                    <span className="text-xs text-ink leading-relaxed" dangerouslySetInnerHTML={{ __html: step }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SDK / INTEGRACIÓN ──────────────────────────── */}
      <section id="sdk" className="max-w-[680px] mx-auto px-5 py-9 border-b border-black/[0.09]">
        <span className="font-mono text-[10px] tracking-[0.1em] text-ink-4 block mb-[10px]">integración</span>
        <h2 className="font-display text-2xl text-ink leading-tight m-0 mb-1.5">De cero a agente que paga en minutos.</h2>
        <p className="text-sm text-ink-3 font-[300] max-w-[520px] leading-relaxed m-0 mb-6">
          Wallets MPC, conversión de moneda, firma on-chain, reintentos HTTP — todo abstraído. Tú escribes lógica de negocio, no infraestructura.
        </p>

        <div className="border border-black/[0.09] overflow-hidden">
          <div className="flex items-center justify-between px-[14px] py-[9px] border-b border-black/[0.09] bg-[#f7f6f3]">
            <span className="font-mono text-[11px] text-ink-3">agent.ts</span>
            <span className="font-mono text-[10px] px-2 py-[2px] bg-green-l text-green">npm install @open402/agents</span>
          </div>
          <pre className="m-0 px-5 py-[18px] text-[11.5px] leading-relaxed font-mono text-ink overflow-x-auto bg-[#f7f6f3]">
{`// paso 1 — crear agente con política de gasto
const agent = await AgentX.create({
  apiKey: process.env.OPEN402_KEY,
  policy: {
    daily_cap_mxn: 2000,        // tope diario
    confirm_above_mxn: 800,     // pide confirmación si supera
    services: ['cfe', 'telmex'],  // servicios permitidos
  },
});

// paso 2a — pagar API vía x402 (Arbitrum · MXM)
await agent.payX402({ url: 'https://api.coingecko.com/v3/price' });

// paso 2b — pagar servicio mexicano (CFE, Telmex, Telcel...)
await agent.payService({ provider: 'cfe', reference: '123456789' });`}
          </pre>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 border border-black/[0.09] border-t-0">
          {[
            { t: 'Wallets MPC en AWS Nitro', d: 'Claves privadas en enclaves seguros. Nunca expuestas al LLM ni al developer.' },
            { t: 'Dos canales, una API', d: 'x402 para cualquier API. Prontipagos para servicios mexicanos. El SDK elige el canal.' },
            { t: 'Audit trail on-chain', d: 'Cada tx x402 queda en Arbitrum. Auditable permanentemente sin intermediarios.' },
          ].map(({ t, d }, i) => (
            <div key={t} className={`px-4 py-[14px] ${i < 2 ? 'border-b sm:border-b-0 sm:border-r border-black/[0.09]' : ''}`}>
              <div className="text-xs font-medium text-ink mb-1">{t}</div>
              <div className="text-[11px] text-ink-3 font-[300] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </section>

     
      {/* ── MERCADO / EL MOMENTO ──────────────────────── */}
      <section id="mercado" className="max-w-[680px] mx-auto px-5 py-9 border-b border-black/[0.09]">
        <span className="font-mono text-[10px] tracking-[0.1em] text-ink-4 block mb-[10px]">el momento</span>
        <h2 className="font-display text-2xl text-ink leading-tight m-0 mb-1.5">La ola llegó. La infraestructura no estaba.</h2>
        <p className="text-sm text-ink-3 font-[300] leading-relaxed max-w-[540px] m-0">
          En 2025, los agentes de AI cruzaron un umbral: pasaron de <em>aconsejar</em> a <em>actuar</em>. El cuello de botella no es la inteligencia — es el dinero. open402 resuelve eso para LATAM.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-6">
          {[
            { n: '$199B', l: 'mercado global de AI agéntica para 2034', d: 'CAGR del 43.8%. El segmento de mayor crecimiento en tecnología. La infraestructura de pagos es el cuello de botella más citado por analistas.', accent: true },
            { n: '100M+', l: 'transacciones procesadas por x402 en 2025', d: 'El volumen semanal creció de 46K a 930K transacciones en un mes — un incremento del 1,000%. Google, Visa, Cloudflare ya son miembros fundadores.' },
            { n: '$46T', l: 'volumen anual de transacciones con stablecoins', d: 'El comercio agéntico se ejecuta en stablecoins a velocidad de máquina. MXNB y MXM son las piezas que conectan México con esa economía.' },
            { n: '38%', l: 'del TPV en México todavía es efectivo', d: 'México: 130M personas, $1.8T PIB, SPEI creciendo 30% anual. 803 fintechs operando. El mercado más grande y menos servido de LATAM para pagos agénticos.' },
          ].map(({ n, l, d, accent }) => (
            <div key={l} className={`border border-black/[0.09] px-5 py-[18px] ${accent ? 'border-amber/30 bg-[rgba(250,238,218,0.35)]' : ''}`}>
              <div className={`font-mono text-[22px] font-medium m-0 mb-1 ${accent ? 'text-amber' : 'text-ink'}`}>{n}</div>
              <div className="text-xs font-medium text-ink mb-1">{l}</div>
              <div className="text-[11.5px] text-ink-3 font-[300] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>

        <div className="border border-black/[0.09]">
          {[
            { year: 'may 2025', event: 'Coinbase lanza x402.', detail: 'Elimina API keys, habilita pagos nativos para LLMs.', badge: 'protocolo', badgeStyle: 'bg-amber-l text-amber' },
            { year: 'sep 2025', event: 'x402 crece 1,000% en un mes.', detail: 'Google, Visa y Cloudflare se suman como miembros fundadores.', badge: 'validación', badgeStyle: 'bg-green-l text-green' },
            { year: 'abr 2026', event: 'Santander pilotea pagos agénticos con Visa en México, Argentina, Chile y Uruguay.', detail: 'La ola ya llegó a LATAM.', badge: 'latam', badgeStyle: 'bg-amber-l text-amber' },
            { year: 'hoy', event: 'open402 es la infraestructura que conecta ese protocolo con servicios mexicanos reales.', detail: 'Sin intermediarios globales. Sin fricción.', badge: null },
          ].map(({ year, event, detail, badge, badgeStyle }) => (
            <div key={year} className="flex items-baseline border-b border-black/[0.09] last:border-b-0">
              <span className="font-mono text-[11px] text-ink-4 px-[14px] py-2.5 border-r border-black/[0.09] min-w-[64px] flex-shrink-0">{year}</span>
              <div className="text-xs text-ink px-[14px] py-2.5 leading-relaxed">
                {event} <span className="text-ink-3 font-[300]">{detail}</span>
                {badge && <span className={`font-mono text-[9px] tracking-[0.06em] px-[7px] py-[2px] ml-2 align-middle ${badgeStyle}`}>{badge}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── POLICY ENGINE ─────────────────────────────── */}
      <section className="max-w-[680px] mx-auto px-5 py-9 border-b border-black/[0.09]">
        <span className="font-mono text-[10px] tracking-[0.1em] text-ink-4 block mb-[10px]">policy engine</span>
        <h2 className="font-display text-2xl text-ink leading-tight m-0 mb-1.5">Tu agente, tus reglas.</h2>
        <p className="text-sm text-ink-3 font-[300] max-w-[520px] leading-relaxed m-0 mb-6">
          Las reglas son bloqueantes — el agente no negocia, no hace excepciones, no ejecuta si viola una política.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 border border-black/[0.09]">
          {[
            { icon: '01 · límites', t: 'Tope de gasto', d: 'Monto máximo por tx y cap diario. Irrompibles.', c: 'daily_cap_mxn: 2000' },
            { icon: '02 · confirmación', t: 'Humano en el loop', d: 'Telegram pregunta antes de ejecutar montos altos.', c: 'confirm_above_mxn: 600' },
            { icon: '03 · schedule', t: 'Pagos programados', d: 'Día 5 de cada mes, la luz ya está pagada.', c: 'type: "monthly", day: 5' },
            { icon: '04 · alertas', t: 'Avisos previos', d: 'Notificación 2 días antes. Cancela si lo necesitas.', c: 'notify_before_days: 2' },
            { icon: '05 · halt', t: 'Falla explícita', d: 'Violación de regla → el agente para y notifica.', c: 'on_violation: "halt"' },
            { icon: '06 · audit', t: 'Historial completo', d: 'Dashboard + on-chain para x402. Todo registrado.', c: 'persist_before_execute' },
          ].map(({ icon, t, d, c }, i) => (
            <div key={t}
              className={`px-4 py-4 border-r border-black/[0.09] last:border-r-0 ${i >= 3 ? 'border-t border-black/[0.09]' : ''}`}
              style={{ borderRight: (i + 1) % 3 === 0 ? 'none' : undefined }}
            >
              <span className="font-mono text-[9.5px] tracking-[0.06em] text-ink-4 block mb-[7px]">{icon}</span>
              <div className="text-xs font-medium text-ink mb-1">{t}</div>
              <p className="text-[11px] text-ink-3 leading-relaxed font-[300] m-0 mb-2">{d}</p>
              <code className="font-mono text-[10px] text-amber bg-amber-l px-[7px] py-[2px] inline-block">{c}</code>
            </div>
          ))}
        </div>
      </section>

      {/* ── TELEGRAM ──────────────────────────────────── */}
      <section className="max-w-[680px] mx-auto px-5 py-9 border-b border-black/[0.09]">
        <span className="font-mono text-[10px] tracking-[0.1em] text-ink-4 block mb-[10px]">interfaz conversacional</span>
        <h2 className="font-display text-2xl text-ink leading-tight m-0 mb-1.5">Sin dashboard. Desde Telegram.</h2>
        <p className="text-sm text-ink-3 font-[300] max-w-[520px] leading-relaxed m-0 mb-6">
          Para quienes no quieren tocar código ni abrir una app. El bot de Telegram es el agente — entiende intención, extrae datos de fotos de recibos y ejecuta.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-7 items-start">
          <div className="border border-black/[0.09]">
            {[
              { n: '01', t: 'OCR de recibos ', d: '— foto de CFE → extrae referencia, monto y servicio automáticamente' },
              { n: '02', t: 'Pagos directos ', d: '— "paga Telmex ref 99012 por $199" → validado y ejecutado' },
              { n: '03', t: 'Crear agente ', d: '— "crea un agente" → wallet lista en Arbitrum Sepolia' },
              { n: '04', t: 'Reglas de voz ', d: '— "regla para CFE máximo $500" → política configurada' },
              { n: '05', t: 'Consultas ', d: '— saldo, historial de tx, detalle de agentes activos' },
            ].map(({ n, t, d }) => (
              <div key={n} className="grid grid-cols-[32px_1fr] border-b border-black/[0.09] last:border-b-0">
                <span className="font-mono text-[10px] text-ink-4 px-2.5 py-2.5 border-r border-black/[0.09]">{n}</span>
                <div className="text-xs text-ink leading-relaxed px-3 py-2.5">
                  {t}<span className="text-ink-3 font-[300]">{d}</span>
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="font-mono text-[9px] text-ink-4 tracking-[0.06em] mb-1.5">conversación real</div>
            <div className="border border-black/[0.09] p-[14px] flex flex-col gap-[9px]">
              <div className="max-w-[82%] self-end px-3 py-2 text-[11px] leading-relaxed font-[300] text-ink" style={{ background: '#f0efed' }}>
                paga mi CFE este mes, ref 123456, son $312
              </div>
              <div className="max-w-[82%] self-start px-3 py-2 text-[10.5px] leading-relaxed font-mono bg-white border border-black/[0.09] text-ink">
                <span className="text-green">✓</span> ref <span className="text-amber">123456</span> verificada<br />
                <span className="text-green">✓</span> monto: <span className="text-blue">$312.00 MXN</span><br />
                <span className="text-green">✓</span> reglas: ok (límite $500)<br />
                ¿confirmo el pago?
              </div>
              <div className="max-w-[82%] self-end px-3 py-2 text-[11px] leading-relaxed font-[300] text-ink" style={{ background: '#f0efed' }}>
                sí
              </div>
              <div className="max-w-[82%] self-start px-3 py-2 text-[10.5px] leading-relaxed font-mono bg-white border border-black/[0.09] text-ink">
                <span className="text-green">✓ ejecutado · prontipagos</span><br />
                créditos usados: <span className="text-blue">31,200</span><br />
                comprobante: <span className="text-amber">open402_0x7f2a...</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MOAT / POSICIONAMIENTO ─────────────────────── */}
      <section className="max-w-[680px] mx-auto px-5 py-9 border-b border-black/[0.09]">
        <span className="font-mono text-[10px] tracking-[0.1em] text-ink-4 block mb-[10px]">posicionamiento</span>
        <h2 className="font-display text-2xl text-ink leading-tight m-0 mb-1.5">Los globales no sirven para México.</h2>
        <p className="text-sm text-ink-3 font-[300] max-w-[520px] leading-relaxed m-0 mb-6">
          Stripe ACP, Google AP2 y Visa VIC construyen infraestructura para mercados desarrollados. open402 construye para LATAM desde el primer commit.
        </p>

        {/* Header row */}
        <div className="border border-black/[0.09]">
          <div className="grid grid-cols-4 border-b border-black/[0.09]">
            <span className="font-mono text-[10px] tracking-[0.06em] text-ink-4 px-3 py-2.5 border-r border-black/[0.09]" />
            <span className="font-mono text-[10px] tracking-[0.06em] text-amber px-3 py-2.5 border-r border-black/[0.09]">open402</span>
            <span className="font-mono text-[10px] tracking-[0.06em] text-ink-4 px-3 py-2.5 border-r border-black/[0.09]">Stripe ACP / Google AP2</span>
            <span className="font-mono text-[10px] tracking-[0.06em] text-ink-4 px-3 py-2.5">Visa VIC</span>
          </div>

          {[
            { feature: 'On-ramp SPEI', us: '✓ nativo', them: '✗', them2: '✗', usClass: 'text-green font-normal', themClass: 'text-[#c0392b] opacity-70' },
            { feature: 'Servicios MX (CFE, Telmex)', us: '✓ 400+ servicios', them: '✗', them2: '✗', usClass: 'text-green font-normal', themClass: 'text-[#c0392b] opacity-70' },
            { feature: 'Protocolo x402 nativo', us: '✓ Arbitrum · MXM', them: 'parcial / experimental', them2: '✗', usClass: 'text-green font-normal', themClass: 'text-ink-3' },
            { feature: 'Stablecoin mexicana (MXM)', us: '✓ MXM + MXNB', them: '✗ USD/EUR', them2: '✗ USD/EUR', usClass: 'text-green font-normal', themClass: 'text-[#c0392b] opacity-70' },
            { feature: 'Bot de Telegram + OCR', us: '✓ incluido', them: '✗', them2: '✗', usClass: 'text-green font-normal', themClass: 'text-[#c0392b] opacity-70' },
            { feature: 'Open source SDK', us: '✓', them: '✗ propietario', them2: '✗ propietario', usClass: 'text-green font-normal', themClass: 'text-[#c0392b] opacity-70' },
          ].map(({ feature, us, them, them2, usClass, themClass }) => (
            <div key={feature} className="grid grid-cols-4 border-b border-black/[0.09] last:border-b-0">
              <div className="text-xs font-medium text-ink px-3 py-2.5 border-r border-black/[0.09] leading-relaxed">{feature}</div>
              <div className={`text-[11.5px] text-ink-3 px-3 py-2.5 border-r border-black/[0.09] leading-relaxed font-[300] ${usClass}`}>{us}</div>
              <div className={`text-[11.5px] text-ink-3 px-3 py-2.5 border-r border-black/[0.09] leading-relaxed font-[300] ${themClass}`}>{them}</div>
              <div className={`text-[11.5px] text-ink-3 px-3 py-2.5 leading-relaxed font-[300] ${themClass}`}>{them2}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────── */}
      <section className="max-w-[680px] mx-auto px-5 py-14 pb-11 text-center">
        <h2 className="font-display text-[34px] leading-[1.08] text-ink m-0 mb-3">
          Tus agentes pueden hacer<br />mucho más que <em className="italic text-amber not-italic">pensar.</em>
        </h2>
        <p className="text-sm text-ink-3 font-[300] leading-relaxed max-w-[460px] mx-auto m-0 mb-7">
          El problema no es la inteligencia artificial — es que cuando un agente necesita <strong className="font-medium text-ink">pagar algo real</strong>, no puede. No hay API keys para servicios mexicanos, no hay wallets para máquinas, no hay infraestructura. open402 existe para eso.
        </p>
        <div className="flex gap-2.5 justify-center flex-wrap mb-[14px]">
          <SignedOut>
            <SignInButton>
              <button className="font-mono text-[11px] px-[22px] py-[11px] bg-ink text-white cursor-pointer hover:bg-ink-2 transition-colors border-none tracking-[0.02em]">
                npm install @open402/agents →
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <a href="/dashboard" className="font-mono text-[11px] px-[22px] py-[11px] bg-ink text-white no-underline hover:bg-ink-2 transition-colors tracking-[0.02em]">
              Ir al Dashboard →
            </a>
          </SignedIn>
          <a href="/sdk" className="font-mono text-[11px] px-[22px] py-[11px] bg-transparent text-ink border border-black/[0.09] no-underline cursor-pointer hover:border-black/30 transition-colors">
            leer documentación
          </a>
          <a href="https://github.com/Irwingduran/open402.git" className="font-mono text-[11px] px-[22px] py-[11px] bg-transparent text-ink border border-black/[0.09] no-underline cursor-pointer hover:border-black/30 transition-colors">
            ★ github
          </a>
        </div>

        {/* TRUST */}
        <div className="flex items-center gap-1.5 flex-wrap justify-center mt-[18px] pt-[18px] border-t border-black/[0.09]">
          <span className="font-mono text-[9.5px] text-ink-4 tracking-[0.1em] mr-2">construido sobre</span>
          {['Stellar Network', 'x402 Protocol', 'Prontipagos', 'Bitso MXNB', 'Soroban', 'Stellar SDK'].map((item, i) => (
            <span key={item}>
              <span className="font-mono text-[10.5px] font-medium text-ink-3">{item}</span>
              {i < 5 && <span className="text-ink-4 text-[10px] mx-1">·</span>}
            </span>
          ))}
        </div>
      </section>

    </div>
  );
}
