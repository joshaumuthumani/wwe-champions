import { AlertCircle, CalendarDays, Clock3, ShieldCheck, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Champion = {
  titleName: string;
  championName: string;
  imageUrl: string;
  championshipDate: string | null;
  daysAsChampion: number | null;
  lastDefenseDate: string | null;
  daysSinceLastDefense: number | null;
  source?: {
    wweUrl?: string;
    cagematchUrl?: string;
  };
};

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; champions: Champion[]; updatedAt: string }
  | { status: 'empty' }
  | { status: 'error'; message: string };

const NO_DEFENSE = 'No Title Defenses Yet';

type ChampionCache = Champion[] | { generatedAt?: string; champions?: unknown };

function isChampion(value: unknown): value is Champion {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.titleName === 'string' && typeof item.championName === 'string';
}

function parseChampionCache(value: unknown): { champions: Champion[]; generatedAt?: string } {
  const cache = value as ChampionCache;
  const champions = Array.isArray(cache)
    ? cache
    : cache && typeof cache === 'object' && Array.isArray(cache.champions)
      ? cache.champions
      : null;

  if (!champions || !champions.every(isChampion)) {
    throw new Error('public/champions.json is not a valid champion cache.');
  }

  return {
    champions,
    generatedAt:
      !Array.isArray(cache) && typeof cache.generatedAt === 'string' ? cache.generatedAt : undefined,
  };
}

function formatValue(value: string | number | null | undefined, fallback = 'Unavailable') {
  if (value === null || value === undefined || value === '') return fallback;
  return value;
}

function formatGeneratedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Cache timestamp unavailable';

  return `Generated ${date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })} at ${date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

function formatCount(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function ChampionImage({ champion }: { champion: Champion }) {
  const [failed, setFailed] = useState(!champion.imageUrl);

  if (failed) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center bg-[radial-gradient(circle_at_50%_18%,rgba(216,167,47,0.28),transparent_34%),linear-gradient(145deg,#202024,#111113)]">
        <Trophy className="h-14 w-14 text-gold-300/80" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={champion.imageUrl}
      alt={`${champion.championName} official WWE profile headshot`}
      className="aspect-[4/3] w-full object-cover object-top"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function StatRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(6rem,auto)] items-baseline gap-4 border-t border-white/8 py-3 text-sm">
      <dt className="font-semibold text-zinc-200">{label}</dt>
      <dd className="max-w-[13rem] text-wrap text-right leading-5 text-zinc-400">
        {formatValue(value)}
      </dd>
    </div>
  );
}

function DefenseStatus({ champion }: { champion: Champion }) {
  const hasNoDefense = !champion.lastDefenseDate || champion.lastDefenseDate === NO_DEFENSE;
  const days = champion.daysSinceLastDefense;
  const tone = hasNoDefense
    ? 'border-amber-300/20 bg-amber-300/10 text-amber-100'
    : days !== null && days >= 30
      ? 'border-red-300/20 bg-red-300/10 text-red-100'
      : 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100';
  const label = hasNoDefense
    ? 'No defenses'
    : days !== null && days >= 30
      ? 'Defense due'
      : 'Recently defended';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${tone}`}>
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

function ChampionCard({ champion }: { champion: Champion }) {
  const lastDefense = champion.lastDefenseDate || NO_DEFENSE;
  const daysSinceDefense =
    lastDefense === NO_DEFENSE ? NO_DEFENSE : formatValue(champion.daysSinceLastDefense);

  return (
    <article className="group overflow-hidden rounded-lg border border-white/10 bg-ink-850 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-white/20">
      <ChampionImage champion={champion} />
      <div className="space-y-5 p-4">
        <div className="space-y-3">
          <DefenseStatus champion={champion} />
          <h2 className="min-h-6 text-pretty text-base font-semibold leading-6 text-zinc-100">
            {champion.titleName}
          </h2>
          <p className="text-balance text-2xl font-semibold leading-tight text-white">
            {champion.championName}
          </p>
        </div>

        <dl>
          <StatRow label="Championship Date" value={champion.championshipDate} />
          <StatRow label="Days as Champion" value={champion.daysAsChampion} />
          <StatRow label="Last Defense Date" value={lastDefense} />
          <StatRow label="Days Since Last Defense" value={daysSinceDefense} />
        </dl>
      </div>
    </article>
  );
}

