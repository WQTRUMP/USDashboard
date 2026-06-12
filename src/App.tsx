import { useMemo, useState } from 'react';
import { AppShell } from './components/AppShell';
import { DASHBOARD_NOW, seededEvents } from './data/constituentEvents';
import { countItems, deriveEventStatus, selectFeaturedEvent, sortEvents, summarizeEvent } from './lib/constituentAlerts';
import type { ConstituentEvent, EventStatus } from './types';

const statusLabel: Record<EventStatus, string> = {
  scheduled: '预告',
  effective_today: '今日生效',
  effective_confirmed: '已确认',
  fallback_detected: '回退发现',
  stale: '已过期'
};

const filters = [
  { key: 'all', label: '全部' },
  { key: 'NDX', label: 'Nasdaq-100' },
  { key: 'SPX', label: 'S&P 500' }
] as const;

const stateFilters = [
  { key: 'all', label: '全部状态' },
  { key: 'scheduled', label: '预告' },
  { key: 'effective_today', label: '今日生效' },
  { key: 'effective_confirmed', label: '已确认' },
  { key: 'fallback_detected', label: '回退发现' }
] as const;

const dateText = (value?: string) => (value ? value.slice(0, 10) : '--');

function StatusPill({ status }: { status: EventStatus }) {
  return <span className={`status-pill ${status}`}>{statusLabel[status]}</span>;
}

function SummaryCard({
  title,
  event,
  onSelect,
  selected
}: {
  title: string;
  event?: ConstituentEvent;
  onSelect: (event: ConstituentEvent) => void;
  selected: boolean;
}) {
  if (!event) {
    return (
      <section className="summary-card empty">
        <div className="empty-icon" />
        <h3>暂无新的成分股调整</h3>
        <p>请关注预告与历史记录获取最新信息。</p>
      </section>
    );
  }

  const status = deriveEventStatus(event, DASHBOARD_NOW);
  const counts = countItems(event);

  return (
    <button
      className={`summary-card${selected ? ' selected' : ''}`}
      onClick={() => onSelect(event)}
      type="button"
    >
      <div className="card-topline">
        <h3>{title}</h3>
        <StatusPill status={status} />
      </div>
      <p className="event-kicker">{status === 'scheduled' ? '年度重构预告' : '最近一次调整'}</p>
      <p className="event-summary">{summarizeEvent(event, DASHBOARD_NOW)}</p>
      <div className="card-metrics">
        <span className="metric positive">新增 {counts.added}</span>
        <span className="metric negative">移出 {counts.removed}</span>
      </div>
      <p className="event-date">
        {status === 'scheduled' ? '预计生效日期' : '变动日期'} {dateText(event.effectiveDate)}
      </p>
      <span className="card-action">查看详情</span>
    </button>
  );
}

