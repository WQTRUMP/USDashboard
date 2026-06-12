import { createEventFromAnnouncement, detectSnapshotChange } from '../lib/constituentAlerts';
import type { ConstituentEvent } from '../types';

export const DASHBOARD_NOW = '2026-06-12T21:30:00Z';

const scheduledNasdaq = createEventFromAnnouncement(
  {
    id: 'ndx-2026-07-rebalance',
    indexCode: 'NDX',
    indexName: 'Nasdaq-100',
    announcementDate: '2026-06-10T13:00:00Z',
    effectiveDate: '2026-07-24T13:30:00Z',
    sourceUrl:
      'https://ir.nasdaq.com/news-releases/news-release-details/annual-changes-nasdaq-100-indexr-2',
    note: '年度重构预告，数据基于官方公告样例与样板展示。',
    items: [
      { ticker: 'APP', companyName: 'AppLovin Corp.', action: 'add', sector: '软件', reason: '市值与流动性满足纳入标准' },
      { ticker: 'CRWD', companyName: 'CrowdStrike Holdings, Inc.', action: 'add', sector: '软件', reason: '市值与流动性满足纳入标准' },
      { ticker: 'DASH', companyName: 'DoorDash, Inc.', action: 'add', sector: '可选消费', reason: '市值与流动性满足纳入标准' },
      { ticker: 'MDB', companyName: 'MongoDB, Inc.', action: 'add', sector: '软件', reason: '市值与流动性满足纳入标准' },
      { ticker: 'SHOP', companyName: 'Shopify Inc.', action: 'add', sector: '软件', reason: '市值与流动性满足纳入标准' },
      { ticker: 'TTD', companyName: 'The Trade Desk, Inc.', action: 'add', sector: '媒体', reason: '市值与流动性满足纳入标准' },
      { ticker: 'BIIB', companyName: 'Biogen Inc.', action: 'remove', sector: '医疗', reason: '年度重构移出' },
      { ticker: 'DLTR', companyName: 'Dollar Tree, Inc.', action: 'remove', sector: '可选消费', reason: '年度重构移出' },
      { ticker: 'EA', companyName: 'Electronic Arts Inc.', action: 'remove', sector: '通信服务', reason: '年度重构移出' },
      { ticker: 'ILMN', companyName: 'Illumina, Inc.', action: 'remove', sector: '医疗', reason: '年度重构移出' },
      { ticker: 'LULU', companyName: 'Lululemon Athletica Inc.', action: 'remove', sector: '可选消费', reason: '年度重构移出' },
      { ticker: 'WDAY', companyName: 'Workday, Inc.', action: 'remove', sector: '软件', reason: '年度重构移出' }
    ]
  },
  DASHBOARD_NOW
);

const effectiveTodaySpx = createEventFromAnnouncement(
  {
    id: 'spx-2026-06-12-effective',
    indexCode: 'SPX',
    indexName: 'S&P 500',
    announcementDate: '2026-06-10T12:00:00Z',
    effectiveDate: '2026-06-12T13:30:00Z',
    sourceUrl:
      'https://press.spglobal.com/2026-05-27-FedEx-Freight-Holding-Company-Set-to-Join-S-P-500-EPAM-Systems-and-Dave-to-Join-S-P-SmallCap-600',
    validationSourceUrl:
      'https://www.ssga.com/us/en/intermediary/etfs/state-street-spdr-sp-500-etf-trust-spy',
    note: '样板首页突出展示今日生效事件，来源链接保留官方新闻稿。',
    items: [
      {
        ticker: 'FDXF',
        companyName: 'FedEx Freight Holding Company',
        action: 'add',
        sector: '工业',
        reason: 'S&P Dow Jones 指数调整'
      },
      {
        ticker: 'EPAM',
        companyName: 'EPAM Systems, Inc.',
        action: 'remove',
        sector: '信息技术',
        reason: 'S&P Dow Jones 指数调整'
      }
    ]
  },
  DASHBOARD_NOW
);