function LoadingSkeleton() {
  return (
    <section
      aria-label="Loading current champions"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <article
          className="overflow-hidden rounded-lg border border-white/10 bg-ink-850 shadow-card"
          key={index}
        >
          <div className="aspect-[4/3] animate-pulse bg-ink-800" />
          <div className="space-y-5 p-4">
            <div className="space-y-3">
              <div className="h-7 w-28 animate-pulse rounded-md bg-white/10" />
              <div className="h-5 w-3/4 animate-pulse rounded-md bg-white/10" />
              <div className="h-7 w-2/3 animate-pulse rounded-md bg-white/10" />
            </div>
            <div className="space-y-3 border-t border-white/8 pt-3">
              <div className="h-4 animate-pulse rounded-md bg-white/10" />
              <div className="h-4 animate-pulse rounded-md bg-white/10" />
              <div className="h-4 animate-pulse rounded-md bg-white/10" />
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function StatusPanel({ state }: { state: Exclude<LoadState, { status: 'ready' }> }) {
  if (state.status === 'loading') return <LoadingSkeleton />;

  const copy = {
    empty: {
      title: 'No champions found',
      message: 'Run the scraper to populate public/champions.json.',
    },
    error: {
      title: 'Could not load champions',
      message: state.status === 'error' ? state.message : 'The cache could not be read.',
    },
  }[state.status];

  return (
    <div className="rounded-lg border border-white/10 bg-ink-850 p-6 text-zinc-300">
      <div className="mb-3 flex items-center gap-3 text-white">
        <AlertCircle className="h-5 w-5 text-gold-300" aria-hidden="true" />
        <h2 className="text-lg font-semibold">{copy.title}</h2>
      </div>
      <p>{copy.message}</p>
    </div>
  );
}

export function App() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function loadChampions() {
      try {
        const response = await fetch('/champions.json', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Cache request failed with HTTP ${response.status}.`);
        }

        const data: unknown = await response.json();
        const cache = parseChampionCache(data);

        if (!cancelled) {
          const lastModified = response.headers.get('last-modified') || new Date().toISOString();
          const updatedAt = cache.generatedAt || lastModified;
          setState(
            cache.champions.length > 0
              ? { status: 'ready', champions: cache.champions, updatedAt }
              : { status: 'empty' },
          );
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unexpected cache parsing error.',
          });
        }
      }
    }

    loadChampions();
    return () => {
      cancelled = true;
    };
  }, []);

  const championCount = state.status === 'ready' ? state.champions.length : 0;
  const noDefenseCount =
    state.status === 'ready'
      ? state.champions.filter(
          (champion) => !champion.lastDefenseDate || champion.lastDefenseDate === NO_DEFENSE,
        ).length
      : 0;
  const longDefenseGapCount =
    state.status === 'ready'
      ? state.champions.filter(
          (champion) =>
            champion.daysSinceLastDefense !== null && champion.daysSinceLastDefense >= 30,
        ).length
      : 0;
  const subtitle = useMemo(() => {
    if (state.status !== 'ready') return 'Local cache driven champion intelligence';
    return `${championCount} active championship ${championCount === 1 ? 'record' : 'records'}`;
  }, [championCount, state.status]);
  const lastUpdated = state.status === 'ready' ? formatGeneratedAt(state.updatedAt) : 'Generating cache view';

  return (
    <main className="min-h-screen bg-ink-950 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm font-medium text-zinc-400">
              <CalendarDays className="h-3.5 w-3.5 text-gold-300" aria-hidden="true" />
              {lastUpdated}
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-normal text-white sm:text-4xl">
                WWE Champions
              </h1>
              <p className="mt-2 text-sm text-zinc-400 sm:text-base">{subtitle}</p>
            </div>
          </div>
          {state.status === 'ready' ? (
            <div className="grid grid-cols-1 gap-2 text-sm text-zinc-300 sm:grid-cols-3 lg:min-w-[32rem]">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Trophy className="h-4 w-4 text-gold-300" aria-hidden="true" />
                  Titles
                </div>
                <p className="mt-1 font-semibold text-white">{formatCount(championCount, 'record')}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center gap-2 text-zinc-500">
                  <ShieldCheck className="h-4 w-4 text-amber-200" aria-hidden="true" />
                  No defenses
                </div>
                <p className="mt-1 font-semibold text-white">{formatCount(noDefenseCount, 'title')}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Clock3 className="h-4 w-4 text-red-200" aria-hidden="true" />
                  30+ day gaps
                </div>
                <p className="mt-1 font-semibold text-white">{formatCount(longDefenseGapCount, 'title')}</p>
              </div>
            </div>
          ) : null}
        </header>

        {state.status === 'ready' ? (
          <section
            aria-label="Current champions"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
          >
            {state.champions.map((champion) => (
              <ChampionCard key={`${champion.titleName}-${champion.championName}`} champion={champion} />
            ))}
          </section>
        ) : (
          <StatusPanel state={state} />
        )}
      </div>
    </main>
  );
}
