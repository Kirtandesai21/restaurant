import cds from '@sap/cds';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

cds.on('bootstrap', (app) => {
  // Candidate locations for Trattoria UI in both local dev and production CF container
  const candidates = [
    path.resolve(__dirname, '../app/trattoria/webapp'),
    path.resolve(__dirname, '../app/trattoria'),
    path.resolve(__dirname, '../app/webapp'),
    path.resolve(__dirname, '../app')
  ];
  const trattoriaPath = candidates.find(p => fs.existsSync(path.join(p, 'index.html'))) || candidates[0];

  const serveTrattoria = (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.sendFile(path.join(trattoriaPath, 'index.html'));
  };

  app.use('/trattoria', express.static(trattoriaPath, {
    etag: false,
    maxAge: 0,
    setHeaders: (res) => {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
  }));

  app.get(['/trattoria', '/trattoria/', '/trattoria/index.html'], serveTrattoria);

  // Serve CAP's internal assets (.cap stylesheets and scripts for native index)
  try {
    const cdsPkg = require.resolve('@sap/cds/package.json');
    const cdsAppDir = path.resolve(path.dirname(cdsPkg), 'app');
    app.use('/.cap', express.static(cdsAppDir));
  } catch (err) {
    // fallback
  }

  // Helper to reliably render CAP's built-in native index in all environments (including production)
  const sendNativeIndex = (req, res, next) => {
    try {
      const index = require('@sap/cds/app/index.js');
      return res.send(index.html);
    } catch (e) {
      if (next) return next(e);
      res.redirect('/backend');
    }
  };

  // Dedicated routes for native CAP index
  app.get(['/native-index', '/index'], (req, res, next) => sendNativeIndex(req, res, next));

  // Dedicated Backend Management Console
  app.get('/backend', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restaurant Service • CAP Backend Console</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    code, pre, .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen">
  
  <!-- Navigation Header -->
  <header class="border-b border-slate-800 bg-slate-950/70 backdrop-blur sticky top-0 z-20">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-9 h-9 rounded-lg bg-teal-500 text-slate-950 font-bold flex items-center justify-center text-lg shadow-lg shadow-teal-500/20">
          CAP
        </div>
        <div>
          <h1 class="text-sm font-bold text-white tracking-wide">RestaurantService Backend</h1>
          <p class="text-[11px] text-slate-400 font-mono">SAP Cloud Application Programming Model • OData V4</p>
        </div>
      </div>
      <div class="flex items-center space-x-3">
        <a href="/trattoria" class="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          <span>Return to Trattoria POS</span>
        </a>
        <a href="/native-index" class="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700">
          <span>Native Index</span>
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </a>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    
    <!-- Hero / Status Banner -->
    <div class="p-6 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Service Active & Serving</span>
        </div>
        <h2 class="text-xl font-bold text-white">OData V4 Restaurant Service Console</h2>
        <p class="text-xs text-slate-400 mt-1 max-w-xl">
          Direct access to CAP OData endpoints, schema metadata, Fiori Elements previews, and entity queries.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a href="/odata/v4/restaurant/" target="_blank" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono font-semibold transition border border-slate-700 flex items-center gap-1.5 shadow">
          <span>Service Root</span>
          <span class="text-slate-400">&rarr;</span>
        </a>
        <a href="/odata/v4/restaurant/$metadata" target="_blank" class="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-lg shadow-teal-500/20">
          <span>$metadata (EDMX)</span>
          <span>&rarr;</span>
        </a>
      </div>
    </div>

    <!-- Section: Fiori Elements Apps -->
    <section>
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-base font-bold text-white">SAP Fiori Elements UI Previews</h3>
          <p class="text-xs text-slate-400">Autogenerated enterprise list report & object page interfaces</p>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="/$fiori-preview/RestaurantService/Orders#preview-app" target="_blank" class="p-5 rounded-xl bg-slate-800/60 border border-slate-700/80 hover:border-teal-500/50 hover:bg-slate-800 transition group block">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 font-bold border border-teal-500/20">Draft Enabled</span>
            <span class="text-xs text-slate-400 group-hover:text-teal-400 font-mono transition">&nearr; Open Preview</span>
          </div>
          <h4 class="font-bold text-base text-white group-hover:text-teal-300 transition">Orders Management</h4>
          <p class="text-xs text-slate-400 mt-1">Full enterprise list report with status dropdown filters, Pay Bill action button, line item compositions, and criticality colors.</p>
        </a>

        <a href="/$fiori-preview/RestaurantService/Menu#preview-app" target="_blank" class="p-5 rounded-xl bg-slate-800/60 border border-slate-700/80 hover:border-teal-500/50 hover:bg-slate-800 transition group block">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-bold border border-slate-600">Full CRUD</span>
            <span class="text-xs text-slate-400 group-hover:text-teal-400 font-mono transition">&nearr; Open Preview</span>
          </div>
          <h4 class="font-bold text-base text-white group-hover:text-teal-300 transition">Menu Catalog</h4>
          <p class="text-xs text-slate-400 mt-1">Catalog list report with category filters, prices, and live available inventory stock.</p>
        </a>

        <a href="/$fiori-preview/RestaurantService/ActiveOrders#preview-app" target="_blank" class="p-5 rounded-xl bg-slate-800/60 border border-slate-700/80 hover:border-sky-500/50 hover:bg-slate-800 transition group block">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 font-bold border border-sky-500/20">CDS View</span>
            <span class="text-xs text-slate-400 group-hover:text-sky-400 font-mono transition">&nearr; Open Preview</span>
          </div>
          <h4 class="font-bold text-base text-white group-hover:text-sky-300 transition">Active Orders (Live Queue)</h4>
          <p class="text-xs text-slate-400 mt-1">Kitchen & Cashier CDS View filtering only Open and Received customer orders computed on HANA.</p>
        </a>

        <a href="/$fiori-preview/RestaurantService/CategorySales#preview-app" target="_blank" class="p-5 rounded-xl bg-slate-800/60 border border-slate-700/80 hover:border-emerald-500/50 hover:bg-slate-800 transition group block">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/20">CDS View Analytics</span>
            <span class="text-xs text-slate-400 group-hover:text-emerald-400 font-mono transition">&nearr; Open Preview</span>
          </div>
          <h4 class="font-bold text-base text-white group-hover:text-emerald-300 transition">Sales by Category</h4>
          <p class="text-xs text-slate-400 mt-1">Analytical CDS View aggregating total dishes sold, completed orders, and revenue generated per category.</p>
        </a>

        <a href="/$fiori-preview/RestaurantService/TotalSales#preview-app" target="_blank" class="p-5 rounded-xl bg-slate-800/60 border border-slate-700/80 hover:border-emerald-500/50 hover:bg-slate-800 transition group block">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/20">Analytics</span>
            <span class="text-xs text-slate-400 group-hover:text-emerald-400 font-mono transition">&nearr; Open Preview</span>
          </div>
          <h4 class="font-bold text-base text-white group-hover:text-emerald-300 transition">Total Sales (Day-Wise)</h4>
          <p class="text-xs text-slate-400 mt-1">Daily aggregated sales report tracking total paid revenue (₹), paid bill counts, and open pending orders.</p>
        </a>
      </div>
    </section>

    <!-- Section: Core Data Endpoints -->
    <section>
      <div class="mb-4">
        <h3 class="text-base font-bold text-white">Live OData Entity Sets</h3>
        <p class="text-xs text-slate-400">Direct HTTP JSON feeds served by CAP</p>
      </div>

      <div class="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[11px]">
            <tr>
              <th class="py-3 px-4">Entity</th>
              <th class="py-3 px-4">Method / Endpoint</th>
              <th class="py-3 px-4 hidden md:table-cell">Description</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 font-mono text-[12px]">
            
            <!-- Orders -->
            <tr class="hover:bg-slate-900/40 transition">
              <td class="py-3.5 px-4 font-bold text-white">Orders</td>
              <td class="py-3.5 px-4 text-teal-400 truncate max-w-xs">
                <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] mr-1.5 font-sans font-bold">GET</span>
                /odata/v4/restaurant/Orders
              </td>
              <td class="py-3.5 px-4 text-slate-400 font-sans hidden md:table-cell">Active customer orders and bill statuses</td>
              <td class="py-3.5 px-4 text-right space-x-2">
                <a href="/odata/v4/restaurant/Orders" target="_blank" class="text-slate-300 hover:text-white underline">Raw</a>
                <a href="/odata/v4/restaurant/Orders?$expand=Items($expand=menuItem)" target="_blank" class="text-teal-400 hover:text-teal-300 font-bold underline">$expand Items</a>
              </td>
            </tr>

            <!-- Menu -->
            <tr class="hover:bg-slate-900/40 transition">
              <td class="py-3.5 px-4 font-bold text-white">Menu</td>
              <td class="py-3.5 px-4 text-teal-400 truncate max-w-xs">
                <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] mr-1.5 font-sans font-bold">GET</span>
                /odata/v4/restaurant/Menu
              </td>
              <td class="py-3.5 px-4 text-slate-400 font-sans hidden md:table-cell">Dishes, categories, prices, and stock</td>
              <td class="py-3.5 px-4 text-right">
                <a href="/odata/v4/restaurant/Menu" target="_blank" class="text-teal-400 hover:text-teal-300 font-bold underline">Open JSON</a>
              </td>
            </tr>

            <!-- OrderItems -->
            <tr class="hover:bg-slate-900/40 transition">
              <td class="py-3.5 px-4 font-bold text-white">OrderItems</td>
              <td class="py-3.5 px-4 text-teal-400 truncate max-w-xs">
                <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] mr-1.5 font-sans font-bold">GET</span>
                /odata/v4/restaurant/OrderItems
              </td>
              <td class="py-3.5 px-4 text-slate-400 font-sans hidden md:table-cell">Composition line items attached to orders</td>
              <td class="py-3.5 px-4 text-right">
                <a href="/odata/v4/restaurant/OrderItems" target="_blank" class="text-teal-400 hover:text-teal-300 font-bold underline">Open JSON</a>
              </td>
            </tr>

            <!-- TotalSales -->
            <tr class="hover:bg-slate-900/40 transition">
              <td class="py-3.5 px-4 font-bold text-emerald-400">TotalSales</td>
              <td class="py-3.5 px-4 text-teal-400 truncate max-w-xs">
                <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] mr-1.5 font-sans font-bold">GET</span>
                /odata/v4/restaurant/TotalSales
              </td>
              <td class="py-3.5 px-4 text-slate-400 font-sans hidden md:table-cell">Day-wise aggregated sales, paid revenue & order counts</td>
              <td class="py-3.5 px-4 text-right">
                <a href="/odata/v4/restaurant/TotalSales" target="_blank" class="text-emerald-400 hover:text-emerald-300 font-bold underline">Open JSON</a>
              </td>
            </tr>

            <!-- ActiveOrders (CDS View) -->
            <tr class="hover:bg-slate-900/40 transition">
              <td class="py-3.5 px-4 font-bold text-sky-400">ActiveOrders (CDS View)</td>
              <td class="py-3.5 px-4 text-teal-400 truncate max-w-xs">
                <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] mr-1.5 font-sans font-bold">GET</span>
                /odata/v4/restaurant/ActiveOrders
              </td>
              <td class="py-3.5 px-4 text-slate-400 font-sans hidden md:table-cell">Live kitchen queue filtering only Open & Received orders</td>
              <td class="py-3.5 px-4 text-right">
                <a href="/odata/v4/restaurant/ActiveOrders" target="_blank" class="text-sky-400 hover:text-sky-300 font-bold underline">Open JSON</a>
              </td>
            </tr>

            <!-- CategorySales (CDS View) -->
            <tr class="hover:bg-slate-900/40 transition">
              <td class="py-3.5 px-4 font-bold text-emerald-400">CategorySales (CDS View)</td>
              <td class="py-3.5 px-4 text-teal-400 truncate max-w-xs">
                <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] mr-1.5 font-sans font-bold">GET</span>
                /odata/v4/restaurant/CategorySales
              </td>
              <td class="py-3.5 px-4 text-slate-400 font-sans hidden md:table-cell">HANA-aggregated sales revenue, quantities & orders by dish category</td>
              <td class="py-3.5 px-4 text-right">
                <a href="/odata/v4/restaurant/CategorySales" target="_blank" class="text-emerald-400 hover:text-emerald-300 font-bold underline">Open JSON</a>
              </td>
            </tr>

            <!-- Action: pay -->
            <tr class="hover:bg-slate-900/40 transition">
              <td class="py-3.5 px-4 font-bold text-amber-300">Orders/pay</td>
              <td class="py-3.5 px-4 text-amber-400 truncate max-w-xs">
                <span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] mr-1.5 font-sans font-bold">POST</span>
                Orders(...)/pay
              </td>
              <td class="py-3.5 px-4 text-slate-400 font-sans hidden md:table-cell">Bound action: settles bill, marks Paid & Completed</td>
              <td class="py-3.5 px-4 text-right text-slate-500 italic font-sans">
                Bound Action
              </td>
            </tr>

            <!-- CodeLists -->
            <tr class="hover:bg-slate-900/40 transition">
              <td class="py-3.5 px-4 font-bold text-white">Status CodeLists</td>
              <td class="py-3.5 px-4 text-teal-400">
                <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] mr-1.5 font-sans font-bold">GET</span>
                OrderStatuses / PaymentStatuses / PaymentMethods
              </td>
              <td class="py-3.5 px-4 text-slate-400 font-sans hidden md:table-cell">Fixed-value enum lists powering Fiori select dropdowns</td>
              <td class="py-3.5 px-4 text-right space-x-2">
                <a href="/odata/v4/restaurant/OrderStatuses" target="_blank" class="text-slate-300 hover:text-white underline">Order</a>
                <a href="/odata/v4/restaurant/PaymentStatuses" target="_blank" class="text-slate-300 hover:text-white underline">Payment</a>
                <a href="/odata/v4/restaurant/PaymentMethods" target="_blank" class="text-slate-300 hover:text-white underline">Method</a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

  </main>

  <footer class="mt-12 border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 font-mono">
    Trattoria Moderna • SAP Cloud Application Programming Model (CAP) Node.js runtime
  </footer>

</body>
</html>`);
  });

  // Redirect root GET requests to /trattoria unless explicitly requesting backend/native index
  app.get('/', (req, res, next) => {
    if (req.query.backend !== undefined || req.query.index !== undefined) {
      return sendNativeIndex(req, res, next);
    }
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return res.redirect('/trattoria');
    }
    next();
  });
});

export default cds.server;
