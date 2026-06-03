'use client';

import { Navbar } from '../../components/navbar';

const packages = [
  {
    name: '@open402/agents',
    desc: 'SDK principal. Cliente para crear agentes, gestionar pagos x402, pagar servicios MX y administrar créditos.',
    install: 'pnpm add @open402/agents',
  },
  {
    name: '@open402/agentkit',
    desc: 'Puente con Coinbase AgentKit. Provee AgentXActionProvider con 6 acciones (pay_bill, pay_x402, get_balance, get_history, add/remove_rule).',
    install: 'pnpm add @open402/agentkit',
  },
  {
    name: '@open402/agent',
    desc: 'Runtime para ejecutar agentes con CDP wallet + AgentKit + LangChain. Ideal para desplegar agentes autónomos.',
    install: 'pnpm add @open402/agent',
  },
  {
    name: '@open402/db',
    desc: 'Modelos Prisma y cliente de base de datos. Esquemas User, Agent, Wallet, Transaction, SpendingRule, CreditBalance.',
    install: 'pnpm add @open402/db',
  },
  {
    name: '@open402/api',
    desc: 'Tipos compartidos y utilidades de respuesta API. Interfaces AgenteXConfig, NetworkId, ApiResponse.',
    install: 'pnpm add @open402/api',
  },
];

const examples = [
  {
    title: 'Crear un agente y pagar una API',
    code: `import { AgentX } from '@open402/agents';

const agentx = await AgentX.create({
  apiKey: 'sk_...',
});

const agent = await agentx.createAgent('Mi Agente');

// Paga una API vía x402 (Arbitrum)
const result = await agent.payX402({
  url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
  method: 'GET',
});

console.log('Pagado:', result.cost, 'créditos');`,
  },
  {
    title: 'Pagar un servicio mexicano',
    code: `import { AgentX } from '@open402/agents';

const agentx = await AgentX.create({
  apiKey: 'sk_...',
});

const agent = await agentx.createAgent('Paga Luz');

// Paga CFE vía Prontipagos
const result = await agent.payService({
  provider: 'cfe',
  reference: '123456789',
  amount: 312.50,
});

console.log('Confirmación:', result.confirmationCode);`,
  },
  {
    title: 'Agregar reglas de gasto',
    code: `import { AgentX } from '@open402/agents';

const agentx = await AgentX.create({ apiKey: 'sk_...' });
const agent = await agentx.createAgent('Mi Agente');

// El agente nunca gastará más de 800 MXN por transacción
// ni pasará los 2000 MXN diarios sin confirmación
agent.addRule({
  service: 'cfe',
  maxAmount: 800,
  requiresConfirmation: true,
  confirmationThreshold: 600,
});`,
  },
  {
    title: 'Integrar con AgentKit + LangChain',
    code: `import { AgentX } from '@open402/agents';
import { AgentXActionProvider } from '@open402/agentkit';
import { AgentKit } from '@coinbase/agentkit';

const agentx = await AgentX.create({ apiKey: 'sk_...' });
const agent = await agentx.createAgent('AI Agent');

const agentKit = await AgentKit.from({
  actionProviders: [
    new AgentXActionProvider(agentx, agent),
  ],
});

// Ahora el LLM puede llamar herramientas como
// agentx_pay_bill, agentx_pay_x402, etc.`,
  },
];

