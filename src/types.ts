export type IndexCode = 'NDX' | 'SPX';

export type EventStatus =
  | 'scheduled'
  | 'effective_today'
  | 'effective_confirmed'
  | 'fallback_detected'
  | 'stale';

export type ChangeAction = 'add' | 'remove';

export interface ChangeItem {
  ticker: string;
  companyName: string;
  action: ChangeAction;
  sector?: string;
  reason?: string;
  note?: string;
}

export interface ConstituentEvent {
  id: string;
  indexCode: IndexCode;
  indexName: string;
  announcementDate?: string;
  effectiveDate?: string;
  discoveredAt: string;
  confirmedAt?: string;
  status?: EventStatus;
  sourceType: 'official_announcement' | 'official_snapshot' | 'etf_validation' | 'backfill';
  sourceUrl?: string;
  validationSourceUrl?: string;
  note?: string;
  summaryText?: string;
  confidenceScore: number;
  items: ChangeItem[];
}

export interface SnapshotInput {
  indexCode: IndexCode;
  indexName: string;
  previousTickers: string[];
  nextTickers: string[];
  discoveredAt: string;
  effectiveDate?: string;
  sourceUrl?: string;
  validationSourceUrl?: string;
  note?: string;
}

export interface AnnouncementInput {
  id: string;
  indexCode: IndexCode;
  indexName: string;
  announcementDate: string;
  effectiveDate: string;
  sourceUrl: string;
  validationSourceUrl?: string;
  note?: string;
  items: ChangeItem[];
}
