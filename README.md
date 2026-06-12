# 美股宏观仪表盘

基于 `Vite + React + TypeScript` 的静态仪表盘重建版本，首页实现纳指 / 标普成分股变动提醒模块，包含：

- 顶部提醒条
- 指数摘要卡
- 历史变动列表
- 详情侧栏
- 官方公告解析与官方快照 diff 逻辑样例

## 本地运行

```bash
npm install
npm run dev
```

## 验证

```bash
npm run test
npm run build
```

## 数据说明

- 首页展示数据位于 `src/data/constituentEvents.ts`
- 事件状态机、去重、回退检测位于 `src/lib/constituentAlerts.ts`
- 当前为绿地接管重建版本，保留 `origin` 绑定到 `WQTRUMP/USDashboard`