function DetailPanel({ event }: { event: ConstituentEvent }) {
  const status = deriveEventStatus(event, DASHBOARD_NOW);
  const adds = event.items.filter((item) => item.action === 'add');
  const removes = event.items.filter((item) => item.action === 'remove');

  return (
    <aside className="detail-panel">
      <div className="detail-header">
        <div>
          <h2>{event.indexName} 成分股变动详情</h2>
          <div className="detail-meta">
            <StatusPill status={status} />
            <span>{dateText(event.effectiveDate)} 生效</span>
          </div>
        </div>
        <button type="button" className="icon-btn">
          ×
        </button>
      </div>

      <div className="detail-counts">
        <span className="metric positive">新增 {adds.length} 家</span>
        <span className="metric negative">移出 {removes.length} 家</span>
      </div>

      <section className="detail-section">
        <h3>新增成分股 ({adds.length})</h3>
        {adds.map((item) => (
          <article className="detail-row" key={`${item.action}-${item.ticker}`}>
            <div>
              <strong>{item.ticker}</strong>
              <p>{item.companyName}</p>
            </div>
            <div>
              <span>{item.sector ?? '--'}</span>
              <p>{item.reason ?? '官方公告未披露'}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="detail-section">
        <h3>移出成分股 ({removes.length})</h3>
        {removes.map((item) => (
          <article className="detail-row" key={`${item.action}-${item.ticker}`}>
            <div>
              <strong>{item.ticker}</strong>
              <p>{item.companyName}</p>
            </div>
            <div>
              <span>{item.sector ?? '--'}</span>
              <p>{item.reason ?? '官方公告未披露'}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="source-card">
        <p>公告时间：{dateText(event.announcementDate)}</p>
        <p>发现时间：{dateText(event.discoveredAt)}</p>
        <p>确认时间：{dateText(event.confirmedAt)}</p>
        <p>备注：{event.note ?? '官方公告未披露'}</p>
        {event.sourceUrl ? (
          <a href={event.sourceUrl} target="_blank" rel="noreferrer">
            官方来源
          </a>
        ) : null}
        {event.validationSourceUrl ? (
          <a href={event.validationSourceUrl} target="_blank" rel="noreferrer">
            校验来源
          </a>
        ) : null}
      </section>
    </aside>
  );
}

export default function App({
  events = seededEvents
}: {
  events?: ConstituentEvent[];
}) {
  const [indexFilter, setIndexFilter] = useState<(typeof filters)[number]['key']>('all');
  const [statusFilter, setStatusFilter] = useState<(typeof stateFilters)[number]['key']>('all');
  const [bannerOpen, setBannerOpen] = useState(true);

  const filteredEvents = useMemo(() => {
    return sortEvents(events, DASHBOARD_NOW).filter((event) => {
      const derivedStatus = deriveEventStatus(event, DASHBOARD_NOW);
      const indexMatch = indexFilter === 'all' || event.indexCode === indexFilter;
      const statusMatch = statusFilter === 'all' || derivedStatus === statusFilter;
      return indexMatch && statusMatch;
    });
  }, [events, indexFilter, statusFilter]);

  const byIndex = useMemo(
    () => ({
      NDX: sortEvents(
        events.filter((event) => event.indexCode === 'NDX'),
        DASHBOARD_NOW
      )[0],
      SPX: sortEvents(
        events.filter((event) => event.indexCode === 'SPX'),
        DASHBOARD_NOW
      )[0]
    }),
    [events]
  );

  const fallbackSelection =
    filteredEvents[0] ?? byIndex.SPX ?? byIndex.NDX ?? events[0];
  const [selectedId, setSelectedId] = useState<string | undefined>(fallbackSelection?.id);

  const featuredEvent = selectFeaturedEvent(events, DASHBOARD_NOW);
  const selectedEvent =
    filteredEvents.find((event) => event.id === selectedId) ??
    events.find((event) => event.id === selectedId) ??
    fallbackSelection;

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">美股宏观仪表盘</p>
          <h1>成分股变动提醒</h1>
        </div>
        <div className="header-meta">
          <span>最后校验时间 {DASHBOARD_NOW.replace('T', ' ').replace(':00Z', ' UTC')}</span>
        </div>
      </header>

      {featuredEvent && bannerOpen ? (
        <section className={`banner ${deriveEventStatus(featuredEvent, DASHBOARD_NOW)}`}>
          <div className="banner-icon">!</div>
          <div className="banner-copy">
            <h2>{summarizeEvent(featuredEvent, DASHBOARD_NOW)}</h2>
            <p>
              {featuredEvent.indexName} 涉及 {countItems(featuredEvent).added} 家新增与{' '}
              {countItems(featuredEvent).removed} 家移出，最近发现于 {dateText(featuredEvent.discoveredAt)}。
            </p>
          </div>
          <button
            className="banner-cta"
            onClick={() => setSelectedId(featuredEvent.id)}
            type="button"
          >
            查看详情
          </button>
          <button
            className="icon-btn"
            onClick={() => setBannerOpen(false)}
            type="button"
          >
            ×
          </button>
        </section>
      ) : null}

      <section className="overview-section">
        <div className="section-title">
          <h2>今日概览</h2>
        </div>
        <div className="summary-grid">
          <SummaryCard
            title="Nasdaq-100"
            event={byIndex.NDX}
            onSelect={(event) => setSelectedId(event.id)}
            selected={selectedId === byIndex.NDX?.id}
          />
          <SummaryCard
            title="S&P 500"
            event={byIndex.SPX}
            onSelect={(event) => setSelectedId(event.id)}
            selected={selectedId === byIndex.SPX?.id}
          />
          <SummaryCard
            title="空状态"
            onSelect={() => undefined}
            selected={false}
          />
        </div>
      </section>

      <div className="content-grid">
        <section className="history-panel">
          <div className="section-title">
            <h2>历史变动</h2>
            <div className="filters">
              <select value={indexFilter} onChange={(event) => setIndexFilter(event.target.value as 'all' | 'NDX' | 'SPX')}>
                {filters.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as (typeof stateFilters)[number]['key']
                  )
                }
              >
                {stateFilters.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="empty-history" data-testid="empty-state">
              <h3>最近 24 个月未检测到已记录的指数成分股调整事件</h3>
              <p>系统将在抓到官方公告或快照变更后自动显示提醒。</p>
            </div>
          ) : (
            <div className="history-table">
              <div className="history-row header">
                <span>生效日期</span>
                <span>指数</span>
                <span>变动摘要</span>
                <span>状态</span>
                <span>官方来源</span>
                <span>操作</span>
              </div>
              {filteredEvents.map((event) => {
                const status = deriveEventStatus(event, DASHBOARD_NOW);
                const counts = countItems(event);
                return (
                  <button
                    className={`history-row${selectedId === event.id ? ' selected' : ''}`}
                    key={event.id}
                    onClick={() => setSelectedId(event.id)}
                    type="button"
                  >
                    <span>{dateText(event.effectiveDate)}</span>
                    <span>{event.indexName}</span>
                    <span>
                      +{counts.added} / -{counts.removed}
                    </span>
                    <span>
                      <StatusPill status={status} />
                    </span>
                    <span>
                      {event.sourceUrl ? (
                        <a href={event.sourceUrl} target="_blank" rel="noreferrer" onClick={(clickEvent) => clickEvent.stopPropagation()}>
                          官方来源
                        </a>
                      ) : (
                        '--'
                      )}
                    </span>
                    <span>查看详情</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {selectedEvent ? <DetailPanel event={selectedEvent} /> : null}
      </div>
    </AppShell>
  );
}
