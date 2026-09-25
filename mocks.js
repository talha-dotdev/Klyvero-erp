/* ==========================================================================
   Klyvero interface mockups.

   These are hand-coded UI compositions (real HTML/CSS/SVG), not photos —
   built directly from the real product's own structure: the actual sidebar
   navigation groups and labels (Sidebar.jsx), and the actual dashboard
   chart titles ("Sales Trend (7 days)", "Purchases Trend (7 days)",
   "Revenue Trend (4 weeks)", "Inventory by Category") from
   frontend/src/features/dashboard/components/. Numbers shown are
   illustrative UI demonstration data, not real business figures.
   ========================================================================== */

const NAV_ITEMS = [
  { label: "Dashboard", icon: "M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" },
  { label: "Customers", icon: "M12 4a4 4 0 100 8 4 4 0 000-8zM4 20c0-4 3.5-7 8-7s8 3 8 7" },
  { label: "Suppliers", icon: "M3 7h18l-1.5 12a2 2 0 01-2 2h-11a2 2 0 01-2-2z" },
  { label: "Purchases", icon: "M3 3h2l2.4 12.2a2 2 0 002 1.8h8.4a2 2 0 002-1.7L21 8H6" },
  { label: "Sales", icon: "M3 3v18h18M7 15l4-4 3 3 5-6" },
  { label: "Inventory", icon: "M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7" },
  { label: "Reports", icon: "M3 3h18v18H3zM8 13v4M12 9v8M16 12v5" },
  { label: "Settings", icon: "M12 15a3 3 0 100-6 3 3 0 000 6z" },
];