const confirmedSpx = {
  ...createEventFromAnnouncement(
    {
      id: 'spx-2026-06-02-confirmed',
      indexCode: 'SPX',
      indexName: 'S&P 500',
      announcementDate: '2026-05-27T12:00:00Z',
      effectiveDate: '2026-06-02T13:30:00Z',
      sourceUrl:
        'https://press.spglobal.com/2026-05-27-FedEx-Freight-Holding-Company-Set-to-Join-S-P-500-EPAM-Systems-and-Dave-to-Join-S-P-SmallCap-600',
      validationSourceUrl:
        'https://www.ssga.com/us/en/intermediary/etfs/state-street-spdr-sp-500-etf-trust-spy',
      items: [
        {
          ticker: 'FDXF',
          companyName: 'FedEx Freight Holding Company',
          action: 'add',
          sector: '工业',
          reason: 'S&P Dow Jones 指数调整'
        },
        {
          ticker: 'EPAM',
          companyName: 'EPAM Systems, Inc.',
          action: 'remove',
          sector: '信息技术',
          reason: 'S&P Dow Jones 指数调整'
        }
      ]
    },
    DASHBOARD_NOW
  ),
  confirmedAt: '2026-06-02T20:00:00Z',
  status: 'effective_confirmed' as const
};

const fallbackEvent =
  detectSnapshotChange(
    {
      indexCode: 'SPX',
      indexName: 'S&P 500',
      previousTickers: ['AAPL', 'MSFT', 'AMZN', 'DAVE'],
      nextTickers: ['AAPL', 'MSFT', 'AMZN', 'FDXF'],
      discoveredAt: '2026-03-20T21:00:00Z',
      effectiveDate: '2026-03-20T21:00:00Z',
      sourceUrl: 'https://www.spglobal.com/spdji/en/indices/equity/sp-500/',
      validationSourceUrl:
        'https://www.ssga.com/us/en/intermediary/etfs/state-street-spdr-sp-500-etf-trust-spy',
      note: '根据官方成分股快照差异检测到调整，公告源暂未抓取到。'
    },
    DASHBOARD_NOW
  ) ?? undefined;

const staleNasdaq = {
  ...createEventFromAnnouncement(
    {
      id: 'ndx-2025-12-rebalance',
      indexCode: 'NDX',
      indexName: 'Nasdaq-100',
      announcementDate: '2024-05-12T13:00:00Z',
      effectiveDate: '2024-05-22T13:30:00Z',
      sourceUrl:
        'https://ir.nasdaq.com/news-releases/news-release-details/annual-changes-nasdaq-100-indexr-2',
      items: [
        { ticker: 'PLTR', companyName: 'Palantir Technologies Inc.', action: 'add', sector: '软件', reason: '年度重构纳入' },
        { ticker: 'MSTR', companyName: 'MicroStrategy Incorporated', action: 'add', sector: '软件', reason: '年度重构纳入' },
        { ticker: 'ARM', companyName: 'Arm Holdings plc', action: 'add', sector: '半导体', reason: '年度重构纳入' },
        { ticker: 'ENPH', companyName: 'Enphase Energy, Inc.', action: 'remove', sector: '工业', reason: '年度重构移出' },
        { ticker: 'LCID', companyName: 'Lucid Group, Inc.', action: 'remove', sector: '可选消费', reason: '年度重构移出' },
        { ticker: 'ZM', companyName: 'Zoom Communications, Inc.', action: 'remove', sector: '软件', reason: '年度重构移出' }
      ]
    },
    DASHBOARD_NOW
  ),
  confirmedAt: '2024-05-23T21:00:00Z',
  status: 'effective_confirmed' as const
};

const staleSpx = {
  ...createEventFromAnnouncement(
    {
      id: 'spx-2025-09-05',
      indexCode: 'SPX',
      indexName: 'S&P 500',
      announcementDate: '2024-05-01T12:00:00Z',
      effectiveDate: '2024-05-05T13:30:00Z',
      sourceUrl: 'https://www.spglobal.com/spdji/en/',
      items: [
        {
          ticker: 'XYZ',
          companyName: 'Example Holdings, Inc.',
          action: 'add',
          sector: '工业',
          reason: '历史样例'
        }
      ]
    },
    DASHBOARD_NOW
  ),
  confirmedAt: '2024-05-08T21:00:00Z',
  status: 'stale' as const
};

export const seededEvents: ConstituentEvent[] = [
  effectiveTodaySpx,
  scheduledNasdaq,
  confirmedSpx,
  ...(fallbackEvent ? [fallbackEvent] : []),
  staleNasdaq,
  staleSpx
];

export const emptyEvents: ConstituentEvent[] = [];
