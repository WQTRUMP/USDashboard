import type { PropsWithChildren } from 'react';

const navItems = ['总览', '市场', '宏观指标', '行业', '成分股变动', '事件日历', '提醒中心', '报告', '数据中心', '设置'];

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">US</div>
        <nav>
          {navItems.map((item) => (
            <button
              key={item}
              className={`nav-item${item === '成分股变动' ? ' active' : ''}`}
              type="button"
            >
              <span className="nav-dot" />
              {item}
            </button>
          ))}
        </nav>
        <button className="collapse-btn" type="button">
          收起
        </button>
      </aside>
      <main className="page-content">{children}</main>
    </div>
  );
}
