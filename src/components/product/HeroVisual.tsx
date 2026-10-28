/** Original illustration: a website mockup, a dashboard preview and resource cards. */
export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-xl" aria-hidden="true">
      <div className="absolute -inset-8 -z-10 rounded-[2rem] bg-[radial-gradient(ellipse_at_top_right,theme(colors.brand.200/.55),transparent_60%),radial-gradient(ellipse_at_bottom_left,theme(colors.navy.200/.6),transparent_55%)]" />
      {/* Browser window: website template */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 h-4 flex-1 rounded bg-white ring-1 ring-slate-200" />
        </div>
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <span className="h-3 w-20 rounded bg-navy-900" />
            <span className="flex gap-2">
              <span className="h-2 w-8 rounded bg-slate-300" />
              <span className="h-2 w-8 rounded bg-slate-300" />
              <span className="h-2 w-8 rounded bg-slate-300" />
            </span>
          </div>
          <div className="grid grid-cols-5 items-center gap-4">
            <div className="col-span-3 space-y-2.5">
              <span className="block h-4 w-11/12 rounded bg-navy-900" />
              <span className="block h-4 w-3/4 rounded bg-navy-900" />
              <span className="block h-2 w-full rounded bg-slate-200" />
              <span className="block h-2 w-5/6 rounded bg-slate-200" />
              <span className="mt-1 inline-block h-6 w-24 rounded-md bg-brand-600" />
            </div>
            <div className="col-span-2 aspect-square rounded-xl bg-gradient-to-br from-brand-400 via-brand-600 to-navy-800" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2 rounded-lg border border-slate-200 p-2.5">
                <span className="block h-5 w-5 rounded bg-brand-100" />
                <span className="block h-2 w-4/5 rounded bg-slate-300" />
                <span className="block h-1.5 w-full rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dashboard card */}
      <div className="card absolute -bottom-10 -left-12 hidden w-64 p-4 sm:block">
        <div className="flex items-center justify-between">
          <span className="h-2 w-16 rounded bg-slate-300" />
          <span className="badge bg-emerald-50 text-[10px] text-emerald-700">Dashboard</span>
        </div>
        <svg viewBox="0 0 200 70" className="mt-3 w-full">
          <defs>
            <linearGradient id="hv-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#3a68f2" stopOpacity=".35" />
              <stop offset="1" stopColor="#3a68f2" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 55 L25 48 L50 52 L75 35 L100 40 L125 22 L150 28 L175 12 L200 16 L200 70 L0 70Z" fill="url(#hv-fill)" />
          <path d="M0 55 L25 48 L50 52 L75 35 L100 40 L125 22 L150 28 L175 12 L200 16" fill="none" stroke="#2550dc" strokeWidth="2.5" />
        </svg>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {['bg-navy-900', 'bg-brand-500', 'bg-navy-300'].map((c) => (
            <span key={c} className={`h-8 rounded ${c}`} />
          ))}
        </div>
      </div>

      {/* Resource file cards */}
      <div className="absolute -right-10 -top-8 hidden w-44 space-y-2 sm:block">
        {[
          ['ZIP', 'Website kit', 'bg-brand-600'],
          ['XLSX', 'Finance tracker', 'bg-emerald-600'],
          ['DOCS', 'Setup guide', 'bg-navy-800'],
        ].map(([ext, name, color]) => (
          <div key={ext} className="card flex items-center gap-2.5 p-2.5">
            <span className={`grid h-8 w-8 place-items-center rounded-md text-[9px] font-bold text-white ${color}`}>{ext}</span>
            <span className="text-xs font-semibold text-navy-900">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