export default function SDKPage() {
  return (
    <div className="bg-white text-slate-800 font-sans overflow-x-hidden">
      <Navbar active="sdk" />

      {/* Hero */}
      <section className="px-8 py-16 border-b border-black/5">
        <div className="max-w-[720px] mx-auto text-center">
          <p className="text-[10px] text-amber-500 font-mono tracking-widest m-0 mb-4">@OPEN402/SDK</p>
          <h1 className="text-4xl sm:text-5xl font-black m-0 mb-5 tracking-tight italic leading-[1.1]">
            Documentación del SDK
          </h1>
          <p className="text-sm text-slate-500 m-0 leading-relaxed max-w-[520px] mx-auto">
            Una línea de código y tu agente puede pagar APIs vía x402 y servicios mexicanos (CFE, Telmex, Telcel, Izzi). Sin wallets. Sin llaves privadas. Sin fricción.
          </p>
        </div>
      </section>

      {/* Paquetes */}
      <section className="px-8 py-16">
        <div className="max-w-[720px] mx-auto">
          <p className="text-[10px] text-slate-400 font-mono tracking-widest m-0 mb-3">PAQUETES</p>
          <h2 className="text-2xl font-bold m-0 mb-8 tracking-tight">Monorepo</h2>
          <div className="space-y-4">
            {packages.map((pkg) => (
              <div key={pkg.name} className="rounded-xl border border-black/10 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <code className="text-sm font-mono font-bold text-amber-600">{pkg.name}</code>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{pkg.desc}</p>
                  </div>
                </div>
                <pre className="mt-3 text-xs font-mono text-slate-500 bg-black/[3%] rounded-lg px-3 py-2 overflow-x-auto border border-black/5">
                  {pkg.install}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="px-8 py-16 bg-slate-50 border-y border-black/5">
        <div className="max-w-[720px] mx-auto">
          <p className="text-[10px] text-amber-500 font-mono tracking-widest m-0 mb-3">QUICK START</p>
          <h2 className="text-2xl font-bold m-0 mb-2 tracking-tight">Primeros pasos</h2>
          <p className="text-xs text-slate-500 m-0 mb-8">
            Obtén tu API key en el dashboard y empieza en menos de 5 minutos.
          </p>

          <div className="space-y-6">
            <div className="rounded-xl border border-black/10 bg-white overflow-hidden">
              <div className="px-5 py-3 border-b border-black/5 bg-slate-50">
                <span className="text-xs font-mono font-bold text-amber-600">Paso 1 — Instalar</span>
              </div>
              <pre className="p-5 m-0 text-sm font-mono text-slate-700 overflow-x-auto leading-relaxed">
pnpm add @open402/agents
              </pre>
            </div>

            <div className="rounded-xl border border-black/10 bg-white overflow-hidden">
              <div className="px-5 py-3 border-b border-black/5 bg-slate-50">
                <span className="text-xs font-mono font-bold text-amber-600">Paso 2 — Configurar</span>
              </div>
              <pre className="p-5 m-0 text-sm font-mono text-slate-700 overflow-x-auto leading-relaxed">
import {'{'} AgentX {'}'} from '@open402/agents';

const agentx = await AgentX.create({'{'}
  apiKey: process.env.OPEN402_KEY,
{'}'});
              </pre>
            </div>

            <div className="rounded-xl border border-black/10 bg-white overflow-hidden">
              <div className="px-5 py-3 border-b border-black/5 bg-slate-50">
                <span className="text-xs font-mono font-bold text-amber-600">Paso 3 — Crear un agente</span>
              </div>
              <pre className="p-5 m-0 text-sm font-mono text-slate-700 overflow-x-auto leading-relaxed">
const agent = await agentx.createAgent('Mi Agente', {'{'}
  policy: {'{'}
    daily_cap_mxn: 2000,
    confirm_above_mxn: 800,
    services: ['cfe', 'telmex'],
  {'}'},
{'}'});
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Ejemplos */}
      <section className="px-8 py-16">
        <div className="max-w-[720px] mx-auto">
          <p className="text-[10px] text-amber-500 font-mono tracking-widest m-0 mb-3">EJEMPLOS</p>
          <h2 className="text-2xl font-bold m-0 mb-8 tracking-tight">Uso del SDK</h2>
          <div className="space-y-6">
            {examples.map((ex) => (
              <div key={ex.title} className="rounded-xl border border-black/10 bg-white overflow-hidden">
                <div className="px-5 py-3 border-b border-black/5 bg-slate-50">
                  <span className="text-xs font-mono font-bold text-amber-600">{ex.title}</span>
                </div>
                <pre className="p-5 m-0 text-sm font-mono text-slate-700 overflow-x-auto leading-relaxed">{ex.code}</pre>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Clases principales */}
      <section className="px-8 py-16 bg-slate-50 border-y border-black/5">
        <div className="max-w-[720px] mx-auto">
          <p className="text-[10px] text-amber-500 font-mono tracking-widest m-0 mb-3">API</p>
          <h2 className="text-2xl font-bold m-0 mb-2 tracking-tight">Clases principales</h2>
          <p className="text-xs text-slate-500 m-0 mb-8">
            Todas las clases son importables desde <code className="text-amber-600 font-mono text-xs">@open402/agents</code>.
          </p>

          <div className="space-y-4">
            {[
              {
                name: 'AgentX',
                desc: 'Punto de entrada del SDK. Configura la conexión con la API, maneja autenticación y crea agentes.',
                methods: ['create(config)', 'createAgent(name, config?)', 'getAgent(id)', 'listAgents()', 'getBalance()', 'purchaseCredits(request)', 'payBill(request)', 'payX402(request)'],
              },
              {
                name: 'Agent',
                desc: 'Representa un agente autónomo. Cada agente tiene su propia wallet (Agentic Wallet) y su policy engine.',
                methods: ['payX402(request)', 'payService(request)', 'getBalance()', 'getHistory(limit?)', 'addRule(rule)', 'removeRule(ruleId)', 'listRules()'],
              },
              {
                name: 'AgentWallet',
                desc: 'Wallet MPC del agente en Arbitrum o Base. Las claves viven en TEE (AWS Nitro Enclave). Nunca expuestas.',
                methods: ['create(config, client?)', 'import(config, address, client?)', 'getBalance()', 'sendMXM(to, amount)'],
              },
              {
                name: 'PolicyEngine',
                desc: 'Motor de reglas de gasto. Cada agente tiene su propia instancia. Las reglas son bloqueantes.',
                methods: ['evaluate(action)', 'addRule(rule)', 'removeRule(ruleId)', 'listRules()', 'setDailyCap(amount)', 'setPerTxLimit(amount)'],
              },
              {
                name: 'ApiClient',
                desc: 'Cliente HTTP interno para comunicarse con la API de open402. Usado por AgentX automáticamente.',
                methods: ['createAgent(name)', 'getBalance()', 'purchaseCredits(input)', 'payBill(agentId, request)', 'payX402(agentId, request)', 'createWallet(networkId)', 'getWalletBalance(address)', 'transferMXM(from, to, amount)'],
              },
              {
                name: 'X402PaymentHandler',
                desc: 'Manejador del protocolo x402. Intercepta respuestas HTTP 402, extrae instrucciones de pago, ejecuta el pago via wallet.sendMXM() y reintenta la request original.',
                methods: ['pay(request)', 'parsePaymentRequired(header)', 'executePayment(payload)'],
              },
              {
                name: 'BillPaymentHandler',
                desc: 'Manejador de pagos de servicios mexicanos via Prontipagos API. Soporta CFE, Telmex, Telcel, Izzi y 400+ servicios.',
                methods: ['pay(provider, reference, amount)', 'getProviders()', 'checkStatus(transactionId)'],
              },
            ].map((cls) => (
              <div key={cls.name} className="rounded-xl border border-black/10 bg-white p-5">
                <code className="text-sm font-mono font-bold text-amber-600">{cls.name}</code>
                <p className="text-xs text-slate-500 mt-1.5 mb-3 leading-relaxed">{cls.desc}</p>
                <div className="flex flex-wrap gap-1">
                  {cls.methods.map((m) => (
                    <code key={m} className="text-[10px] font-mono text-slate-500 bg-black/[3%] px-2 py-0.5 rounded border border-black/5">
                      {m}
                    </code>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Policy Engine */}
      <section className="px-8 py-16">
        <div className="max-w-[720px] mx-auto">
          <p className="text-[10px] text-amber-500 font-mono tracking-widest m-0 mb-3">POLICY ENGINE</p>
          <h2 className="text-2xl font-bold m-0 mb-2 tracking-tight">Reglas de gasto</h2>
          <p className="text-xs text-slate-500 m-0 mb-8">
            Define qué puede gastar tu agente, cuánto y cuándo. Las reglas son bloqueantes — el agente nunca las viola.
          </p>

          <div className="rounded-xl border border-black/10 bg-white overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-black/5 bg-slate-50">
              <span className="text-xs font-mono font-bold text-amber-600">SpendingRule</span>
            </div>
            <pre className="p-5 m-0 text-sm font-mono text-slate-700 overflow-x-auto leading-relaxed">{`interface SpendingRule {
  id: string;
  service: string;          // 'cfe' | 'telmex' | 'telcel' | 'izzi' | '*'
  maxAmount: number;        // Monto máximo MXN por transacción
  requiresConfirmation: boolean;
  confirmationThreshold?: number;  // Pide confirmación sobre este monto
  schedule?: {
    type: 'monthly' | 'weekly' | 'one-time';
    day?: number;           // Día del mes (monthly)
    time?: string;          // '09:00'
  };
  notification?: {
    channels: ('telegram' | 'email')[];
    notifyBeforeDays?: number;
  };
}`}</pre>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/5 px-8 py-8 text-center bg-slate-50">
        <p className="text-xs text-slate-400 font-mono">
          open402 &mdash; Infraestructura financiera para la economía de agentes autónomos
        </p>
      </footer>
    </div>
  );
}
