import { Link, useParams } from 'react-router-dom';
import Icon, { type IconName } from '../components/Icon';
import { CATEGORIES, byCode, type Protocol } from '../protocols/registry';
import { COMMON_PRECHECKS, DISCLAIMER } from '../protocols/standards';
import { exportSopPdf } from '../protocols/sopPdf';

export default function ProtocolDetail() {
  const { code = '' } = useParams();
  const p = byCode(code);
  if (!p) {
    return (
      <div className="container-x py-16 text-center">
        <p className="text-ink-700/70">No protocol found for “{code}”.</p>
        <Link to="/protocols" className="btn-primary mt-4 inline-block px-5 py-2.5">← Back to the registry</Link>
      </div>
    );
  }
  const c = CATEGORIES.find((x) => x.key === p.category)!;

  return (
    <div>
      {/* Header */}
      <section className="relative overflow-hidden bg-ink-900">
        <div className="container-x relative py-10">
          <Link to="/protocols" className="text-sm text-white/60 hover:text-white">← Protocol registry</Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-lg px-3 py-1 font-mono text-lg font-bold text-white" style={{ background: c.accent }}>{p.code}</span>
            <span className={`chip ${p.status === 'established' ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-200'}`}>
              {p.status === 'established' ? 'Established' : 'Investigational'}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-white/60">
              <span style={{ color: c.accent }}><Icon name={c.icon as IconName} className="h-4 w-4" /></span>{c.name}
            </span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-white sm:text-4xl">{p.name}</h1>
          {p.aka && <p className="mt-1 text-white/50">{p.aka}</p>}
          <p className="mt-3 max-w-2xl text-white/70">{p.indication}</p>
          {p.regions && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
              <Icon name="hospital" className="h-3.5 w-3.5" /> Notably practised: {p.regions}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => exportSopPdf(p)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-ink-900 transition hover:bg-white/90"
            >
              <Icon name="clipboard" className="h-4 w-4" /> Download SOP (PDF)
            </button>
            <a
              href={`${import.meta.env.BASE_URL}forms/clinical-forms.html?tx=${encodeURIComponent(p.name)}&measure=${/knee osteoarthritis/i.test(p.name) ? 'womac' : 'generic'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
            >
              <Icon name="clipboard" className="h-4 w-4" /> Clinical forms (print)
            </a>
          </div>
        </div>
      </section>

      <section className="container-x py-8">
        {!p.detailed && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <b>Summary entry.</b> This therapy is coded and carries the shared safety &amp; standards backbone; its
            full step-by-step protocol (dose, intervals, consumables, QC) is being documented and clinically validated.
            The fully-worked exemplars (marked “Full protocol ✓”) show the target depth for every entry.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-6">
            <Card title="Product & mechanism" icon="dna">
              <KV k="Cell / product source" v={p.cellSource} />
              <KV k="Mechanism of action" v={p.mechanism} />
              {p.route && <KV k="Delivery route" v={p.route} />}
              {p.identity && <KV k="Identity / potency / release" v={p.identity} />}
            </Card>

            {(p.dose || p.schedule) && (
              <Card title="Dose & schedule" icon="syringe">
                {p.dose && <KV k="Dose (typical published range)" v={p.dose} />}
                {p.schedule && <KV k="Schedule / intervals" v={p.schedule} />}
                <p className="mt-2 text-xs italic text-ink-700/55">Ranges are illustrative and validation-required — not fixed instructions.</p>
              </Card>
            )}

            <Card title="Procedure — step by step" icon="clipboard">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-700/50">Universal pre-checks</p>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink-800">
                {COMMON_PRECHECKS.map((s) => <li key={s}>{s}</li>)}
              </ol>
              {p.preScreen && p.preScreen.length > 0 && (
                <>
                  <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-ink-700/50">Therapy-specific screening</p>
                  <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-800">
                    {p.preScreen.map((s) => <li key={s}>{s}</li>)}
                  </ul>
                </>
              )}
              {p.steps && p.steps.length > 0 && (
                <>
                  <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-ink-700/50">Administration</p>
                  <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink-800">
                    {p.steps.map((s) => <li key={s}>{s}</li>)}
                  </ol>
                </>
              )}
            </Card>

            {p.consumables && p.consumables.length > 0 && (
              <Card title="Consumables, products & disposables" icon="flask">
                <ul className="space-y-2 text-sm">
                  {p.consumables.map((x) => (
                    <li key={x.item}>
                      <span className="font-semibold text-ink-900">{x.item}</span>
                      {x.examples && <span className="text-ink-700/60"> — e.g. {x.examples}</span>}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs italic text-ink-700/55">Brands are representative categories, not endorsements or mandates — select per your regulator &amp; supply chain.</p>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card title="Safety & adverse events" icon="heart" accent>
              {p.adverse && <List items={p.adverse} />}
              <p className="mt-3 text-xs text-ink-700/60">Run the <Link to="/simulator" className="font-semibold text-clay-700 underline">Protocol Simulator</Link> for a per-patient immune / adverse-event risk read before treatment.</p>
            </Card>
            {p.contraindications && (
              <Card title="Contraindications & precautions" icon="scale"><List items={p.contraindications} /></Card>
            )}
            {p.monitoring && <Card title="Monitoring" icon="clock"><List items={p.monitoring} /></Card>}
            {p.qcRelease && <Card title="QC / release criteria" icon="microscope"><List items={p.qcRelease} /></Card>}
            {p.storage && <Card title="Storage & handling" icon="dish"><p className="text-sm text-ink-800">{p.storage}</p></Card>}
            {p.governance && <Card title="Governance & standards" icon="hospital"><List items={p.governance} /></Card>}
            {p.evidence && <Card title="Evidence level" icon="trending"><p className="text-sm text-ink-800">{p.evidence}</p></Card>}
            {p.references && p.references.length > 0 && (
              <Card title="References" icon="clipboard">
                <ul className="space-y-1.5 text-sm">
                  {p.references.map((r) => <li key={r.label}><span className="font-semibold text-ink-900">{r.label}</span> <span className="text-ink-700/60">— {r.note}</span></li>)}
                </ul>
              </Card>
            )}
          </div>
        </div>

        <p className="mt-8 rounded-2xl border border-cream-300 bg-cream-50 p-4 text-xs italic text-ink-700/60">{DISCLAIMER}</p>
      </section>
    </div>
  );
}

function Card({ title, icon, accent, children }: { title: string; icon: IconName; accent?: boolean; children: React.ReactNode }) {
  return (
    <div className={`card p-5 ${accent ? 'ring-1 ring-clay-200' : ''}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="icon-tile h-8 w-8"><Icon name={icon} className="h-4 w-4" /></span>
        <h2 className="font-display text-base font-bold text-ink-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}
function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="mb-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-700/50">{k}</p>
      <p className="text-sm text-ink-800">{v}</p>
    </div>
  );
}
function List({ items }: { items: string[] }) {
  return <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-800">{items.map((s) => <li key={s}>{s}</li>)}</ul>;
}

export type { Protocol };
