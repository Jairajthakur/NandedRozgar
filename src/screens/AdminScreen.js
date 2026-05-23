<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NandedRozgar — Admin Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #f4f4f0;
    --surface: #ffffff;
    --surface2: #f9f9f7;
    --border: #e8e8e2;
    --border2: #d4d4cc;
    --text: #111110;
    --text2: #6b6b65;
    --text3: #a0a09a;
    --orange: #f97316;
    --orange-light: #fff4ed;
    --orange-border: #fed7aa;
    --green: #16a34a;
    --green-light: #f0fdf4;
    --green-border: #bbf7d0;
    --red: #dc2626;
    --red-light: #fef2f2;
    --red-border: #fecaca;
    --blue: #2563eb;
    --blue-light: #eff6ff;
    --blue-border: #bfdbfe;
    --purple: #7c3aed;
    --purple-light: #f5f3ff;
    --purple-border: #ddd6fe;
    --gold: #d97706;
    --gold-light: #fffbeb;
    --gold-border: #fde68a;
    --sidebar-w: 230px;
    --header-h: 60px;
    --radius: 10px;
    --radius-lg: 14px;
  }

  body {
    font-family: 'Sora', sans-serif;
    background: var(--bg);
    color: var(--text);
    font-size: 14px;
    line-height: 1.5;
    min-height: 100vh;
  }

  .shell { display: flex; min-height: 100vh; }

  /* ── Sidebar ── */
  .sidebar {
    width: var(--sidebar-w);
    background: #111110;
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0; left: 0; bottom: 0;
    z-index: 100;
    overflow-y: auto;
  }
  .sidebar-logo {
    padding: 20px 20px 16px;
    border-bottom: 1px solid #222;
  }
  .logo-mark { display: flex; align-items: center; gap: 10px; }
  .logo-icon {
    width: 36px; height: 36px; border-radius: 9px;
    background: var(--orange);
    display: flex; align-items: center; justify-content: center;
  }
  .logo-icon i { color: #fff; font-size: 18px; }
  .logo-text { color: #fff; font-size: 15px; font-weight: 800; letter-spacing: -0.3px; }
  .logo-sub { color: #666; font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 1px; }

  .sidebar-nav { padding: 16px 12px; flex: 1; }
  .nav-section-label {
    font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
    color: #444; padding: 0 8px; margin: 16px 0 6px;
  }
  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 10px; border-radius: 8px; cursor: pointer;
    color: #888; font-size: 13px; font-weight: 500;
    transition: all 0.15s; text-decoration: none; margin-bottom: 2px;
  }
  .nav-item i { font-size: 17px; width: 20px; text-align: center; }
  .nav-item:hover { background: #1a1a18; color: #ddd; }
  .nav-item.active { background: var(--orange); color: #fff; }
  .nav-badge {
    margin-left: auto; background: var(--red);
    color: #fff; font-size: 10px; font-weight: 700;
    padding: 2px 6px; border-radius: 10px; min-width: 18px; text-align: center;
  }

  .sidebar-footer { padding: 16px; border-top: 1px solid #222; }
  .admin-chip {
    display: flex; align-items: center; gap: 10px;
    background: #1a1a18; border-radius: 8px; padding: 10px;
  }
  .admin-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: var(--orange); display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 800; color: #fff; flex-shrink: 0;
  }
  .admin-name { font-size: 12px; font-weight: 700; color: #ddd; }
  .admin-role { font-size: 10px; color: #555; }

  /* ── Main ── */
  .main { margin-left: var(--sidebar-w); flex: 1; display: flex; flex-direction: column; min-height: 100vh; }

  /* ── Topbar ── */
  .topbar {
    height: var(--header-h); background: var(--surface);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center;
    padding: 0 24px; gap: 16px;
    position: sticky; top: 0; z-index: 50;
  }
  .topbar-title { font-size: 16px; font-weight: 800; color: var(--text); flex: 1; }
  .topbar-search {
    display: flex; align-items: center; gap: 8px;
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 8px; padding: 7px 12px; width: 220px;
  }
  .topbar-search i { color: var(--text3); font-size: 15px; }
  .topbar-search input {
    background: none; border: none; outline: none;
    font-size: 13px; color: var(--text); font-family: 'Sora', sans-serif; width: 100%;
  }
  .topbar-search input::placeholder { color: var(--text3); }
  .topbar-btn {
    width: 36px; height: 36px; border-radius: 8px;
    background: var(--bg); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; position: relative; color: var(--text2);
    transition: background 0.15s;
  }
  .topbar-btn:hover { background: var(--border); }
  .topbar-btn i { font-size: 17px; }
  .notif-dot {
    position: absolute; top: 6px; right: 6px;
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--red); border: 1.5px solid var(--surface);
  }

  /* ── Content ── */
  .content { padding: 24px; flex: 1; }

  /* ── Tab bar ── */
  .tabs {
    display: flex; gap: 4px; background: var(--surface);
    border: 1px solid var(--border); border-radius: var(--radius);
    padding: 4px; margin-bottom: 24px; overflow-x: auto;
    scrollbar-width: none;
  }
  .tabs::-webkit-scrollbar { display: none; }
  .tab {
    display: flex; align-items: center; gap: 7px;
    padding: 8px 14px; border-radius: 7px; cursor: pointer;
    color: var(--text2); font-size: 13px; font-weight: 600;
    transition: all 0.15s; white-space: nowrap; flex-shrink: 0;
  }
  .tab i { font-size: 15px; }
  .tab:hover { background: var(--bg); color: var(--text); }
  .tab.active { background: #111110; color: #fff; }
  .tab-count {
    background: var(--orange); color: #fff;
    font-size: 10px; font-weight: 800;
    padding: 1px 6px; border-radius: 10px; min-width: 18px; text-align: center;
  }

  /* ── Section panels ── */
  .panel { display: none; }
  .panel.active { display: block; }

  /* ── KPI Grid ── */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px; margin-bottom: 24px;
  }
  .kpi-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 16px;
    position: relative; overflow: hidden;
  }
  .kpi-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: var(--kpi-color, var(--orange));
  }
  .kpi-icon {
    width: 34px; height: 34px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    background: var(--kpi-bg, var(--orange-light));
    margin-bottom: 10px;
  }
  .kpi-icon i { font-size: 17px; color: var(--kpi-color, var(--orange)); }
  .kpi-value { font-size: 22px; font-weight: 800; color: var(--text); }
  .kpi-label { font-size: 11px; font-weight: 600; color: var(--text2); margin-top: 2px; }
  .kpi-sub { font-size: 10px; color: var(--text3); margin-top: 3px; }

  /* ── Alert banners ── */
  .alert {
    display: flex; align-items: center; gap: 10px;
    border-radius: var(--radius); padding: 11px 14px;
    margin-bottom: 10px; border-left-width: 4px; border-left-style: solid;
    background: var(--surface); border: 1px solid var(--border);
  }
  .alert-red { border-left-color: var(--red); }
  .alert-gold { border-left-color: var(--gold); }
  .alert-blue { border-left-color: var(--blue); }
  .alert i { font-size: 16px; flex-shrink: 0; }
  .alert-text { font-size: 13px; font-weight: 600; }

  /* ── Two-column layout ── */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }

  /* ── Card ── */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
  .card-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 18px; border-bottom: 1px solid var(--border);
  }
  .card-title {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; font-weight: 700; color: var(--text);
  }
  .card-title-icon {
    width: 28px; height: 28px; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    background: var(--kpi-bg, var(--orange-light));
  }
  .card-title-icon i { font-size: 14px; color: var(--kpi-color, var(--orange)); }
  .card-body { padding: 18px; }
  .card-action { font-size: 12px; font-weight: 700; color: var(--orange); cursor: pointer; text-decoration: none; }
  .card-action:hover { text-decoration: underline; }

  /* ── Progress bars ── */
  .progress-row { margin-bottom: 14px; }
  .progress-meta { display: flex; justify-content: space-between; margin-bottom: 5px; }
  .progress-label { font-size: 12px; font-weight: 600; color: var(--text2); }
  .progress-value { font-size: 12px; font-weight: 800; }
  .progress-track { height: 6px; background: var(--bg); border-radius: 3px; overflow: hidden; }
  .progress-fill {
    height: 100%; border-radius: 3px;
    background: var(--p-color, var(--orange));
    transition: width 0.6s ease;
  }
  .progress-pct { font-size: 10px; color: var(--text3); margin-top: 3px; }

  /* ── List rows ── */
  .list-row {
    display: flex; align-items: center; gap: 12px;
    padding: 11px 0;
    border-bottom: 1px solid var(--border);
  }
  .list-row:last-child { border-bottom: none; }
  .list-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--orange); display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 800; color: #fff; flex-shrink: 0;
  }
  .list-icon {
    width: 36px; height: 36px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .list-name { font-size: 13px; font-weight: 700; color: var(--text); }
  .list-sub { font-size: 11px; color: var(--text2); margin-top: 1px; }
  .list-meta { margin-left: auto; display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

  /* ── Chips/Badges ── */
  .chip {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 20px;
  }
  .chip-green  { background: var(--green-light);  color: var(--green);  border: 1px solid var(--green-border);  }
  .chip-red    { background: var(--red-light);    color: var(--red);    border: 1px solid var(--red-border);    }
  .chip-blue   { background: var(--blue-light);   color: var(--blue);   border: 1px solid var(--blue-border);   }
  .chip-orange { background: var(--orange-light); color: var(--orange); border: 1px solid var(--orange-border); }
  .chip-purple { background: var(--purple-light); color: var(--purple); border: 1px solid var(--purple-border); }
  .chip-gold   { background: var(--gold-light);   color: var(--gold);   border: 1px solid var(--gold-border);   }
  .chip-gray   { background: var(--surface2);     color: var(--text2);  border: 1px solid var(--border);        }

  /* ── Filter pills ── */
  .filter-strip { display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; }
  .filter-pill {
    padding: 6px 13px; border-radius: 20px;
    border: 1.5px solid var(--border); background: var(--surface);
    font-size: 12px; font-weight: 600; color: var(--text2);
    cursor: pointer; transition: all 0.15s; white-space: nowrap;
  }
  .filter-pill:hover { border-color: var(--orange); color: var(--orange); }
  .filter-pill.active { background: #111110; border-color: #111110; color: #fff; }

  /* ── Search box ── */
  .search-box {
    display: flex; align-items: center; gap: 8px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 9px; padding: 9px 13px; margin-bottom: 14px;
  }
  .search-box i { color: var(--text3); font-size: 15px; }
  .search-box input {
    flex: 1; background: none; border: none; outline: none;
    font-size: 13px; color: var(--text); font-family: 'Sora', sans-serif;
  }
  .search-box input::placeholder { color: var(--text3); }

  /* ── Listing cards ── */
  .listing-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 14px 16px;
    margin-bottom: 10px; cursor: pointer; transition: border-color 0.15s;
  }
  .listing-card:hover { border-color: var(--orange); }
  .listing-top { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
  .listing-type-badge {
    width: 34px; height: 34px; border-radius: 8px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .listing-type-badge i { font-size: 16px; }
  .listing-title { font-size: 14px; font-weight: 700; color: var(--text); }
  .listing-meta-line { font-size: 11px; color: var(--text2); margin-top: 2px; }
  .listing-bottom { display: flex; align-items: center; justify-content: space-between; }
  .listing-stats { display: flex; align-items: center; gap: 12px; }
  .listing-stat { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text3); }
  .listing-stat i { font-size: 13px; }
  .listing-actions { display: flex; gap: 5px; }
  .icon-btn {
    width: 28px; height: 28px; border-radius: 7px;
    background: var(--bg); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: background 0.15s;
  }
  .icon-btn:hover { background: var(--border); }
  .icon-btn i { font-size: 13px; color: var(--text2); }

  /* ── Users table ── */
  .users-table { width: 100%; border-collapse: collapse; }
  .users-table th {
    text-align: left; font-size: 11px; font-weight: 700; color: var(--text3);
    text-transform: uppercase; letter-spacing: 0.5px;
    padding: 10px 14px; border-bottom: 1px solid var(--border);
    background: var(--surface2);
  }
  .users-table td { padding: 11px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .users-table tr:last-child td { border-bottom: none; }
  .users-table tr:hover td { background: var(--bg); }
  .user-cell { display: flex; align-items: center; gap: 10px; }
  .mini-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: var(--orange); display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 800; color: #fff; flex-shrink: 0;
  }
  .user-name-cell .name { font-size: 13px; font-weight: 700; color: var(--text); }
  .user-name-cell .email { font-size: 11px; color: var(--text2); }

  /* ── Revenue section ── */
  .revenue-bar-row { margin-bottom: 16px; }
  .rev-meta { display: flex; justify-content: space-between; margin-bottom: 5px; }
  .rev-label { font-size: 12px; font-weight: 600; color: var(--text); }
  .rev-amount { font-size: 13px; font-weight: 800; }
  .rev-track { height: 8px; background: var(--bg); border-radius: 4px; overflow: hidden; }
  .rev-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
  .rev-pct { font-size: 10px; color: var(--text3); margin-top: 3px; }

  /* ── Promo cards ── */
  .promo-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 14px 16px;
    margin-bottom: 10px; display: flex; align-items: center; gap: 12px;
  }
  .promo-accent { width: 4px; border-radius: 2px; align-self: stretch; flex-shrink: 0; }
  .promo-info { flex: 1; }
  .promo-biz { font-size: 14px; font-weight: 700; color: var(--text); }
  .promo-tag { font-size: 11px; color: var(--text2); margin-top: 2px; }
  .promo-meta { display: flex; gap: 8px; margin-top: 7px; flex-wrap: wrap; }

  /* ── Plan rows ── */
  .plan-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 0; border-bottom: 1px solid var(--border);
  }
  .plan-row:last-child { border-bottom: none; }
  .plan-name { font-size: 13px; font-weight: 700; color: var(--text); }
  .plan-price { font-size: 14px; font-weight: 800; color: var(--orange); font-family: 'JetBrains Mono', monospace; }

  .section-divider { height: 1px; background: var(--border); margin: 16px 0; }

  /* ── Modal overlay ── */
  .modal-overlay {
    display: none; position: fixed; inset: 0;
    background: rgba(0,0,0,0.45); z-index: 200;
    align-items: flex-end; justify-content: center;
  }
  .modal-overlay.open { display: flex; }
  .modal-box {
    background: var(--surface); border-radius: 18px 18px 0 0;
    width: 100%; max-width: 520px; padding: 24px;
    max-height: 90vh; overflow-y: auto;
  }
  .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .modal-title { font-size: 17px; font-weight: 800; color: var(--text); }
  .modal-close {
    width: 32px; height: 32px; border-radius: 50%; border: none;
    background: var(--bg); cursor: pointer; display: flex; align-items: center; justify-content: center;
  }
  .modal-close i { font-size: 16px; color: var(--text2); }
  .modal-avatar {
    width: 64px; height: 64px; border-radius: 50%;
    background: var(--orange); display: flex; align-items: center; justify-content: center;
    font-size: 26px; font-weight: 900; color: #fff; margin: 0 auto 12px;
  }
  .modal-name { text-align: center; font-size: 17px; font-weight: 800; color: var(--text); }
  .modal-email { text-align: center; font-size: 12px; color: var(--text2); margin-top: 2px; }
  .modal-chips { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin: 14px 0; }
  .info-table { background: var(--surface2); border-radius: 9px; overflow: hidden; margin-bottom: 16px; }
  .info-row {
    display: flex; justify-content: space-between;
    padding: 9px 14px; border-bottom: 1px solid var(--border);
    font-size: 13px;
  }
  .info-row:last-child { border-bottom: none; }
  .info-key { color: var(--text2); font-weight: 600; }
  .info-val { color: var(--text); font-weight: 700; }
  .modal-actions { display: flex; flex-direction: column; gap: 8px; }
  .modal-btn {
    width: 100%; padding: 11px; border-radius: 9px; border: none;
    font-size: 13px; font-weight: 700; cursor: pointer;
    font-family: 'Sora', sans-serif; transition: opacity 0.15s;
  }
  .modal-btn:hover { opacity: 0.85; }
  .modal-btn-danger  { background: var(--red-light); color: var(--red); border: 1px solid var(--red-border); }
  .modal-btn-orange  { background: var(--orange); color: #fff; }
  .modal-btn-green   { background: var(--green-light); color: var(--green); border: 1px solid var(--green-border); }
  .modal-btn-gray    { background: var(--surface2); color: var(--text2); border: 1px solid var(--border); }

  /* ── Notify panel ── */
  .field-label { font-size: 12px; font-weight: 700; color: var(--text2); margin-bottom: 5px; }
  .field-input {
    width: 100%; border: 1.5px solid var(--border); border-radius: 9px;
    padding: 10px 12px; font-size: 13px; font-family: 'Sora', sans-serif;
    color: var(--text); background: var(--surface2); outline: none;
    margin-bottom: 14px; transition: border-color 0.15s;
  }
  .field-input:focus { border-color: var(--orange); background: var(--surface); }
  .field-textarea { min-height: 80px; resize: vertical; }
  .seg-group { display: flex; gap: 6px; margin-bottom: 14px; }
  .seg-btn {
    flex: 1; padding: 8px; border-radius: 8px; border: 1.5px solid var(--border);
    background: var(--surface2); font-size: 12px; font-weight: 600; color: var(--text2);
    cursor: pointer; font-family: 'Sora', sans-serif; transition: all 0.15s; text-align: center;
  }
  .seg-btn:hover { border-color: var(--orange); color: var(--orange); }
  .seg-btn.active { background: #111110; border-color: #111110; color: #fff; }

  /* ── Results count ── */
  .results-count { font-size: 11px; color: var(--text3); font-weight: 600; margin-bottom: 10px; letter-spacing: 0.3px; }

  /* ── Empty state ── */
  .empty-state { text-align: center; padding: 32px; color: var(--text3); font-size: 13px; }
  .empty-state i { font-size: 32px; margin-bottom: 8px; display: block; opacity: 0.4; }

  .scroll-container { overflow-x: auto; }

  /* ── Toast ── */
  .toast {
    position: fixed; bottom: 24px; right: 24px;
    background: #111110; color: #fff;
    padding: 12px 18px; border-radius: 10px;
    font-size: 13px; font-weight: 600;
    display: flex; align-items: center; gap: 8px;
    transform: translateY(80px); opacity: 0;
    transition: all 0.3s; z-index: 300;
  }
  .toast.show { transform: translateY(0); opacity: 1; }
  .toast i { color: var(--green); font-size: 16px; }

  /* ── Responsive ── */
  @media (max-width: 1024px) {
    .sidebar { display: none; }
    .main { margin-left: 0; }
    .two-col { grid-template-columns: 1fr; }
  }
  @media (max-width: 640px) {
    .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  }
</style>
</head>
<body>

<div class="shell">

  <!-- ── Sidebar ── -->
  <aside class="sidebar">
    <div class="sidebar-logo">
      <div class="logo-mark">
        <div class="logo-icon"><i class="ti ti-map-pin"></i></div>
        <div>
          <div class="logo-text">NandedRozgar</div>
          <div class="logo-sub">Admin Portal</div>
        </div>
      </div>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-section-label">Main</div>
      <a class="nav-item active" onclick="switchTab('overview'); setActive(this)">
        <i class="ti ti-layout-dashboard"></i> Overview
      </a>
      <a class="nav-item" onclick="switchTab('jobs'); setActive(this)">
        <i class="ti ti-briefcase"></i> Jobs
        <span class="nav-badge" id="sb-jobs">0</span>
      </a>
      <a class="nav-item" onclick="switchTab('rooms'); setActive(this)">
        <i class="ti ti-home"></i> Rooms / PG
        <span class="nav-badge" id="sb-rooms">0</span>
      </a>
      <a class="nav-item" onclick="switchTab('buysell'); setActive(this)">
        <i class="ti ti-shopping-bag"></i> Buy &amp; Sell
        <span class="nav-badge" id="sb-buysell">0</span>
      </a>
      <a class="nav-item" onclick="switchTab('banners'); setActive(this)">
        <i class="ti ti-speakerphone"></i> Promo Banners
        <span class="nav-badge" id="sb-banners">0</span>
      </a>

      <div class="nav-section-label">Management</div>
      <a class="nav-item" onclick="switchTab('users'); setActive(this)">
        <i class="ti ti-users"></i> Users
      </a>
      <a class="nav-item" onclick="switchTab('revenue'); setActive(this)">
        <i class="ti ti-currency-rupee"></i> Revenue
      </a>
      <a class="nav-item" onclick="switchTab('activity'); setActive(this)">
        <i class="ti ti-chart-bar"></i> Analytics
      </a>

      <div class="nav-section-label">Tools</div>
      <a class="nav-item" onclick="openNotify()">
        <i class="ti ti-bell-ringing"></i> Send Notification
      </a>
    </nav>

    <div class="sidebar-footer">
      <div class="admin-chip">
        <div class="admin-avatar">A</div>
        <div>
          <div class="admin-name">Admin</div>
          <div class="admin-role">Super Admin</div>
        </div>
      </div>
    </div>
  </aside>

  <!-- ── Main ── -->
  <div class="main">

    <header class="topbar">
      <div class="topbar-title" id="topbar-title">Overview</div>
      <div class="topbar-search">
        <i class="ti ti-search"></i>
        <input type="text" placeholder="Quick search…" id="global-search">
      </div>
      <div class="topbar-btn" onclick="onRefresh()" title="Refresh">
        <i class="ti ti-refresh"></i>
      </div>
      <div class="topbar-btn" onclick="openNotify()" title="Notifications">
        <i class="ti ti-bell"></i>
        <span class="notif-dot"></span>
      </div>
    </header>

    <div class="content">

      <!-- Tab bar -->
      <div class="tabs" id="tab-bar">
        <div class="tab active" data-tab="overview" onclick="switchTab('overview',this)"><i class="ti ti-layout-dashboard"></i> Overview</div>
        <div class="tab" data-tab="jobs" onclick="switchTab('jobs',this)"><i class="ti ti-briefcase"></i> Jobs <span class="tab-count" id="tc-jobs">0</span></div>
        <div class="tab" data-tab="rooms" onclick="switchTab('rooms',this)"><i class="ti ti-home"></i> Rooms <span class="tab-count" id="tc-rooms">0</span></div>
        <div class="tab" data-tab="buysell" onclick="switchTab('buysell',this)"><i class="ti ti-shopping-bag"></i> Buy &amp; Sell <span class="tab-count" id="tc-buysell">0</span></div>
        <div class="tab" data-tab="banners" onclick="switchTab('banners',this)"><i class="ti ti-speakerphone"></i> Banners <span class="tab-count" id="tc-banners">0</span></div>
        <div class="tab" data-tab="users" onclick="switchTab('users',this)"><i class="ti ti-users"></i> Users</div>
        <div class="tab" data-tab="revenue" onclick="switchTab('revenue',this)"><i class="ti ti-currency-rupee"></i> Revenue</div>
        <div class="tab" data-tab="activity" onclick="switchTab('activity',this)"><i class="ti ti-chart-bar"></i> Analytics</div>
      </div>

      <!-- ═══ OVERVIEW ═══ -->
      <div class="panel active" id="panel-overview">
        <div class="kpi-grid" id="kpi-grid"></div>
        <div id="alert-area"></div>
        <div class="two-col">
          <div class="card">
            <div class="card-header">
              <div class="card-title" style="--kpi-color:var(--purple);--kpi-bg:var(--purple-light)">
                <div class="card-title-icon"><i class="ti ti-activity"></i></div>
                Platform health
              </div>
            </div>
            <div class="card-body" id="health-bars"></div>
          </div>
          <div class="card">
            <div class="card-header">
              <div class="card-title" style="--kpi-color:var(--orange);--kpi-bg:var(--orange-light)">
                <div class="card-title-icon"><i class="ti ti-bolt"></i></div>
                Quick actions
              </div>
            </div>
            <div class="card-body">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div class="listing-card" style="margin:0;border-top:3px solid var(--purple)" onclick="openNotify()">
                  <i class="ti ti-bell-ringing" style="color:var(--purple);font-size:20px;display:block;margin-bottom:6px"></i>
                  <span style="font-size:12px;font-weight:700">Send Notification</span>
                </div>
                <div class="listing-card" style="margin:0;border-top:3px solid var(--orange)" onclick="switchTab('jobs')">
                  <i class="ti ti-briefcase" style="color:var(--orange);font-size:20px;display:block;margin-bottom:6px"></i>
                  <span style="font-size:12px;font-weight:700">Manage Jobs</span>
                </div>
                <div class="listing-card" style="margin:0;border-top:3px solid var(--blue)" onclick="switchTab('users')">
                  <i class="ti ti-users" style="color:var(--blue);font-size:20px;display:block;margin-bottom:6px"></i>
                  <span style="font-size:12px;font-weight:700">Manage Users</span>
                </div>
                <div class="listing-card" style="margin:0;border-top:3px solid var(--green)" onclick="switchTab('revenue')">
                  <i class="ti ti-currency-rupee" style="color:var(--green);font-size:20px;display:block;margin-bottom:6px"></i>
                  <span style="font-size:12px;font-weight:700">View Revenue</span>
                </div>
                <div class="listing-card" style="margin:0;border-top:3px solid var(--gold)" onclick="switchTab('banners')">
                  <i class="ti ti-speakerphone" style="color:var(--gold);font-size:20px;display:block;margin-bottom:6px"></i>
                  <span style="font-size:12px;font-weight:700">Promo Banners</span>
                </div>
                <div class="listing-card" style="margin:0;border-top:3px solid var(--red)" onclick="switchTab('buysell')">
                  <i class="ti ti-shopping-bag" style="color:var(--red);font-size:20px;display:block;margin-bottom:6px"></i>
                  <span style="font-size:12px;font-weight:700">Buy &amp; Sell</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="two-col">
          <div class="card">
            <div class="card-header">
              <div class="card-title" style="--kpi-color:var(--orange);--kpi-bg:var(--orange-light)">
                <div class="card-title-icon"><i class="ti ti-clock"></i></div>
                Recent listings
              </div>
              <a class="card-action" onclick="switchTab('jobs')">See all →</a>
            </div>
            <div class="card-body" id="recent-listings"></div>
          </div>
          <div class="card">
            <div class="card-header">
              <div class="card-title" style="--kpi-color:var(--green);--kpi-bg:var(--green-light)">
                <div class="card-title-icon"><i class="ti ti-user-plus"></i></div>
                Recently joined
              </div>
              <a class="card-action" onclick="switchTab('users')">See all →</a>
            </div>
            <div class="card-body" id="recent-users"></div>
          </div>
        </div>
      </div>

      <!-- ═══ JOBS ═══ -->
      <div class="panel" id="panel-jobs">
        <div class="search-box">
          <i class="ti ti-search"></i>
          <input type="text" placeholder="Search by title, company, category…" id="job-search" oninput="renderJobs()">
        </div>
        <div class="filter-strip" id="job-filters"></div>
        <div class="results-count" id="job-count"></div>
        <div id="jobs-list"></div>
      </div>

      <!-- ═══ ROOMS ═══ -->
      <div class="panel" id="panel-rooms">
        <div class="search-box">
          <i class="ti ti-search"></i>
          <input type="text" placeholder="Search by area, type, gender…" id="room-search" oninput="renderRooms()">
        </div>
        <div class="filter-strip" id="room-filters"></div>
        <div class="results-count" id="room-count"></div>
        <div id="rooms-list"></div>
      </div>

      <!-- ═══ BUY & SELL ═══ -->
      <div class="panel" id="panel-buysell">
        <div class="search-box">
          <i class="ti ti-search"></i>
          <input type="text" placeholder="Search items, category, seller…" id="buysell-search" oninput="renderBuySell()">
        </div>
        <div class="filter-strip" id="buysell-filters"></div>
        <div class="results-count" id="buysell-count"></div>
        <div id="buysell-list"></div>
      </div>

      <!-- ═══ BANNERS ═══ -->
      <div class="panel" id="panel-banners">
        <div class="search-box">
          <i class="ti ti-search"></i>
          <input type="text" placeholder="Search by business name, category…" id="banner-search" oninput="renderBanners()">
        </div>
        <div class="filter-strip" id="banner-filters"></div>
        <div class="results-count" id="banner-count"></div>
        <div id="banners-list"></div>
      </div>

      <!-- ═══ USERS ═══ -->
      <div class="panel" id="panel-users">
        <div class="search-box">
          <i class="ti ti-search"></i>
          <input type="text" placeholder="Search by name, email, company…" id="user-search" oninput="renderUsers()">
        </div>
        <div class="filter-strip" id="user-filters"></div>
        <div class="results-count" id="user-count"></div>
        <div class="card scroll-container">
          <table class="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="users-tbody"></tbody>
          </table>
        </div>
      </div>

      <!-- ═══ REVENUE ═══ -->
      <div class="panel" id="panel-revenue">
        <div class="kpi-grid" id="rev-kpi-grid"></div>
        <div class="two-col">
          <div class="card">
            <div class="card-header">
              <div class="card-title" style="--kpi-color:var(--orange);--kpi-bg:var(--orange-light)">
                <div class="card-title-icon"><i class="ti ti-chart-pie"></i></div>
                Revenue breakdown
              </div>
            </div>
            <div class="card-body" id="rev-bars"></div>
          </div>
          <div class="card">
            <div class="card-header">
              <div class="card-title" style="--kpi-color:var(--blue);--kpi-bg:var(--blue-light)">
                <div class="card-title-icon"><i class="ti ti-tag"></i></div>
                Pricing plans
              </div>
            </div>
            <div class="card-body" id="plans-list"></div>
          </div>
        </div>
        <div class="card" style="margin-bottom:24px">
          <div class="card-header">
            <div class="card-title" style="--kpi-color:var(--green);--kpi-bg:var(--green-light)">
              <div class="card-title-icon"><i class="ti ti-trending-up"></i></div>
              Revenue projections
            </div>
          </div>
          <div class="card-body"><div id="projections"></div></div>
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title" style="--kpi-color:var(--blue);--kpi-bg:var(--blue-light)">
              <div class="card-title-icon"><i class="ti ti-receipt"></i></div>
              Recent payments
            </div>
          </div>
          <div class="card-body">
            <div class="empty-state"><i class="ti ti-receipt"></i>No payment records yet.</div>
          </div>
        </div>
      </div>

      <!-- ═══ ANALYTICS ═══ -->
      <div class="panel" id="panel-activity">
        <div class="two-col">
          <div class="card">
            <div class="card-header">
              <div class="card-title" style="--kpi-color:var(--purple);--kpi-bg:var(--purple-light)">
                <div class="card-title-icon"><i class="ti ti-chart-bar"></i></div>
                Platform stats
              </div>
            </div>
            <div class="card-body" id="platform-stats"></div>
          </div>
          <div class="card">
            <div class="card-header">
              <div class="card-title" style="--kpi-color:var(--blue);--kpi-bg:var(--blue-light)">
                <div class="card-title-icon"><i class="ti ti-users"></i></div>
                User breakdown
              </div>
            </div>
            <div class="card-body" id="user-breakdown"></div>
          </div>
        </div>
        <div class="card" style="margin-bottom:24px">
          <div class="card-header">
            <div class="card-title" style="--kpi-color:var(--orange);--kpi-bg:var(--orange-light)">
              <div class="card-title-icon"><i class="ti ti-list"></i></div>
              Listings by category
            </div>
          </div>
          <div class="card-body" id="cat-breakdown"></div>
        </div>
        <div class="two-col">
          <div class="card">
            <div class="card-header">
              <div class="card-title" style="--kpi-color:var(--orange);--kpi-bg:var(--orange-light)">
                <div class="card-title-icon"><i class="ti ti-chart-donut"></i></div>
                Listing distribution
              </div>
            </div>
            <div class="card-body">
              <div style="position:relative;height:220px">
                <canvas id="chart-listing-dist"></canvas>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-header">
              <div class="card-title" style="--kpi-color:var(--blue);--kpi-bg:var(--blue-light)">
                <div class="card-title-icon"><i class="ti ti-chart-bar"></i></div>
                Plan popularity
              </div>
            </div>
            <div class="card-body">
              <div style="position:relative;height:220px">
                <canvas id="chart-plans"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</div>

<!-- ── User modal ── -->
<div class="modal-overlay" id="user-modal">
  <div class="modal-box">
    <div class="modal-header">
      <span class="modal-title">User details</span>
      <button class="modal-close" onclick="closeModal('user-modal')"><i class="ti ti-x"></i></button>
    </div>
    <div class="modal-avatar" id="um-avatar">A</div>
    <div class="modal-name" id="um-name">—</div>
    <div class="modal-email" id="um-email">—</div>
    <div class="modal-chips" id="um-chips"></div>
    <div class="info-table" id="um-info"></div>
    <div class="modal-actions" id="um-actions"></div>
  </div>
</div>

<!-- ── Listing modal ── -->
<div class="modal-overlay" id="listing-modal">
  <div class="modal-box">
    <div class="modal-header">
      <span class="modal-title" id="lm-type-label">Listing details</span>
      <button class="modal-close" onclick="closeModal('listing-modal')"><i class="ti ti-x"></i></button>
    </div>
    <div style="margin-bottom:14px">
      <div style="font-size:16px;font-weight:800;color:var(--text)" id="lm-title">—</div>
      <div style="font-size:13px;color:var(--text2);margin-top:3px" id="lm-sub">—</div>
    </div>
    <div class="modal-chips" id="lm-chips" style="justify-content:flex-start"></div>
    <div class="info-table" id="lm-info"></div>
    <div class="modal-actions" id="lm-actions"></div>
  </div>
</div>

<!-- ── Notify modal ── -->
<div class="modal-overlay" id="notify-modal">
  <div class="modal-box">
    <div class="modal-header">
      <span class="modal-title">Send notification</span>
      <button class="modal-close" onclick="closeModal('notify-modal')"><i class="ti ti-x"></i></button>
    </div>
    <div class="field-label">Target audience</div>
    <div class="seg-group">
      <div class="seg-btn active" data-target="all" onclick="setTarget(this)">All Users</div>
      <div class="seg-btn" data-target="pro" onclick="setTarget(this)">PRO Only</div>
      <div class="seg-btn" data-target="free" onclick="setTarget(this)">Free Only</div>
    </div>
    <div class="field-label">Title</div>
    <input class="field-input" type="text" id="notif-title" placeholder="Notification title…">
    <div class="field-label">Message</div>
    <textarea class="field-input field-textarea" id="notif-body" placeholder="Write your message…"></textarea>
    <button class="modal-btn modal-btn-orange" onclick="sendNotification()">Send notification</button>
  </div>
</div>

<!-- ── Toast ── -->
<div class="toast" id="toast"><i class="ti ti-circle-check"></i> <span id="toast-msg"></span></div>

<script>
// ─── Data ──────────────────────────────────────────────────────────────────
const STATE = {
  jobs: [
    { id:1, title:'Delivery Executive', company:'Quick Delivery Nanded', category:'Delivery', status:'active', featured:true, urgent:false, views:342, applicant_count:18, location:'Nanded', salary:'₹12,000–₹15,000', created_at:'2025-05-01' },
    { id:2, title:'Security Guard', company:'ShieldSec Pvt Ltd', category:'Security', status:'active', featured:false, urgent:true, views:211, applicant_count:9, location:'Nanded', salary:'₹10,000–₹12,000', created_at:'2025-05-03' },
    { id:3, title:'Data Entry Operator', company:'InfoTech Solutions', category:'Data Entry', status:'active', featured:false, urgent:false, views:188, applicant_count:24, location:'Nanded', salary:'₹8,000–₹10,000', created_at:'2025-05-05' },
    { id:4, title:'Shop Assistant', company:'Aarav Garments', category:'Shop Assistant', status:'inactive', featured:false, urgent:false, views:99, applicant_count:5, location:'Nanded', salary:'₹7,500', created_at:'2025-04-28' },
    { id:5, title:'Domestic Help', company:'HomeCare Agency', category:'Domestic Help', status:'active', featured:true, urgent:false, views:155, applicant_count:11, location:'Nanded', salary:'₹6,000–₹8,000', created_at:'2025-05-07' },
    { id:6, title:'TeleCaller', company:'Nanded Finance', category:'TeleCaller', status:'active', featured:false, urgent:true, views:267, applicant_count:32, location:'Nanded', salary:'₹9,000+incentives', created_at:'2025-05-08' },
    { id:7, title:'Driver (Auto)', company:'City Cab Nanded', category:'Driver', status:'active', featured:false, urgent:false, views:178, applicant_count:7, location:'Nanded', salary:'₹11,000', created_at:'2025-05-10' },
    { id:8, title:'Construction Foreman', company:'Buildwell Projects', category:'Construction', status:'inactive', featured:false, urgent:false, views:64, applicant_count:3, location:'Nanded', salary:'₹15,000–₹18,000', created_at:'2025-04-22' },
  ],
  rooms: [
    { id:1, room_type:'PG', for_gender:'Male', furnished:'Semi-furnished', area:'Vazirabad', rent:3500, vacancies:2, status:'active', whatsapp:'9876543210', created_at:'2025-05-02', plan_label:'Featured', plan_price:79 },
    { id:2, room_type:'1 BHK', for_gender:'Any', furnished:'Fully furnished', area:'Shivaji Nagar', rent:6500, vacancies:1, status:'active', whatsapp:'9823456780', created_at:'2025-05-04', plan_label:'Free', plan_price:0 },
    { id:3, room_type:'PG', for_gender:'Female', furnished:'Unfurnished', area:'Vivekanand Colony', rent:2800, vacancies:3, status:'active', whatsapp:'9012345678', created_at:'2025-05-06', plan_label:'Featured', plan_price:79 },
    { id:4, room_type:'2 BHK', for_gender:'Family', furnished:'Semi-furnished', area:'SRTMU Campus Area', rent:9000, vacancies:1, status:'inactive', whatsapp:'8765432109', created_at:'2025-04-29', plan_label:'Free', plan_price:0 },
    { id:5, room_type:'PG', for_gender:'Male', furnished:'Fully furnished', area:'Gurudwara Road', rent:4200, vacancies:4, status:'active', whatsapp:'7654321098', created_at:'2025-05-09', plan_label:'Free', plan_price:0 },
  ],
  buysell: [
    { id:1, title:'Honda Activa 5G', category:'Two Wheeler', price:48000, condition:'Good', seller:'Ramesh K.', status:'active', featured:true, created_at:'2025-05-01' },
    { id:2, title:'LG 32" LED TV', category:'Electronics', price:7500, condition:'Excellent', seller:'Priya M.', status:'active', featured:false, created_at:'2025-05-03' },
    { id:3, title:'Wooden Study Table', category:'Furniture', price:2200, condition:'Good', seller:'Suresh P.', status:'active', featured:false, created_at:'2025-05-05' },
    { id:4, title:'Samsung Galaxy M32', category:'Mobile', price:9999, condition:'Like New', seller:'Aisha N.', status:'active', featured:true, created_at:'2025-05-07' },
    { id:5, title:'Iron Almirah', category:'Furniture', price:3500, condition:'Good', seller:'Vijay D.', status:'inactive', featured:false, created_at:'2025-04-25' },
    { id:6, title:'Atlas Cycle', category:'Bicycle', price:1800, condition:'Fair', seller:'Mohan S.', status:'active', featured:false, created_at:'2025-05-09' },
  ],
  banners: [
    { id:1, bizName:'Nanded City Bakery', tagline:'Fresh baked every morning!', phone:'9876001122', category:'Food & Bakery', location:'Station Road', plan:'premium', bannerStyle:'bold', status:'active', expires_at:'2025-06-04', created_at:'2025-05-05' },
    { id:2, bizName:'Shree Clinic', tagline:'Your health, our priority', phone:'9800112233', category:'Healthcare', location:'Vazirabad', plan:'popular', bannerStyle:'clean', status:'active', expires_at:'2025-05-20', created_at:'2025-05-05' },
    { id:3, bizName:'TechFix Center', tagline:'Mobile & laptop repair experts', phone:'9988776655', category:'Electronics Repair', location:'Gurudwara Road', plan:'basic', bannerStyle:'vivid', status:'active', expires_at:'2025-05-12', created_at:'2025-05-05' },
    { id:4, bizName:'Raj Catering', tagline:'Delicious food for all events', phone:'9111222333', category:'Catering', location:'Shivaji Nagar', plan:'popular', bannerStyle:'bold', status:'active', expires_at:'2025-05-25', created_at:'2025-05-05' },
    { id:5, bizName:'EduZone Academy', tagline:'Coaching for 9–12 all subjects', phone:'7766554433', category:'Education', location:'SRTMU Area', plan:'basic', bannerStyle:'clean', status:'inactive', expires_at:'2025-04-30', created_at:'2025-04-16' },
  ],
  users: [
    { id:1, name:'Rajesh Kumar', email:'rajesh@gmail.com', company:'Quick Delivery', role:'user', premium:true, active:true, verified:true, created_at:'2025-01-10' },
    { id:2, name:'Priya Sharma', email:'priya@yahoo.com', company:'', role:'user', premium:false, active:true, verified:false, created_at:'2025-02-14' },
    { id:3, name:'Admin User', email:'admin@nandedrozgar.com', company:'', role:'admin', premium:true, active:true, verified:true, created_at:'2025-01-01' },
    { id:4, name:'Suresh Patil', email:'suresh.p@gmail.com', company:'Buildwell Projects', role:'user', premium:false, active:false, verified:false, created_at:'2025-03-05' },
    { id:5, name:'Aisha Noor', email:'aisha.n@gmail.com', company:'', role:'user', premium:true, active:true, verified:false, created_at:'2025-03-18' },
    { id:6, name:'Mohan Das', email:'mohan.d@gmail.com', company:'City Cab', role:'user', premium:false, active:true, verified:false, created_at:'2025-04-02' },
    { id:7, name:'Kavita Jadhav', email:'kavita.j@gmail.com', company:'HomeCare Agency', role:'user', premium:false, active:true, verified:true, created_at:'2025-04-20' },
    { id:8, name:'Sanjay More', email:'sanjay.m@gmail.com', company:'', role:'user', premium:true, active:true, verified:false, created_at:'2025-05-01' },
  ],
  PRICING: { featured: 99, urgent: 49, pro_monthly: 499 },
  JOB_PLANS: [
    { id:'free', label:'Free', price:0, description:'Standard listing — 30 days' },
    { id:'featured', label:'Featured', price:99, description:'Top placement + orange badge' },
    { id:'urgent', label:'Urgent', price:49, description:'Urgent tag + priority listing' },
  ],
  ROOM_PLANS: [
    { id:'free', label:'Free', price:0, description:'List your room — 30 days' },
    { id:'featured', label:'Featured', price:79, description:'Top placement in room listings' },
  ],
  BUYSELL_PLANS: [
    { id:'free', label:'Free', price:0, description:'List your item — 30 days' },
    { id:'featured', label:'Featured', price:49, description:'Top placement in buy & sell' },
  ],
  PROMO_PLANS: {
    basic:   { price:99,  days:7 },
    popular: { price:249, days:15 },
    premium: { price:499, days:30 },
  },
  activeJobFilter: 'all',
  activeRoomFilter: 'all',
  activeBuySellFilter: 'all',
  activeBannerFilter: 'all',
  activeUserFilter: 'all',
  notifyTarget: 'all',
};

// ─── Derived stats ────────────────────────────────────────────────────────
function getDerived() {
  const { jobs, rooms, buysell, banners, users } = STATE;
  const activeJobs    = jobs.filter(j => j.status === 'active');
  const inactiveJobs  = jobs.filter(j => j.status === 'inactive');
  const featuredJobs  = jobs.filter(j => j.featured);
  const urgentJobs    = jobs.filter(j => j.urgent);
  const proUsers      = users.filter(u => u.premium);
  const bannedUsers   = users.filter(u => !u.active);
  const adminUsers    = users.filter(u => u.role === 'admin');
  const totalViews    = jobs.reduce((a, j) => a + (j.views || 0), 0);
  const totalApps     = jobs.reduce((a, j) => a + (j.applicant_count || 0), 0);
  const activeRooms   = rooms.filter(r => r.status === 'active');
  const activeBuySell = buysell.filter(b => b.status === 'active');
  const activeBanners = banners.filter(b => b.status === 'active');
  const promRevenue   = activeBanners.reduce((a, b) => a + (STATE.PROMO_PLANS[b.plan]?.price || 0), 0);
  const rev = {
    featured: featuredJobs.length * STATE.PRICING.featured,
    urgent:   urgentJobs.length   * STATE.PRICING.urgent,
    pro:      proUsers.length     * STATE.PRICING.pro_monthly,
    promo:    promRevenue,
  };
  rev.total = rev.featured + rev.urgent + rev.pro + rev.promo;
  return { activeJobs, inactiveJobs, featuredJobs, urgentJobs, proUsers, bannedUsers, adminUsers, totalViews, totalApps, activeRooms, activeBuySell, activeBanners, rev };
}

// ─── Tab switching ────────────────────────────────────────────────────────
const TAB_TITLES = {
  overview:'Overview', jobs:'Jobs', rooms:'Rooms / PG',
  buysell:'Buy & Sell', banners:'Promo Banners',
  users:'Users', revenue:'Revenue', activity:'Analytics'
};

function switchTab(name, el) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  const tab = el || document.querySelector(`.tab[data-tab="${name}"]`);
  if (tab) tab.classList.add('active');
  document.getElementById('topbar-title').textContent = TAB_TITLES[name] || name;
}

function setActive(el) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
}

// ─── Overview ─────────────────────────────────────────────────────────────
function renderOverview() {
  const d = getDerived();
  const { jobs, rooms, buysell, banners, users } = STATE;

  document.getElementById('kpi-grid').innerHTML = [
    { icon:'ti-briefcase',     value: jobs.length,    label:'Total Jobs',     color:'var(--orange)', bg:'var(--orange-light)', sub:`${d.activeJobs.length} active` },
    { icon:'ti-home',          value: rooms.length,   label:'Rooms / PG',     color:'var(--blue)',   bg:'var(--blue-light)',   sub:`${d.activeRooms.length} active` },
    { icon:'ti-shopping-bag',  value: buysell.length, label:'Buy & Sell',     color:'var(--red)',    bg:'var(--red-light)',    sub:`${d.activeBuySell.length} active` },
    { icon:'ti-speakerphone',  value: banners.length, label:'Promo Banners',  color:'var(--gold)',   bg:'var(--gold-light)',   sub:`${d.activeBanners.length} active` },
    { icon:'ti-users',         value: users.length,   label:'Total Users',    color:'var(--purple)', bg:'var(--purple-light)', sub:`${d.proUsers.length} PRO` },
    { icon:'ti-eye',           value: d.totalViews.toLocaleString('en-IN'), label:'Total Views', color:'var(--blue)', bg:'var(--blue-light)' },
    { icon:'ti-currency-rupee',value: '₹' + d.rev.total.toLocaleString('en-IN'), label:'Est. Revenue', color:'var(--green)', bg:'var(--green-light)' },
    { icon:'ti-star',          value: d.featuredJobs.length, label:'Featured Jobs', color:'var(--gold)', bg:'var(--gold-light)' },
  ].map(k => `
    <div class="kpi-card" style="--kpi-color:${k.color};--kpi-bg:${k.bg}">
      <div class="kpi-icon"><i class="ti ${k.icon}"></i></div>
      <div class="kpi-value">${k.value}</div>
      <div class="kpi-label">${k.label}</div>
      ${k.sub ? `<div class="kpi-sub">${k.sub}</div>` : ''}
    </div>
  `).join('');

  const alerts = [];
  if (d.bannedUsers.length > 0) alerts.push(`<div class="alert alert-red"><i class="ti ti-alert-circle" style="color:var(--red)"></i><div class="alert-text" style="color:var(--red)">${d.bannedUsers.length} banned user${d.bannedUsers.length > 1 ? 's' : ''} on platform</div></div>`);
  if (d.inactiveJobs.length > 0) alerts.push(`<div class="alert alert-gold"><i class="ti ti-alert-triangle" style="color:var(--gold)"></i><div class="alert-text" style="color:var(--gold)">${d.inactiveJobs.length} inactive job listing${d.inactiveJobs.length > 1 ? 's' : ''} need review</div></div>`);
  const expiredBanners = banners.filter(b => b.status === 'inactive');
  if (expiredBanners.length > 0) alerts.push(`<div class="alert" style="border-left-color:var(--blue)"><i class="ti ti-speakerphone" style="color:var(--blue)"></i><div class="alert-text" style="color:var(--blue)">${expiredBanners.length} promo banner${expiredBanners.length > 1 ? 's' : ''} expired/inactive</div></div>`);
  document.getElementById('alert-area').innerHTML = alerts.join('') + (alerts.length ? '<div style="margin-bottom:24px"></div>' : '');

  const healthItems = [
    { label:'Active Jobs',     value:d.activeJobs.length,   total:jobs.length,   color:'var(--orange)' },
    { label:'Active Rooms',    value:d.activeRooms.length,  total:rooms.length,  color:'var(--blue)' },
    { label:'Active Buy&Sell', value:d.activeBuySell.length,total:buysell.length,color:'var(--red)' },
    { label:'Active Banners',  value:d.activeBanners.length,total:banners.length,color:'var(--gold)' },
    { label:'PRO Users',       value:d.proUsers.length,     total:users.length,  color:'var(--purple)' },
  ];
  document.getElementById('health-bars').innerHTML = healthItems.map(h => {
    const pct = h.total > 0 ? Math.round((h.value/h.total)*100) : 0;
    return `<div class="progress-row">
      <div class="progress-meta">
        <span class="progress-label">${h.label}</span>
        <span class="progress-value" style="color:${h.color}">${h.value} / ${h.total}</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="--p-color:${h.color};width:${pct}%"></div></div>
      <div class="progress-pct">${pct}%</div>
    </div>`;
  }).join('');

  document.getElementById('recent-listings').innerHTML = jobs.slice(0, 5).map(j => `
    <div class="list-row">
      <div class="list-icon" style="background:var(--orange-light)"><i class="ti ti-briefcase" style="color:var(--orange);font-size:16px"></i></div>
      <div style="flex:1">
        <div class="list-name">${j.title}</div>
        <div class="list-sub">${j.company} · ${j.category}</div>
      </div>
      <div class="list-meta"><span class="chip chip-${j.status==='active'?'green':'red'}">${j.status}</span></div>
    </div>
  `).join('') || '<div class="empty-state"><i class="ti ti-briefcase"></i>No listings yet.</div>';

  document.getElementById('recent-users').innerHTML = users.slice(0, 5).map(u => `
    <div class="list-row">
      <div class="list-avatar" style="background:${colorForLetter(u.name[0])}">${u.name[0].toUpperCase()}</div>
      <div style="flex:1">
        <div class="list-name">${u.name}</div>
        <div class="list-sub">${u.email}</div>
      </div>
      <div class="list-meta">
        <span class="chip chip-${u.premium?'gold':'gray'}">${u.premium?'PRO':'Free'}</span>
        ${!u.active ? '<span class="chip chip-red">Banned</span>' : ''}
      </div>
    </div>
  `).join('') || '<div class="empty-state"><i class="ti ti-users"></i>No users yet.</div>';

  document.getElementById('tc-jobs').textContent = jobs.length;
  document.getElementById('tc-rooms').textContent = rooms.length;
  document.getElementById('tc-buysell').textContent = buysell.length;
  document.getElementById('tc-banners').textContent = banners.length;
  document.getElementById('sb-jobs').textContent = jobs.length;
  document.getElementById('sb-rooms').textContent = rooms.length;
  document.getElementById('sb-buysell').textContent = buysell.length;
  document.getElementById('sb-banners').textContent = banners.length;
}

// ─── Jobs ─────────────────────────────────────────────────────────────────
function renderJobFilters() {
  const { jobs } = STATE;
  const d = getDerived();
  const filters = [
    ['all','All',jobs.length],
    ['active','Active',d.activeJobs.length],
    ['inactive','Inactive',d.inactiveJobs.length],
    ['featured','★ Featured',d.featuredJobs.length],
    ['urgent','🔥 Urgent',d.urgentJobs.length],
  ];
  document.getElementById('job-filters').innerHTML = filters.map(([f,l,c]) =>
    `<div class="filter-pill ${STATE.activeJobFilter===f?'active':''}" onclick="setJobFilter('${f}')">${l} (${c})</div>`
  ).join('');
}
function setJobFilter(f) { STATE.activeJobFilter = f; renderJobFilters(); renderJobs(); }
function renderJobs() {
  const search = (document.getElementById('job-search')?.value || '').toLowerCase();
  const f = STATE.activeJobFilter;
  let list = STATE.jobs.filter(j => {
    if (f==='active')   return j.status==='active';
    if (f==='inactive') return j.status==='inactive';
    if (f==='featured') return j.featured;
    if (f==='urgent')   return j.urgent;
    return true;
  }).filter(j => !search || j.title.toLowerCase().includes(search) || j.company.toLowerCase().includes(search) || j.category.toLowerCase().includes(search));

  document.getElementById('job-count').textContent = `${list.length} listing${list.length!==1?'s':''}`;
  document.getElementById('jobs-list').innerHTML = list.length === 0
    ? `<div class="empty-state"><i class="ti ti-briefcase"></i>No listings found.</div>`
    : list.map(j => `
      <div class="listing-card" onclick="openListingModal('job',${j.id})">
        <div class="listing-top">
          <div class="listing-type-badge" style="background:var(--orange-light)">
            <i class="ti ti-briefcase" style="color:var(--orange)"></i>
          </div>
          <div style="flex:1">
            <div class="listing-title">${j.title}</div>
            <div class="listing-meta-line">${j.company} · ${j.category} · ${j.location}</div>
          </div>
          <span class="chip chip-${j.status==='active'?'green':'red'}">${j.status}</span>
        </div>
        <div class="listing-bottom">
          <div class="listing-stats">
            ${j.featured ? '<span class="chip chip-gold">★ Featured</span>' : ''}
            ${j.urgent   ? '<span class="chip chip-red">🔥 Urgent</span>' : ''}
            <span class="listing-stat"><i class="ti ti-eye"></i>${j.views||0}</span>
            <span class="listing-stat"><i class="ti ti-users"></i>${j.applicant_count||0} apps</span>
          </div>
          <div class="listing-actions">
            <div class="icon-btn" onclick="event.stopPropagation();toggleJobStatus(${j.id})">
              <i class="ti ti-${j.status==='active'?'eye-off':'eye'}" style="color:${j.status==='active'?'var(--red)':'var(--green)'}"></i>
            </div>
            <div class="icon-btn" onclick="event.stopPropagation();toggleJobFeatured(${j.id})">
              <i class="ti ti-star" style="color:${j.featured?'var(--gold)':'var(--text3)'}"></i>
            </div>
            <div class="icon-btn" onclick="event.stopPropagation();openListingModal('job',${j.id})">
              <i class="ti ti-dots-horizontal"></i>
            </div>
          </div>
        </div>
      </div>
    `).join('');
}

// ─── Rooms ────────────────────────────────────────────────────────────────
function renderRoomFilters() {
  const { rooms } = STATE;
  const filters = [
    ['all','All',rooms.length],
    ['active','Active',rooms.filter(r=>r.status==='active').length],
    ['inactive','Inactive',rooms.filter(r=>r.status==='inactive').length],
    ['featured','★ Featured',rooms.filter(r=>r.plan_label==='Featured').length],
  ];
  document.getElementById('room-filters').innerHTML = filters.map(([f,l,c]) =>
    `<div class="filter-pill ${STATE.activeRoomFilter===f?'active':''}" onclick="setRoomFilter('${f}')">${l} (${c})</div>`
  ).join('');
}
function setRoomFilter(f) { STATE.activeRoomFilter = f; renderRoomFilters(); renderRooms(); }
function renderRooms() {
  const search = (document.getElementById('room-search')?.value || '').toLowerCase();
  const f = STATE.activeRoomFilter;
  let list = STATE.rooms.filter(r => {
    if (f==='active')   return r.status==='active';
    if (f==='inactive') return r.status==='inactive';
    if (f==='featured') return r.plan_label==='Featured';
    return true;
  }).filter(r => !search || r.area.toLowerCase().includes(search) || r.room_type.toLowerCase().includes(search) || r.for_gender.toLowerCase().includes(search));

  document.getElementById('room-count').textContent = `${list.length} room${list.length!==1?'s':''}`;
  document.getElementById('rooms-list').innerHTML = list.length === 0
    ? `<div class="empty-state"><i class="ti ti-home"></i>No rooms found.</div>`
    : list.map(r => `
      <div class="listing-card" onclick="openListingModal('room',${r.id})">
        <div class="listing-top">
          <div class="listing-type-badge" style="background:var(--blue-light)">
            <i class="ti ti-home" style="color:var(--blue)"></i>
          </div>
          <div style="flex:1">
            <div class="listing-title">${r.room_type} — ${r.area}</div>
            <div class="listing-meta-line">${r.for_gender} · ${r.furnished} · ${r.vacancies} vacanc${r.vacancies===1?'y':'ies'}</div>
          </div>
          <span class="chip chip-${r.status==='active'?'green':'red'}">${r.status}</span>
        </div>
        <div class="listing-bottom">
          <div class="listing-stats">
            <span style="font-size:13px;font-weight:800;color:var(--orange)">₹${r.rent.toLocaleString('en-IN')}/mo</span>
            ${r.plan_label==='Featured' ? '<span class="chip chip-gold">★ Featured</span>' : ''}
          </div>
          <div class="listing-actions">
            <div class="icon-btn" onclick="event.stopPropagation();toggleRoomStatus(${r.id})">
              <i class="ti ti-${r.status==='active'?'eye-off':'eye'}" style="color:${r.status==='active'?'var(--red)':'var(--green)'}"></i>
            </div>
            <div class="icon-btn" onclick="event.stopPropagation();openListingModal('room',${r.id})">
              <i class="ti ti-dots-horizontal"></i>
            </div>
          </div>
        </div>
      </div>
    `).join('');
}

// ─── Buy & Sell ───────────────────────────────────────────────────────────
function renderBuySellFilters() {
  const { buysell } = STATE;
  const filters = [
    ['all','All',buysell.length],
    ['active','Active',buysell.filter(b=>b.status==='active').length],
    ['inactive','Inactive',buysell.filter(b=>b.status==='inactive').length],
    ['featured','★ Featured',buysell.filter(b=>b.featured).length],
  ];
  document.getElementById('buysell-filters').innerHTML = filters.map(([f,l,c]) =>
    `<div class="filter-pill ${STATE.activeBuySellFilter===f?'active':''}" onclick="setBuySellFilter('${f}')">${l} (${c})</div>`
  ).join('');
}
function setBuySellFilter(f) { STATE.activeBuySellFilter = f; renderBuySellFilters(); renderBuySell(); }
function renderBuySell() {
  const search = (document.getElementById('buysell-search')?.value || '').toLowerCase();
  const f = STATE.activeBuySellFilter;
  let list = STATE.buysell.filter(b => {
    if (f==='active')   return b.status==='active';
    if (f==='inactive') return b.status==='inactive';
    if (f==='featured') return b.featured;
    return true;
  }).filter(b => !search || b.title.toLowerCase().includes(search) || b.category.toLowerCase().includes(search) || b.seller.toLowerCase().includes(search));

  document.getElementById('buysell-count').textContent = `${list.length} item${list.length!==1?'s':''}`;
  document.getElementById('buysell-list').innerHTML = list.length === 0
    ? `<div class="empty-state"><i class="ti ti-shopping-bag"></i>No items found.</div>`
    : list.map(b => `
      <div class="listing-card" onclick="openListingModal('buysell',${b.id})">
        <div class="listing-top">
          <div class="listing-type-badge" style="background:var(--red-light)">
            <i class="ti ti-tag" style="color:var(--red)"></i>
          </div>
          <div style="flex:1">
            <div class="listing-title">${b.title}</div>
            <div class="listing-meta-line">${b.category} · ${b.condition} · Seller: ${b.seller}</div>
          </div>
          <span class="chip chip-${b.status==='active'?'green':'red'}">${b.status}</span>
        </div>
        <div class="listing-bottom">
          <div class="listing-stats">
            <span style="font-size:13px;font-weight:800;color:var(--orange)">₹${b.price.toLocaleString('en-IN')}</span>
            ${b.featured ? '<span class="chip chip-gold">★ Featured</span>' : ''}
          </div>
          <div class="listing-actions">
            <div class="icon-btn" onclick="event.stopPropagation();toggleBuySellStatus(${b.id})">
              <i class="ti ti-${b.status==='active'?'eye-off':'eye'}" style="color:${b.status==='active'?'var(--red)':'var(--green)'}"></i>
            </div>
            <div class="icon-btn" onclick="event.stopPropagation();openListingModal('buysell',${b.id})">
              <i class="ti ti-dots-horizontal"></i>
            </div>
          </div>
        </div>
      </div>
    `).join('');
}

// ─── Banners ──────────────────────────────────────────────────────────────
const PLAN_COLORS = { basic:'var(--blue)', popular:'var(--orange)', premium:'var(--purple)' };
const BANNER_STYLE_COLORS = { bold:'#e82828', clean:'#f97316', vivid:'#f97316' };

function renderBannerFilters() {
  const { banners } = STATE;
  const filters = [
    ['all','All',banners.length],
    ['active','Active',banners.filter(b=>b.status==='active').length],
    ['inactive','Expired/Off',banners.filter(b=>b.status==='inactive').length],
    ['premium','Premium',banners.filter(b=>b.plan==='premium').length],
    ['popular','Popular',banners.filter(b=>b.plan==='popular').length],
    ['basic','Basic',banners.filter(b=>b.plan==='basic').length],
  ];
  document.getElementById('banner-filters').innerHTML = filters.map(([f,l,c]) =>
    `<div class="filter-pill ${STATE.activeBannerFilter===f?'active':''}" onclick="setBannerFilter('${f}')">${l} (${c})</div>`
  ).join('');
}
function setBannerFilter(f) { STATE.activeBannerFilter = f; renderBannerFilters(); renderBanners(); }
function renderBanners() {
  const search = (document.getElementById('banner-search')?.value || '').toLowerCase();
  const f = STATE.activeBannerFilter;
  let list = STATE.banners.filter(b => {
    if (f==='active')   return b.status==='active';
    if (f==='inactive') return b.status==='inactive';
    if (f==='premium' || f==='popular' || f==='basic') return b.plan===f;
    return true;
  }).filter(b => !search || b.bizName.toLowerCase().includes(search) || b.category.toLowerCase().includes(search));

  document.getElementById('banner-count').textContent = `${list.length} promotion${list.length!==1?'s':''}`;
  document.getElementById('banners-list').innerHTML = list.length === 0
    ? `<div class="empty-state"><i class="ti ti-speakerphone"></i>No banners found.</div>`
    : list.map(b => {
      const accentColor = BANNER_STYLE_COLORS[b.bannerStyle] || '#f97316';
      const planColor = PLAN_COLORS[b.plan] || 'var(--orange)';
      const planDays = STATE.PROMO_PLANS[b.plan]?.days || 7;
      const planPrice = STATE.PROMO_PLANS[b.plan]?.price || 0;
      const expiryDate = b.expires_at ? new Date(b.expires_at).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) : '—';
      return `
        <div class="promo-card" onclick="openListingModal('banner',${b.id});" style="cursor:pointer;transition:border-color 0.15s" onmouseenter="this.style.borderColor='${accentColor}'" onmouseleave="this.style.borderColor=''">
          <div class="promo-accent" style="background:${accentColor}"></div>
          <div class="promo-info">
            <div class="promo-biz">${b.bizName}</div>
            <div class="promo-tag">${b.tagline || ''}</div>
            <div class="promo-meta">
              <span class="chip chip-${b.status==='active'?'green':'red'}">${b.status}</span>
              <span class="chip" style="background:${planColor}18;color:${planColor};border:1px solid ${planColor}44;text-transform:capitalize">${b.plan}</span>
              <span class="chip chip-gray">${b.category}</span>
              <span class="chip chip-gray">${b.location}</span>
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:15px;font-weight:800;color:${planColor}">₹${planPrice}</div>
            <div style="font-size:10px;color:var(--text3);margin-top:2px">${planDays} days</div>
            <div style="font-size:10px;color:var(--text3);margin-top:3px">Exp: ${expiryDate}</div>
            <div style="margin-top:6px">
              <div class="icon-btn" style="display:inline-flex" onclick="event.stopPropagation();toggleBannerStatus(${b.id})">
                <i class="ti ti-${b.status==='active'?'eye-off':'eye'}" style="color:${b.status==='active'?'var(--red)':'var(--green)'}"></i>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
}

// ─── Users ────────────────────────────────────────────────────────────────
function renderUserFilters() {
  const { users } = STATE;
  const d = getDerived();
  const filters = [
    ['all','All',users.length],
    ['pro','💎 PRO',d.proUsers.length],
    ['banned','Banned',d.bannedUsers.length],
    ['admin','Admin',d.adminUsers.length],
  ];
  document.getElementById('user-filters').innerHTML = filters.map(([f,l,c]) =>
    `<div class="filter-pill ${STATE.activeUserFilter===f?'active':''}" onclick="setUserFilter('${f}')">${l} (${c})</div>`
  ).join('');
}
function setUserFilter(f) { STATE.activeUserFilter = f; renderUserFilters(); renderUsers(); }
function renderUsers() {
  const search = (document.getElementById('user-search')?.value || '').toLowerCase();
  const d = getDerived();
  const f = STATE.activeUserFilter;
  let list = STATE.users.filter(u => {
    if (f==='pro')    return u.premium;
    if (f==='banned') return !u.active;
    if (f==='admin')  return u.role==='admin';
    return true;
  }).filter(u => !search || u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search) || (u.company||'').toLowerCase().includes(search));

  document.getElementById('user-count').textContent = `${list.length} user${list.length!==1?'s':''}`;
  document.getElementById('users-tbody').innerHTML = list.length === 0
    ? `<tr><td colspan="6"><div class="empty-state">No users found.</div></td></tr>`
    : list.map(u => `
      <tr style="cursor:pointer" onclick="openUserModal(${u.id})">
        <td>
          <div class="user-cell">
            <div class="mini-avatar" style="background:${colorForLetter(u.name[0])}">${u.name[0].toUpperCase()}</div>
            <div class="user-name-cell">
              <div class="name">${u.name}</div>
              <div class="email">${u.email}</div>
              ${u.company ? `<div style="font-size:10px;color:var(--orange);font-weight:600">${u.company}</div>` : ''}
            </div>
          </div>
        </td>
        <td><span class="chip chip-${u.role==='admin'?'red':'blue'}">${u.role}</span></td>
        <td><span class="chip chip-${u.premium?'gold':'gray'}">${u.premium?'PRO':'Free'}</span></td>
        <td><span class="chip chip-${u.active?'green':'red'}">${u.active?'Active':'Banned'}</span></td>
        <td style="font-size:12px;color:var(--text2)">${u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'}</td>
        <td>
          <div style="display:flex;gap:4px">
            <div class="icon-btn" onclick="event.stopPropagation();toggleUser(${u.id})">
              <i class="ti ti-${u.active?'ban':'check'}" style="color:${u.active?'var(--red)':'var(--green)'}"></i>
            </div>
            ${!u.premium ? `<div class="icon-btn" onclick="event.stopPropagation();grantPro(${u.id})"><i class="ti ti-diamond" style="color:var(--gold)"></i></div>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
}

// ─── Revenue ──────────────────────────────────────────────────────────────
function renderRevenue() {
  const d = getDerived();
  document.getElementById('rev-kpi-grid').innerHTML = [
    { icon:'ti-star',          value:`₹${d.rev.featured.toLocaleString('en-IN')}`, label:'Featured Jobs',       sub:`${d.featuredJobs.length} jobs`,    color:'var(--gold)',   bg:'var(--gold-light)' },
    { icon:'ti-flame',         value:`₹${d.rev.urgent.toLocaleString('en-IN')}`,   label:'Urgent Badges',       sub:`${d.urgentJobs.length} jobs`,     color:'var(--red)',    bg:'var(--red-light)' },
    { icon:'ti-diamond',       value:`₹${d.rev.pro.toLocaleString('en-IN')}`,      label:'PRO Subscriptions',   sub:`${d.proUsers.length} users`,      color:'var(--purple)', bg:'var(--purple-light)' },
    { icon:'ti-speakerphone',  value:`₹${d.rev.promo.toLocaleString('en-IN')}`,    label:'Promo Banners',       sub:`${STATE.banners.filter(b=>b.status==='active').length} active`, color:'var(--orange)', bg:'var(--orange-light)' },
    { icon:'ti-trending-up',   value:`₹${d.rev.total.toLocaleString('en-IN')}`,    label:'Total Estimated',     color:'var(--green)', bg:'var(--green-light)' },
  ].map(k => `
    <div class="kpi-card" style="--kpi-color:${k.color};--kpi-bg:${k.bg}">
      <div class="kpi-icon"><i class="ti ${k.icon}"></i></div>
      <div class="kpi-value">${k.value}</div>
      <div class="kpi-label">${k.label}</div>
      ${k.sub ? `<div class="kpi-sub">${k.sub}</div>` : ''}
    </div>
  `).join('');

  const revItems = [
    { label:'Featured boosts',    amount:d.rev.featured, color:'var(--gold)' },
    { label:'Urgent badges',      amount:d.rev.urgent,   color:'var(--red)' },
    { label:'PRO subscriptions',  amount:d.rev.pro,      color:'var(--purple)' },
    { label:'Promo banners',      amount:d.rev.promo,    color:'var(--orange)' },
  ];
  document.getElementById('rev-bars').innerHTML = revItems.map(r => {
    const pct = d.rev.total > 0 ? ((r.amount/d.rev.total)*100).toFixed(1) : 0;
    return `<div class="revenue-bar-row">
      <div class="rev-meta">
        <span class="rev-label">${r.label}</span>
        <span class="rev-amount" style="color:${r.color}">₹${r.amount.toLocaleString('en-IN')}</span>
      </div>
      <div class="rev-track"><div class="rev-fill" style="background:${r.color};width:${Math.min(pct,100)}%"></div></div>
      <div class="rev-pct">${pct}% of total</div>
    </div>`;
  }).join('');

  const planSections = [
    { label:'Job plans', plans: STATE.JOB_PLANS },
    { label:'Room plans', plans: STATE.ROOM_PLANS },
    { label:'Buy & Sell plans', plans: STATE.BUYSELL_PLANS },
    { label:'Promo banner plans', plans: Object.entries(STATE.PROMO_PLANS).map(([k,v]) => ({id:k,label:k.charAt(0).toUpperCase()+k.slice(1),price:v.price,description:`${v.days} days`})) },
  ];
  document.getElementById('plans-list').innerHTML = planSections.map((s,si) => `
    <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;${si>0?'margin-top:14px;':''}">${s.label}</div>
    ${s.plans.map(p => `
      <div class="plan-row">
        <div>
          <div class="plan-name">${p.label}</div>
          <div style="font-size:11px;color:var(--text3)">${p.description}</div>
        </div>
        <div class="plan-price">${p.price>0?'₹'+p.price:'Free'}</div>
      </div>
    `).join('')}
    ${si < planSections.length-1 ? '<div class="section-divider"></div>' : ''}
  `).join('');

  document.getElementById('projections').innerHTML = [
    { label:'20 featured jobs/day',   proj:'₹29,400/month', color:'var(--gold)' },
    { label:'30 urgent badges/day',   proj:'₹26,100/month', color:'var(--red)' },
    { label:'100 PRO employers',      proj:'₹49,900/month', color:'var(--purple)' },
    { label:'50 promo banners/month', proj:'₹12,450/month', color:'var(--orange)' },
    { label:'Combined potential',     proj:'₹1,35,000+/mo', color:'var(--green)', bold:true },
  ].map(r => `
    <div class="plan-row">
      <span style="font-size:13px;color:var(--text2);font-weight:${r.bold?'800':'500'}">${r.label}</span>
      <span style="font-size:14px;font-weight:800;color:${r.color}">${r.proj}</span>
    </div>
  `).join('');
}

// ─── Analytics ────────────────────────────────────────────────────────────
function renderActivity() {
  const d = getDerived();
  const { jobs, rooms, buysell, banners, users } = STATE;

  const stats = [
    { label:'Total job listings',      value:jobs.length,                    icon:'ti-briefcase',    color:'var(--orange)' },
    { label:'Active jobs',             value:d.activeJobs.length,            icon:'ti-check',        color:'var(--green)' },
    { label:'Featured jobs',           value:d.featuredJobs.length,          icon:'ti-star',         color:'var(--gold)' },
    { label:'Total rooms/PG',          value:rooms.length,                   icon:'ti-home',         color:'var(--blue)' },
    { label:'Total buy & sell items',  value:buysell.length,                 icon:'ti-tag',          color:'var(--red)' },
    { label:'Active promo banners',    value:d.activeBanners.length,         icon:'ti-speakerphone', color:'var(--purple)' },
    { label:'Total users',             value:users.length,                   icon:'ti-users',        color:'var(--blue)' },
    { label:'PRO users',               value:d.proUsers.length,              icon:'ti-diamond',      color:'var(--purple)' },
    { label:'Total views',             value:d.totalViews.toLocaleString('en-IN'), icon:'ti-eye',    color:'var(--purple)' },
    { label:'Total job applications',  value:d.totalApps,                    icon:'ti-send',         color:'var(--green)' },
  ];
  document.getElementById('platform-stats').innerHTML = stats.map(s => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:28px;height:28px;border-radius:7px;background:${s.color}18;display:flex;align-items:center;justify-content:center">
          <i class="ti ${s.icon}" style="font-size:14px;color:${s.color}"></i>
        </div>
        <span style="font-size:13px;color:var(--text2);font-weight:500">${s.label}</span>
      </div>
      <span style="font-size:14px;font-weight:800;color:var(--text)">${s.value}</span>
    </div>
  `).join('');

  const userBreakdown = [
    { label:'Free users',  count:users.length-d.proUsers.length, color:'var(--text3)' },
    { label:'PRO users',   count:d.proUsers.length,              color:'var(--purple)' },
    { label:'Admin users', count:d.adminUsers.length,            color:'var(--orange)' },
    { label:'Banned users',count:d.bannedUsers.length,           color:'var(--red)' },
  ];
  document.getElementById('user-breakdown').innerHTML = userBreakdown.map(u => {
    const pct = users.length > 0 ? Math.round((u.count/users.length)*100) : 0;
    return `<div class="progress-row">
      <div class="progress-meta">
        <span class="progress-label">${u.label}</span>
        <span class="progress-value" style="color:${u.color}">${u.count} (${pct}%)</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="--p-color:${u.color};width:${pct}%"></div></div>
    </div>`;
  }).join('');

  const catBreakdown = {};
  d.activeJobs.forEach(j => { catBreakdown[j.category] = (catBreakdown[j.category]||0)+1; });
  const cats = Object.entries(catBreakdown).sort((a,b)=>b[1]-a[1]);
  document.getElementById('cat-breakdown').innerHTML = cats.length === 0
    ? '<div class="empty-state"><i class="ti ti-list"></i>No data yet.</div>'
    : cats.map(([cat, count]) => {
      const pct = d.activeJobs.length > 0 ? Math.round((count/d.activeJobs.length)*100) : 0;
      return `<div class="progress-row">
        <div class="progress-meta">
          <span class="progress-label">${cat}</span>
          <span class="progress-value" style="color:var(--orange)">${count} (${pct}%)</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>`;
    }).join('');

  setTimeout(() => renderCharts(d), 100);
}

let chartsInit = false;
let chartDist, chartPlans;

function renderCharts(d) {
  if (!chartsInit) {
    chartsInit = true;
    const { jobs, rooms, buysell, banners } = STATE;

    const ctxDist = document.getElementById('chart-listing-dist');
    if (ctxDist) {
      if (chartDist) chartDist.destroy();
      chartDist = new Chart(ctxDist, {
        type: 'doughnut',
        data: {
          labels: ['Jobs', 'Rooms/PG', 'Buy & Sell', 'Promo Banners'],
          datasets: [{
            data: [jobs.length, rooms.length, buysell.length, banners.length],
            backgroundColor: ['#f97316','#2563eb','#dc2626','#d97706'],
            borderWidth: 2, borderColor: '#fff',
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display:true, position:'bottom', labels:{ boxWidth:10, padding:12, font:{ family:'Sora', size:11 } } } }
        }
      });
    }

    const ctxPlans = document.getElementById('chart-plans');
    if (ctxPlans) {
      if (chartPlans) chartPlans.destroy();
      const featuredCount = jobs.filter(j=>j.featured).length;
      const urgentCount   = jobs.filter(j=>j.urgent).length;
      const freeJobs      = jobs.filter(j=>!j.featured&&!j.urgent).length;
      const premBanners   = STATE.banners.filter(b=>b.plan==='premium').length;
      const popBanners    = STATE.banners.filter(b=>b.plan==='popular').length;
      const basicBanners  = STATE.banners.filter(b=>b.plan==='basic').length;
      chartPlans = new Chart(ctxPlans, {
        type: 'bar',
        data: {
          labels: ['Free Jobs','Featured','Urgent','Basic Promo','Popular Promo','Premium Promo'],
          datasets: [{
            label:'Count',
            data: [freeJobs, featuredCount, urgentCount, basicBanners, popBanners, premBanners],
            backgroundColor: ['#e0e0dc','#f97316','#dc2626','#2563eb','#f97316','#7c3aed'],
            borderRadius: 4,
          }]
        },
        options: {
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{ display:false } },
          scales:{
            y:{ beginAtZero:true, grid:{ color:'#f0f0ec' }, ticks:{ font:{ family:'Sora', size:11 } } },
            x:{ grid:{ display:false }, ticks:{ font:{ family:'Sora', size:10 }, maxRotation:35 } }
          }
        }
      });
    }
  }
}

// ─── Modals ───────────────────────────────────────────────────────────────
function openUserModal(id) {
  const u = STATE.users.find(x => x.id === id);
  if (!u) return;
  document.getElementById('um-avatar').textContent = u.name[0].toUpperCase();
  document.getElementById('um-avatar').style.background = colorForLetter(u.name[0]);
  document.getElementById('um-name').textContent = u.name;
  document.getElementById('um-email').textContent = u.email;
  document.getElementById('um-chips').innerHTML = [
    `<span class="chip chip-${u.role==='admin'?'red':'blue'}">${u.role==='admin'?'Admin':'User'}</span>`,
    `<span class="chip chip-${u.premium?'gold':'gray'}">${u.premium?'PRO':'Free'}</span>`,
    `<span class="chip chip-${u.active?'green':'red'}">${u.active?'Active':'Banned'}</span>`,
    `<span class="chip chip-${u.verified?'green':'gray'}">${u.verified?'Verified':'Unverified'}</span>`,
  ].join('');
  document.getElementById('um-info').innerHTML = [
    ['Joined', u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'],
    ['Role', u.role], ['Plan', u.premium?'PRO':'Free'], ['Company', u.company||'—'],
  ].map(([k,v]) => `<div class="info-row"><span class="info-key">${k}</span><span class="info-val">${v}</span></div>`).join('');
  document.getElementById('um-actions').innerHTML = `
    <button class="modal-btn modal-btn-${u.active?'danger':'green'}" onclick="toggleUser(${u.id});closeModal('user-modal')">${u.active?'Ban user':'Unban user'}</button>
    ${!u.premium ? `<button class="modal-btn modal-btn-orange" onclick="grantPro(${u.id});closeModal('user-modal')">Grant PRO access</button>` : ''}
    <button class="modal-btn modal-btn-${u.verified?'gray':'green'}" onclick="verifyUser(${u.id},${!u.verified});closeModal('user-modal')">${u.verified?'Remove verified badge':'Mark as verified employer'}</button>
    ${u.role!=='admin' ? `<button class="modal-btn modal-btn-gray" onclick="makeAdmin(${u.id});closeModal('user-modal')">Make admin</button>` : ''}
  `;
  document.getElementById('user-modal').classList.add('open');
}

function openListingModal(type, id) {
  let item;
  if (type==='job')     item = STATE.jobs.find(j => j.id===id);
  else if (type==='room')    item = STATE.rooms.find(r => r.id===id);
  else if (type==='buysell') item = STATE.buysell.find(b => b.id===id);
  else if (type==='banner')  item = STATE.banners.find(b => b.id===id);
  if (!item) return;

  const typeLabel = {job:'Job details',room:'Room details',buysell:'Buy & Sell item',banner:'Promo banner'}[type];
  document.getElementById('lm-type-label').textContent = typeLabel;

  if (type==='job') {
    document.getElementById('lm-title').textContent = item.title;
    document.getElementById('lm-sub').textContent = item.company + ' · ' + item.category;
    document.getElementById('lm-chips').innerHTML = [
      `<span class="chip chip-${item.status==='active'?'green':'red'}">${item.status}</span>`,
      `<span class="chip chip-blue">${item.category}</span>`,
      item.featured ? '<span class="chip chip-gold">★ Featured</span>' : '',
      item.urgent   ? '<span class="chip chip-red">🔥 Urgent</span>' : '',
    ].join('');
    document.getElementById('lm-info').innerHTML = [
      ['Location',item.location||'—'],['Salary',item.salary||'—'],
      ['Views',item.views||0],['Applicants',item.applicant_count||0],
      ['Posted',item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN') : '—'],
    ].map(([k,v]) => `<div class="info-row"><span class="info-key">${k}</span><span class="info-val">${v}</span></div>`).join('');
    document.getElementById('lm-actions').innerHTML = `
      <button class="modal-btn modal-btn-${item.status==='active'?'danger':'green'}" onclick="toggleJobStatus(${item.id});closeModal('listing-modal')">${item.status==='active'?'Remove listing':'Restore listing'}</button>
      <button class="modal-btn modal-btn-${item.featured?'gray':'orange'}" onclick="toggleJobFeatured(${item.id});closeModal('listing-modal')">${item.featured?'Remove featured':'★ Feature listing'}</button>
    `;
  } else if (type==='room') {
    document.getElementById('lm-title').textContent = item.room_type + ' — ' + item.area;
    document.getElementById('lm-sub').textContent = item.for_gender + ' · ' + item.furnished;
    document.getElementById('lm-chips').innerHTML = [
      `<span class="chip chip-${item.status==='active'?'green':'red'}">${item.status}</span>`,
      `<span class="chip chip-blue">${item.room_type}</span>`,
      item.plan_label==='Featured' ? '<span class="chip chip-gold">★ Featured</span>' : '',
    ].join('');
    document.getElementById('lm-info').innerHTML = [
      ['Rent','₹'+item.rent.toLocaleString('en-IN')+'/month'],
      ['Gender',item.for_gender],['Vacancies',item.vacancies],
      ['Furnished',item.furnished],['WhatsApp',item.whatsapp],
      ['Plan',item.plan_label],['Posted',item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN') : '—'],
    ].map(([k,v]) => `<div class="info-row"><span class="info-key">${k}</span><span class="info-val">${v}</span></div>`).join('');
    document.getElementById('lm-actions').innerHTML = `
      <button class="modal-btn modal-btn-${item.status==='active'?'danger':'green'}" onclick="toggleRoomStatus(${item.id});closeModal('listing-modal')">${item.status==='active'?'Remove listing':'Restore listing'}</button>
    `;
  } else if (type==='buysell') {
    document.getElementById('lm-title').textContent = item.title;
    document.getElementById('lm-sub').textContent = item.category + ' · ' + item.condition + ' · Seller: ' + item.seller;
    document.getElementById('lm-chips').innerHTML = [
      `<span class="chip chip-${item.status==='active'?'green':'red'}">${item.status}</span>`,
      `<span class="chip chip-blue">${item.category}</span>`,
      item.featured ? '<span class="chip chip-gold">★ Featured</span>' : '',
    ].join('');
    document.getElementById('lm-info').innerHTML = [
      ['Price','₹'+item.price.toLocaleString('en-IN')],
      ['Condition',item.condition],['Seller',item.seller],
      ['Posted',item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN') : '—'],
    ].map(([k,v]) => `<div class="info-row"><span class="info-key">${k}</span><span class="info-val">${v}</span></div>`).join('');
    document.getElementById('lm-actions').innerHTML = `
      <button class="modal-btn modal-btn-${item.status==='active'?'danger':'green'}" onclick="toggleBuySellStatus(${item.id});closeModal('listing-modal')">${item.status==='active'?'Remove item':'Restore item'}</button>
    `;
  } else if (type==='banner') {
    document.getElementById('lm-title').textContent = item.bizName;
    document.getElementById('lm-sub').textContent = item.tagline || item.category;
    const planColor = PLAN_COLORS[item.plan] || 'var(--orange)';
    document.getElementById('lm-chips').innerHTML = [
      `<span class="chip chip-${item.status==='active'?'green':'red'}">${item.status}</span>`,
      `<span class="chip" style="background:${planColor}18;color:${planColor};border:1px solid ${planColor}44;text-transform:capitalize">${item.plan}</span>`,
      `<span class="chip chip-blue">${item.bannerStyle}</span>`,
    ].join('');
    const planDays = STATE.PROMO_PLANS[item.plan]?.days || 7;
    const planPrice = STATE.PROMO_PLANS[item.plan]?.price || 0;
    document.getElementById('lm-info').innerHTML = [
      ['Business',item.bizName],['Category',item.category],
      ['Location',item.location],['Phone',item.phone],
      ['Plan',item.plan+' (₹'+planPrice+' / '+planDays+' days)'],
      ['Expires',item.expires_at ? new Date(item.expires_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'],
    ].map(([k,v]) => `<div class="info-row"><span class="info-key">${k}</span><span class="info-val">${v}</span></div>`).join('');
    document.getElementById('lm-actions').innerHTML = `
      <button class="modal-btn modal-btn-${item.status==='active'?'danger':'green'}" onclick="toggleBannerStatus(${item.id});closeModal('listing-modal')">${item.status==='active'?'Deactivate banner':'Activate banner'}</button>
    `;
  }
  document.getElementById('listing-modal').classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ─── Actions ──────────────────────────────────────────────────────────────
function toggleJobStatus(id) {
  const j = STATE.jobs.find(x=>x.id===id);
  if (j) j.status = j.status==='active' ? 'inactive' : 'active';
  showToast(j.status==='active' ? 'Job restored' : 'Job removed');
  renderJobs(); renderOverview();
}
function toggleJobFeatured(id) {
  const j = STATE.jobs.find(x=>x.id===id);
  if (j) j.featured = !j.featured;
  showToast(j.featured ? 'Job featured!' : 'Feature removed');
  renderJobs(); renderOverview();
}
function toggleRoomStatus(id) {
  const r = STATE.rooms.find(x=>x.id===id);
  if (r) r.status = r.status==='active' ? 'inactive' : 'active';
  showToast('Room listing updated');
  renderRooms(); renderOverview();
}
function toggleBuySellStatus(id) {
  const b = STATE.buysell.find(x=>x.id===id);
  if (b) b.status = b.status==='active' ? 'inactive' : 'active';
  showToast('Item updated');
  renderBuySell(); renderOverview();
}
function toggleBannerStatus(id) {
  const b = STATE.banners.find(x=>x.id===id);
  if (b) b.status = b.status==='active' ? 'inactive' : 'active';
  showToast(b.status==='active' ? 'Banner activated' : 'Banner deactivated');
  renderBanners(); renderOverview();
}
function toggleUser(id) {
  const u = STATE.users.find(x=>x.id===id);
  if (u) u.active = !u.active;
  showToast(u.active ? 'User unbanned' : 'User banned');
  renderUsers(); renderOverview();
}
function grantPro(id) {
  const u = STATE.users.find(x=>x.id===id);
  if (u) u.premium = true;
  showToast('PRO access granted!');
  renderUsers(); renderOverview();
}
function verifyUser(id, shouldVerify) {
  const u = STATE.users.find(x=>x.id===id);
  if (u) u.verified = shouldVerify;
  showToast(shouldVerify ? 'Employer verified!' : 'Verified badge removed');
  renderUsers();
}
function makeAdmin(id) {
  const u = STATE.users.find(x=>x.id===id);
  if (u) u.role = 'admin';
  showToast('Admin role granted');
  renderUsers();
}

// ─── Notify ───────────────────────────────────────────────────────────────
function openNotify() { document.getElementById('notify-modal').classList.add('open'); }
function setTarget(el) {
  document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  STATE.notifyTarget = el.dataset.target;
}
function sendNotification() {
  const title = document.getElementById('notif-title').value;
  const body  = document.getElementById('notif-body').value;
  if (!title || !body) return;
  showToast('Notification sent!');
  document.getElementById('notif-title').value = '';
  document.getElementById('notif-body').value = '';
  closeModal('notify-modal');
}

// ─── Refresh ──────────────────────────────────────────────────────────────
function onRefresh() {
  renderOverview(); renderJobFilters(); renderJobs(); renderRoomFilters(); renderRooms();
  renderBuySellFilters(); renderBuySell(); renderBannerFilters(); renderBanners();
  renderUserFilters(); renderUsers(); renderRevenue(); renderActivity();
  showToast('Data refreshed');
}

// ─── Toast ────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ─── Helpers ──────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#f97316','#2563eb','#16a34a','#7c3aed','#d97706','#dc2626','#0891b2','#db2777'];
function colorForLetter(c) {
  const idx = (c.toUpperCase().charCodeAt(0) - 65) % AVATAR_COLORS.length;
  return AVATAR_COLORS[Math.max(0, idx)];
}

document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
});

// ─── Init ─────────────────────────────────────────────────────────────────
renderOverview();
renderJobFilters(); renderJobs();
renderRoomFilters(); renderRooms();
renderBuySellFilters(); renderBuySell();
renderBannerFilters(); renderBanners();
renderUserFilters(); renderUsers();
renderRevenue();
renderActivity();
</script>
</body>
</html>
