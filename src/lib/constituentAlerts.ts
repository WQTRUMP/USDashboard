import type {
  AnnouncementInput,
  ConstituentEvent,
  EventStatus,
  SnapshotInput
} from '../types';

const PRIORITY: Record<EventStatus, number> = {
  effective_today: 0,
  scheduled: 1,
  effective_confirmed: 2,
  fallback_detected: 3,
  stale: 4
};

const isoDay = (value?: string) => (value ? value.slice(0, 10) : '');

export const makeDedupeKey = (event: ConstituentEvent) => {
  const added = event.items
    .filter((item) => item.action === 'add')
    .map((item) => item.ticker)
    .sort()
    .join(',');
  const removed = event.items
    .filter((item) => item.action === 'remove')
    .map((item) => item.ticker)
    .sort()
    .join(',');

  return [event.indexCode, isoDay(event.effectiveDate), added, removed].join('|');
};

export const countItems = (event: ConstituentEvent) => ({
  added: event.items.filter((item) => item.action === 'add').length,
  removed: event.items.filter((item) => item.action === 'remove').length
});

export const deriveEventStatus = (
  event: ConstituentEvent,
  nowIso: string
): EventStatus => {
  if (event.status === 'fallback_detected') {
    return 'fallback_detected';
  }

  const today = isoDay(nowIso);
  const effectiveDay = isoDay(event.effectiveDate);
  const discoveredDay = isoDay(event.discoveredAt);

  if (effectiveDay && effectiveDay === today) {
    return 'effective_today';
  }

  if (effectiveDay && effectiveDay > today) {
    return 'scheduled';
  }

  if (effectiveDay && effectiveDay < today) {
    return 'stale';
  }

  if (event.confirmedAt) {
    return 'effective_confirmed';
  }

  if (discoveredDay === today) {
    return 'effective_today';
  }

  return 'scheduled';
};

export const summarizeEvent = (event: ConstituentEvent, nowIso: string) => {
  const status = deriveEventStatus(event, nowIso);
  const counts = countItems(event);
  const dateLabel = event.effectiveDate
    ? isoDay(event.effectiveDate)
    : isoDay(event.discoveredAt);

  if (status === 'effective_today') {
    return `${event.indexName} 成分股调整今日生效：+${counts.added} / -${counts.removed}`;
  }

  if (status === 'scheduled') {
    return `${event.indexName} 将于 ${dateLabel} 生效 ${counts.added} 进 ${counts.removed} 出`;
  }

  if (status === 'effective_confirmed') {
    return `${event.indexName} 成分股调整已确认落地`;
  }

  if (status === 'fallback_detected') {
    return `${event.indexName} 根据官方快照差异检测到调整`;
  }

  return `${event.indexName} 历史成分股调整`;
};

export const sortEvents = (events: ConstituentEvent[], nowIso: string) =>
  [...events].sort((left, right) => {
    const leftStatus = deriveEventStatus(left, nowIso);
    const rightStatus = deriveEventStatus(right, nowIso);

    if (PRIORITY[leftStatus] !== PRIORITY[rightStatus]) {
      return PRIORITY[leftStatus] - PRIORITY[rightStatus];
    }

    return (right.effectiveDate ?? right.discoveredAt).localeCompare(
      left.effectiveDate ?? left.discoveredAt
    );
  });

export const selectFeaturedEvent = (events: ConstituentEvent[], nowIso: string) =>
  sortEvents(
    events.filter((event) => event.sourceUrl),
    nowIso
  )[0];

export const createEventFromAnnouncement = (
  input: AnnouncementInput,
  nowIso: string
): ConstituentEvent => {
  const event: ConstituentEvent = {
    ...input,
    discoveredAt: input.announcementDate,
    sourceType: 'official_announcement',
    confidenceScore: 0.92
  };

  return {
    ...event,
    status: deriveEventStatus(event, nowIso),
    summaryText: summarizeEvent(event, nowIso)
  };
};

export const detectSnapshotChange = (
  input: SnapshotInput,
  nowIso: string
): ConstituentEvent | null => {
  const previous = new Set(input.previousTickers);
  const next = new Set(input.nextTickers);

  const added = input.nextTickers
    .filter((ticker) => !previous.has(ticker))
    .map((ticker) => ({
      ticker,
      companyName: ticker,
      action: 'add' as const,
      sector: '--',
      reason: '官方公告未披露',
      note: '由官方成分股快照差异检测'
    }));
  const removed = input.previousTickers
    .filter((ticker) => !next.has(ticker))
    .map((ticker) => ({
      ticker,
      companyName: ticker,
      action: 'remove' as const,
      sector: '--',
      reason: '官方公告未披露',
      note: '由官方成分股快照差异检测'
    }));

  if (added.length === 0 && removed.length === 0) {
    return null;
  }

  const event: ConstituentEvent = {
    id: `${input.indexCode}-${isoDay(input.discoveredAt)}-fallback`,
    indexCode: input.indexCode,
    indexName: input.indexName,
    effectiveDate: input.effectiveDate,
    discoveredAt: input.discoveredAt,
    sourceType: 'official_snapshot',
    sourceUrl: input.sourceUrl,
    validationSourceUrl: input.validationSourceUrl,
    note: input.note,
    confidenceScore: 0.72,
    items: [...added, ...removed],
    status: 'fallback_detected'
  };

  return {
    ...event,
    summaryText: summarizeEvent(event, nowIso)
  };
};

export const upsertConfirmedEvent = (
  events: ConstituentEvent[],
  updatedEvent: ConstituentEvent
) => {
  const updatedKey = makeDedupeKey(updatedEvent);
  let didUpdate = false;

  const nextEvents = events.map((event) => {
    if (makeDedupeKey(event) !== updatedKey) {
      return event;
    }

    didUpdate = true;
    return {
      ...event,
      ...updatedEvent,
      items: updatedEvent.items
    };
  });

  if (!didUpdate) {
    nextEvents.push(updatedEvent);
  }

  return nextEvents;
};
