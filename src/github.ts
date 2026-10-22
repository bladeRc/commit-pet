// Builds a profile pet from someone's public GitHub contributions (last 12 months).

import type { CommitEvent } from "./pet/engine.js";

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  contributionCount: number;
}

export interface ProfileData {
  events: CommitEvent[];
  bornAt: number;
  topLanguage: string | null;
}

const QUERY = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar { weeks { contributionDays { date contributionCount } } }
      commitContributionsByRepository(maxRepositories: 100) {
        contributions { totalCount }
        repository { isFork primaryLanguage { name } }
      }
    }
  }
}`;

const HOUR = 3_600_000;

/**
 * GitHub only gives daily totals, so each day's contributions become commits
 * spread evenly between 09:00 and 21:00 UTC. Busy days still hit the
 * "too many commits in an hour" discount, like they would locally.
 */
export function calendarToEvents(days: CalendarDay[], lang: string | null): CommitEvent[] {
  const events: CommitEvent[] = [];
  for (const day of days) {
    const n = day.contributionCount;
    if (n <= 0) continue;
    const start = Date.parse(`${day.date}T09:00:00Z`);
    const step = (12 * HOUR) / n;
    for (let i = 0; i < n; i++) events.push({ t: Math.round(start + i * step), lang });
  }
  return events;
}

export function topLanguageOf(repos: { contributions: { totalCount: number }; repository: { isFork: boolean; primaryLanguage: { name: string } | null } }[]): string | null {
  const counts = new Map<string, number>();
  for (const r of repos) {
    const lang = r.repository.primaryLanguage?.name;
    if (!lang || r.repository.isFork) continue;
    counts.set(lang, (counts.get(lang) ?? 0) + r.contributions.totalCount);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [l, n] of counts) {
    if (n > bestN) {
      best = l;
      bestN = n;
    }
  }
  return best;
}

export async function fetchProfile(login: string, token: string): Promise<ProfileData> {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      authorization: `bearer ${token}`,
      "content-type": "application/json",
      "user-agent": "commit-pet",
    },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
  });
  if (!res.ok) throw new Error(`GitHub API returned ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as {
    data?: { user: { contributionsCollection: any } | null };
    errors?: { message: string }[];
  };
  if (body.errors?.length) throw new Error(`GitHub API error: ${body.errors.map((e) => e.message).join("; ")}`);
  const collection = body.data?.user?.contributionsCollection;
  if (!collection) throw new Error(`GitHub user not found: ${login}`);

  const days: CalendarDay[] = collection.contributionCalendar.weeks.flatMap(
    (w: { contributionDays: CalendarDay[] }) => w.contributionDays,
  );
  const topLanguage = topLanguageOf(collection.commitContributionsByRepository);
  const events = calendarToEvents(days, topLanguage);
  const firstDay = days[0]?.date;
  return {
    events,
    bornAt: events[0]?.t ?? (firstDay ? Date.parse(`${firstDay}T00:00:00Z`) : Date.now()),
    topLanguage,
  };
}
