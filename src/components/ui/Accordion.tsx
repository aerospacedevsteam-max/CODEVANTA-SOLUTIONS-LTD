import { ChevronDown } from 'lucide-react';

export function Accordion({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
      {items.map((item) => (
        <details key={item.q} className="group px-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-[15px] font-semibold text-navy-950">
            {item.q}
            <ChevronDown className="h-4 w-4 shrink-0 text-ink-subtle transition group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p className="pb-5 text-sm leading-6 text-ink-muted">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