function icon(d) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="${d}"/></svg>`;
}

function sidebar(activeLabel) {
  return `
  <div class="mock-sb">
    <div class="mock-sb__brand"><img src="assets/klyvero-mark-256.png" width="20" height="20" alt="" />Klyvero</div>
    <div class="mock-sb__items">
      ${NAV_ITEMS.map(i => `<div class="mock-sb__item${i.label === activeLabel ? " is-active" : ""}">${icon(i.icon)}<span>${i.label}</span></div>`).join("")}
    </div>
  </div>`;
}

function topbar(title) {
  return `
  <div class="mock-top">
    <span class="mock-top__title">${title}</span>
    <div class="mock-top__user"><span class="mock-top__avatar"></span></div>
  </div>`;
}

function kpi(label, value, delta, positive) {
  return `
  <div class="mock-kpi">
    <span class="mock-kpi__l">${label}</span>
    <span class="mock-kpi__v">${value}</span>
    <span class="mock-kpi__d ${positive ? "up" : "down"}">${delta}</span>
  </div>`;
}

function lineChart(title, points, color) {
  const w = 100, h = 40;
  const max = Math.max(...points), min = Math.min(...points);
  const step = w / (points.length - 1);
  const path = points.map((p, i) => {
    const x = i * step;
    const y = h - ((p - min) / (max - min || 1)) * (h - 6) - 3;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return `
  <div class="mock-chart">
    <span class="mock-chart__title">${title}</span>
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="mock-chart__svg">
      <path d="${path}" fill="none" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke" />
    </svg>
  </div>`;
}

function barChart(title, points, color) {
  const max = Math.max(...points);
  return `
  <div class="mock-chart">
    <span class="mock-chart__title">${title}</span>
    <div class="mock-bars">
      ${points.map(p => `<span style="height:${Math.max(8, (p / max) * 100)}%;background:${color}"></span>`).join("")}
    </div>
  </div>`;
}

function donut(title, sub, segs) {
  const total = segs.reduce((a, s) => a + s.v, 0);
  let acc = 0;
  const R = 15.9155;
  const circles = segs.map(s => {
    const pct = (s.v / total) * 100;
    const dash = `${pct} ${100 - pct}`;
    const offset = 25 - acc;
    acc += pct;
    return `<circle r="${R}" cx="21" cy="21" fill="transparent" stroke="${s.c}" stroke-width="5.5" stroke-dasharray="${dash}" stroke-dashoffset="${offset}"></circle>`;
  }).join("");
  return `
  <div class="mock-donut">
    <div class="mock-donut__chart">
      <svg viewBox="0 0 42 42">${circles}</svg>
    </div>
    <div>
      <span class="mock-chart__title">${title}</span>
      <span class="mock-donut__sub">${sub}</span>
      <div class="mock-donut__legend">
        ${segs.map(s => `<span><i style="background:${s.c}"></i>${s.label}</span>`).join("")}
      </div>
    </div>
  </div>`;
}

function table(cols, rows) {
  return `
  <div class="mock-table">
    <div class="mock-table__row mock-table__row--head">${cols.map(c => `<span>${c}</span>`).join("")}</div>
    ${rows.map(r => `<div class="mock-table__row">${r.map(c => `<span>${c}</span>`).join("")}</div>`).join("")}
  </div>`;
}

/* ---------------- Dashboard panel (hero + showcase) ---------------- */
function dashboardPanel() {
  return `
  <div class="mock-shell">
    ${sidebar("Dashboard")}
    <div class="mock-main">
      ${topbar("Dashboard")}
      <div class="mock-kpirow">
        ${kpi("Sales (7d)", "PKR 482K", "+12.4%", true)}
        ${kpi("Purchases (7d)", "PKR 210K", "+3.1%", true)}
        ${kpi("Low Stock Items", "6", "-2", true)}
        ${kpi("Outstanding", "PKR 94K", "+5.6%", false)}
      </div>
      <div class="mock-chartrow">
        ${lineChart("Sales Trend (7 days)", [30, 42, 38, 55, 48, 62, 58], "#2563eb")}
        ${lineChart("Purchases Trend (7 days)", [20, 24, 22, 30, 26, 33, 29], "#0ea5e9")}
      </div>
      <div class="mock-chartrow mock-chartrow--split">
        ${barChart("Revenue Trend (4 weeks)", [40, 55, 48, 66], "#6d28d9")}
        ${donut("Inventory by Category", "Distribution of stock units", [
          { label: "Raw Material", v: 45, c: "#2563eb" },
          { label: "Finished Goods", v: 30, c: "#0ea5e9" },
          { label: "Scrap", v: 25, c: "#6d28d9" },
        ])}
      </div>
    </div>
  </div>`;
}

/* ---------------- Sales panel ---------------- */
function salesPanel() {
  return `
  <div class="mock-shell">
    ${sidebar("Sales")}
    <div class="mock-main">
      ${topbar("Sales")}
      <div class="mock-kpirow">
        ${kpi("Today", "PKR 62K", "+8.2%", true)}
        ${kpi("This Month", "PKR 482K", "+12.4%", true)}
        ${kpi("Invoices", "38", "+4", true)}
      </div>
      ${table(
        ["Invoice", "Customer", "Amount", "Status"],
        [
          ["INV-1042", "Al-Rehman Traders", "PKR 24,500", "Paid"],
          ["INV-1041", "Sarwar Metals", "PKR 61,200", "Partial"],
          ["INV-1040", "Walk-in Customer", "PKR 4,800", "Paid"],
          ["INV-1039", "City Hardware", "PKR 18,900", "Pending"],
        ]
      )}
    </div>
  </div>`;
}

/* ---------------- Inventory panel ---------------- */
function inventoryPanel() {
  return `
  <div class="mock-shell">
    ${sidebar("Inventory")}
    <div class="mock-main">
      ${topbar("Inventory")}
      <div class="mock-chartrow mock-chartrow--split">
        ${donut("Inventory by Category", "Distribution of stock units", [
          { label: "Raw Material", v: 45, c: "#2563eb" },
          { label: "Finished Goods", v: 30, c: "#0ea5e9" },
          { label: "Scrap", v: 25, c: "#6d28d9" },
        ])}
        ${barChart("Stock Movement (7 days)", [50, 38, 60, 44, 66, 52, 70], "#2563eb")}
      </div>
      ${table(
        ["Product", "Warehouse", "In Stock", "Status"],
        [
          ["Steel Sheet 2mm", "Main Warehouse", "1,240 kg", "In Stock"],
          ["Copper Wire Roll", "Main Warehouse", "18 units", "Low Stock"],
          ["Aluminum Scrap", "Yard 2", "3,600 kg", "In Stock"],
        ]
      )}
    </div>
  </div>`;
}

/* ---------------- Reports panel ---------------- */
function reportsPanel() {
  return `
  <div class="mock-shell">
    ${sidebar("Reports")}
    <div class="mock-main">
      ${topbar("Reports")}
      <div class="mock-chartrow">
        ${lineChart("Sales Trend (7 days)", [30, 42, 38, 55, 48, 62, 58], "#2563eb")}
        ${lineChart("Purchases Trend (7 days)", [20, 24, 22, 30, 26, 33, 29], "#0ea5e9")}
      </div>
      ${barChart("Revenue Trend (4 weeks)", [40, 55, 48, 66], "#6d28d9")}
    </div>
  </div>`;
}

document.addEventListener("DOMContentLoaded", () => {
  const heroMock = document.getElementById("dashMock");
  if (heroMock) heroMock.innerHTML = `
    <div class="hero__frame-bar"><span></span><span></span><span></span></div>
    ${dashboardPanel()}`;

  const panels = {
    dashboard: dashboardPanel,
    sales: salesPanel,
    inventory: inventoryPanel,
    reports: reportsPanel,
  };
  document.querySelectorAll(".device[data-mock]").forEach(el => {
    const kind = el.getAttribute("data-mock");
    el.innerHTML = `<div class="device__bar"><span></span><span></span><span></span></div>${panels[kind] ? panels[kind]() : ""}`;
  });
});
