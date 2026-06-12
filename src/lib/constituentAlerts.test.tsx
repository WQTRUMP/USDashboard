import { render, screen } from '@testing-library/react';
import App from '../App';
import { DASHBOARD_NOW } from '../data/constituentEvents';
import type { ConstituentEvent } from '../types';
import {
  createEventFromAnnouncement,
  detectSnapshotChange,
  deriveEventStatus,
  getHistoryWindowStartDay,
  isEventWithinHistoryWindow,
  makeDedupeKey,
  upsertConfirmedEvent
} from './constituentAlerts';

describe('constituent alert logic', () => {
  it('creates a scheduled S&P event from an official announcement', () => {
    const event = createEventFromAnnouncement(
      {
        id: 'spx-scheduled',
        indexCode: 'SPX',
        indexName: 'S&P 500',
        announcementDate: '2026-05-27T12:00:00Z',
        effectiveDate: '2026-06-02T13:30:00Z',
        sourceUrl:
          'https://press.spglobal.com/2026-05-27-FedEx-Freight-Holding-Company-Set-to-Join-S-P-500-EPAM-Systems-and-Dave-to-Join-S-P-SmallCap-600',
        items: [
          { ticker: 'FDXF', companyName: 'FedEx Freight Holding Company', action: 'add' },
          { ticker: 'EPAM', companyName: 'EPAM Systems, Inc.', action: 'remove' }
        ]
      },
      '2026-05-28T00:00:00Z'
    );

    expect(event.status).toBe('scheduled');
    expect(event.effectiveDate).toBe('2026-06-02T13:30:00Z');
    expect(event.items.map((item) => `${item.action}:${item.ticker}`)).toEqual([
      'add:FDXF',
      'remove:EPAM'
    ]);
  });

  it('confirms an existing event without creating a duplicate', () => {
    const original = createEventFromAnnouncement(
      {
        id: 'spx-original',
        indexCode: 'SPX',
        indexName: 'S&P 500',
        announcementDate: '2026-05-27T12:00:00Z',
        effectiveDate: '2026-06-02T13:30:00Z',
        sourceUrl: 'https://press.spglobal.com/example',
        items: [
          { ticker: 'FDXF', companyName: 'FedEx Freight Holding Company', action: 'add' },
          { ticker: 'EPAM', companyName: 'EPAM Systems, Inc.', action: 'remove' }
        ]
      },
      '2026-05-28T00:00:00Z'
    );

    const confirmed: ConstituentEvent = {
      ...original,
      confirmedAt: '2026-06-02T20:00:00Z',
      status: 'effective_confirmed',
      validationSourceUrl:
        'https://www.ssga.com/us/en/intermediary/etfs/state-street-spdr-sp-500-etf-trust-spy'
    };

    const merged = upsertConfirmedEvent([original], confirmed);

    expect(merged).toHaveLength(1);
    expect(makeDedupeKey(merged[0])).toBe(makeDedupeKey(original));
    expect(merged[0].status).toBe('effective_confirmed');
  });

  it('keeps Nasdaq annual rebalance counts at 6 additions and 6 removals', () => {
    const event = createEventFromAnnouncement(
      {
        id: 'ndx-annual',
        indexCode: 'NDX',
        indexName: 'Nasdaq-100',
        announcementDate: '2025-12-12T13:00:00Z',
        effectiveDate: '2025-12-22T13:30:00Z',
        sourceUrl:
          'https://ir.nasdaq.com/news-releases/news-release-details/annual-changes-nasdaq-100-indexr-2',
        items: [
          { ticker: 'A', companyName: 'A', action: 'add' },
          { ticker: 'B', companyName: 'B', action: 'add' },
          { ticker: 'C', companyName: 'C', action: 'add' },
          { ticker: 'D', companyName: 'D', action: 'add' },
          { ticker: 'E', companyName: 'E', action: 'add' },
          { ticker: 'F', companyName: 'F', action: 'add' },
          { ticker: 'G', companyName: 'G', action: 'remove' },
          { ticker: 'H', companyName: 'H', action: 'remove' },
          { ticker: 'I', companyName: 'I', action: 'remove' },
          { ticker: 'J', companyName: 'J', action: 'remove' },
          { ticker: 'K', companyName: 'K', action: 'remove' },
          { ticker: 'L', companyName: 'L', action: 'remove' }
        ]
      },
      DASHBOARD_NOW
    );

    expect(event.items.filter((item) => item.action === 'add')).toHaveLength(6);
    expect(event.items.filter((item) => item.action === 'remove')).toHaveLength(6);
  });

  it('does not trigger on unchanged snapshots', () => {
    const event = detectSnapshotChange(
      {
        indexCode: 'SPX',
        indexName: 'S&P 500',
        previousTickers: ['AAPL', 'MSFT', 'AMZN'],
        nextTickers: ['AAPL', 'MSFT', 'AMZN'],
        discoveredAt: '2026-06-12T21:00:00Z'
      },
      DASHBOARD_NOW
    );

    expect(event).toBeNull();
  });

  it('creates a fallback event from snapshot diff', () => {
    const event = detectSnapshotChange(
      {
        indexCode: 'SPX',
        indexName: 'S&P 500',
        previousTickers: ['AAPL', 'MSFT', 'EPAM'],
        nextTickers: ['AAPL', 'MSFT', 'FDXF'],
        discoveredAt: '2026-06-12T21:00:00Z',
        sourceUrl: 'https://www.spglobal.com/spdji/en/indices/equity/sp-500/'
      },
      DASHBOARD_NOW
    );

    expect(event?.status).toBe('fallback_detected');
    expect(event?.items.map((item) => `${item.action}:${item.ticker}`)).toEqual([
      'add:FDXF',
      'remove:EPAM'
    ]);
  });

  it('renders the empty state when there are no events', () => {
    render(<App events={[]} />);

    expect(
      screen.getByText('最近 24 个月未检测到已记录的指数成分股调整事件')
    ).toBeInTheDocument();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('marks events on the current effective date as effective today', () => {
    const event = createEventFromAnnouncement(
      {
        id: 'spx-today',
        indexCode: 'SPX',
        indexName: 'S&P 500',
        announcementDate: '2026-06-10T12:00:00Z',
        effectiveDate: '2026-06-12T13:30:00Z',
        sourceUrl: 'https://press.spglobal.com/example',
        items: [
          { ticker: 'FDXF', companyName: 'FedEx Freight Holding Company', action: 'add' }
        ]
      },
      DASHBOARD_NOW
    );

    expect(deriveEventStatus(event, DASHBOARD_NOW)).toBe('effective_today');
  });

  it('marks confirmed events with past effective dates as stale', () => {
    const event: ConstituentEvent = {
      ...createEventFromAnnouncement(
        {
          id: 'spx-stale-confirmed',
          indexCode: 'SPX',
          indexName: 'S&P 500',
          announcementDate: '2024-06-07T12:00:00Z',
          effectiveDate: '2024-06-11T13:30:00Z',
          sourceUrl: 'https://www.spglobal.com/spdji/en/',
          items: [
            {
              ticker: 'XYZ',
              companyName: 'Example Holdings, Inc.',
              action: 'add'
            }
          ]
        },
        DASHBOARD_NOW
      ),
      confirmedAt: '2024-06-12T21:00:00Z',
      status: 'effective_confirmed'
    };

    expect(deriveEventStatus(event, DASHBOARD_NOW)).toBe('stale');
  });

  it('keeps confirmed events inside the 24 month window as effective_confirmed', () => {
    const event: ConstituentEvent = {
      ...createEventFromAnnouncement(
        {
          id: 'spx-boundary-confirmed',
          indexCode: 'SPX',
          indexName: 'S&P 500',
          announcementDate: '2024-06-10T12:00:00Z',
          effectiveDate: '2024-06-12T13:30:00Z',
          sourceUrl: 'https://www.spglobal.com/spdji/en/',
          items: [
            {
              ticker: 'BND',
              companyName: 'Boundary Holdings, Inc.',
              action: 'add'
            }
          ]
        },
        DASHBOARD_NOW
      ),
      confirmedAt: '2024-06-13T21:00:00Z',
      status: 'effective_confirmed'
    };

    expect(getHistoryWindowStartDay(DASHBOARD_NOW)).toBe('2024-06-12');
    expect(isEventWithinHistoryWindow(event, DASHBOARD_NOW)).toBe(true);
    expect(deriveEventStatus(event, DASHBOARD_NOW)).toBe('effective_confirmed');
  });

  it('filters the history list to the default recent 24 month window', () => {
    const boundaryEvent = createEventFromAnnouncement(
      {
        id: 'spx-window-boundary',
        indexCode: 'SPX',
        indexName: 'S&P 500',
        announcementDate: '2024-06-10T12:00:00Z',
        effectiveDate: '2024-06-12T13:30:00Z',
        sourceUrl: 'https://www.spglobal.com/spdji/en/',
        items: [
          {
            ticker: 'IN24',
            companyName: 'Inside Window Corp.',
            action: 'add'
          }
        ]
      },
      DASHBOARD_NOW
    );
    const oldEvent = createEventFromAnnouncement(
      {
        id: 'spx-window-old',
        indexCode: 'SPX',
        indexName: 'S&P 500',
        announcementDate: '2024-06-09T12:00:00Z',
        effectiveDate: '2024-06-11T13:30:00Z',
        sourceUrl: 'https://www.spglobal.com/spdji/en/',
        items: [
          {
            ticker: 'OUT24',
            companyName: 'Outside Window Corp.',
            action: 'add'
          }
        ]
      },
      DASHBOARD_NOW
    );

    expect(isEventWithinHistoryWindow(boundaryEvent, DASHBOARD_NOW)).toBe(true);
    expect(isEventWithinHistoryWindow(oldEvent, DASHBOARD_NOW)).toBe(false);

    render(<App events={[oldEvent, boundaryEvent]} />);

    expect(screen.getByText('2024-06-12')).toBeInTheDocument();
    expect(screen.queryByText('2024-06-11')).not.toBeInTheDocument();
    expect(screen.queryByText('最近 24 个月未检测到已记录的指数成分股调整事件')).not.toBeInTheDocument();
  });

  it('renders only the empty state for stale-only inputs outside the 24 month window', () => {
    const staleEvent: ConstituentEvent = {
      ...createEventFromAnnouncement(
        {
          id: 'ndx-stale-only',
          indexCode: 'NDX',
          indexName: 'Nasdaq-100',
          announcementDate: '2024-05-01T12:00:00Z',
          effectiveDate: '2024-05-10T13:30:00Z',
          sourceUrl: 'https://ir.nasdaq.com/news-releases/news-release-details/example',
          items: [
            {
              ticker: 'OLD',
              companyName: 'Old Holdings, Inc.',
              action: 'add',
              reason: 'Legacy rebalance'
            }
          ]
        },
        DASHBOARD_NOW
      ),
      confirmedAt: '2024-05-11T21:00:00Z',
      note: 'Should stay hidden outside the default window',
      status: 'effective_confirmed'
    };

    expect(deriveEventStatus(staleEvent, DASHBOARD_NOW)).toBe('stale');
    expect(isEventWithinHistoryWindow(staleEvent, DASHBOARD_NOW)).toBe(false);

    render(<App events={[staleEvent]} />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.queryByText('2024-05-10')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Nasdaq-100 成分股变动详情' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '官方来源' })).not.toBeInTheDocument();
    expect(screen.queryByText('Nasdaq-100 成分股调整已确认落地')).not.toBeInTheDocument();
  });
});
