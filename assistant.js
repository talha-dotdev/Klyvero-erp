/* ==========================================================================
   Klyvero Assistant — product advisor for the Klyvero ERP marketing site.

   Architecture: fully client-side, no AI API and no backend, so there are
   no keys to protect and nothing a visitor types ever leaves their browser.
   Every answer is written from the content already on this website
   (index.html). It is lazy-loaded the first time the launcher is used.

   Single source of truth: the checkout link, price, WhatsApp link and email
   are READ FROM THE PAGE at runtime (pricing card + contact cards), so this
   file never contains a second copy of any of them.
   ========================================================================== */
(function () {
  "use strict";
  if (window.KlyveroAssistant) return;

  /* ------------------------------------------------------------------ */
  /* Live page values                                                    */
  /* ------------------------------------------------------------------ */
  const q = (s, r) => (r || document).querySelector(s);
  const page = {
    buyHref: () => { const a = q(".pricing-card a.lemonsqueezy-button"); return a ? a.getAttribute("href") : null; },
    demoHref: () => { const a = q("a[data-demo-link]"); return a ? a.getAttribute("href") : null; },
    price: () => { const e = q(".pricing-card__amount"); return e ? e.textContent.trim() : "$69"; },
    wa: () => { const a = q('.contact-card[href*="wa.me"]'); return a ? a.getAttribute("href") : null; },
    mail: () => { const a = q('.contact-card[href^="mailto:"]'); return a ? a.getAttribute("href").replace(/^mailto:/, "") : null; }
  };

  /* ------------------------------------------------------------------ */
  /* State                                                               */
  /* ------------------------------------------------------------------ */
  const S = { open: false, started: false, busy: false, step: null, profile: {}, botCount: 0, lastBuy: -99 };
  let panel, log, input, launcher, typingEl;

  /* ------------------------------------------------------------------ */
  /* Shared link / action definitions                                    */
  /* ------------------------------------------------------------------ */
  const LINK = {
    features: { t: "link", l: "See Klyvero Features", to: "#features" },
    how: { t: "link", l: "See How It Works", to: "#how" },
    pricing: { t: "link", l: "View Pricing", to: "#pricing" },
    preview: { t: "link", l: "View Product Preview", to: "#preview" },
    security: { t: "link", l: "Security & Privacy", to: "#features" },
    faq: { t: "link", l: "Read the FAQ", to: "#faq" },
    contact: { t: "link", l: "Contact Klyvero", to: "#contact" }
  };
  const BUY = { t: "buy" };
  const DEMO = { t: "demo" };
  const CHIP = (l, qtext) => ({ t: "chip", l, q: qtext || l });
  const ASK = { t: "chip", l: "Ask a Question", q: "Ask a Question" };
  const contactActions = () => [{ t: "wa" }, { t: "mail" }, { t: "lead", l: "Tell us about your business" }];

  /* ------------------------------------------------------------------ */
  /* Discovery flow                                                      */
  /* ------------------------------------------------------------------ */
  const FLOW = {
    biz: { ask: "What kind of business are you managing?", opts: ["Retail", "Wholesale", "Trading", "Distribution", "Other"], next: "how" },
    how: { ask: "How do you manage things today?", opts: ["Paper records", "Spreadsheets", "Another software", "Not organized yet"], next: "focus" },
    focus: { ask: "What are you mainly trying to organize?", opts: ["Inventory", "Sales", "Purchases", "Invoices & Payments", "Customers & Suppliers", "Everything in one system"], next: "platform" },
    platform: { ask: "Are you looking for Windows/local software or cloud software?", opts: ["Windows / local software", "Cloud software", "Not sure"], next: null }
  };
  const FOCUS_TEXT = {
    "Inventory": "Klyvero ERP includes inventory management with live stock levels, organization by category and warehouse, and full stock movement history. It is connected to sales and purchases, so stock updates as purchases come in and sales go out.",
    "Sales": "Klyvero ERP lets you record customer and walk-in sales against real stock and customer accounts, with automatic stock updates and invoices generated from the sale.",
    "Purchases": "In Klyvero ERP, every purchase updates your stock, and supplier records and purchase relationships are kept organized and searchable.",
    "Invoices & Payments": "Klyvero ERP lets you create and manage business invoices (including from sales), and track payments and outstanding balances where supported.",
    "Customers & Suppliers": "Klyvero ERP keeps customer records, balances and full transaction history in one place, along with supplier records and purchase relationships.",
    "Everything in one system": "Klyvero ERP connects sales, purchases, inventory, customers, suppliers, invoices, payments, expenses and reports in one application, so every area draws from the same, current records."
  };

  function startDiscovery() { S.profile = {}; askStep("biz"); }

  function askStep(step) {
    S.step = step;
    const f = FLOW[step];
    addBot({
      intent: "flow-" + step,
      text: [(step === "biz" ? "Happy to help you work out whether Klyvero fits. A few quick questions. " : "") + f.ask],
      actions: f.opts.map(o => ({ t: "flow", step, v: o, l: o }))
    });
  }

  function takeFlowAnswer(step, value) {
    S.profile[step] = value;
    const next = FLOW[step].next;
    if (next) askStep(next); else { S.step = null; conclude(); }
  }

  function conclude() {
    const p = S.profile, paras = [];
    paras.push(FOCUS_TEXT[p.focus] || FOCUS_TEXT["Everything in one system"]);
    if (p.how === "Spreadsheets" || p.how === "Paper records") {
      paras.push("Moving away from " + (p.how === "Spreadsheets" ? "spreadsheets" : "paper records") + " is the situation Klyvero is designed for: one connected system instead of information spread across separate files.");
    }
    if (p.platform === "Cloud software") {
      paras.push("One honest note: Klyvero is a Windows desktop application with a private local database. It is not a cloud service. If cloud access is essential for you, it may not be the right fit.");
    } else {
      paras.push("Based on what you've told me, Klyvero ERP may be a good fit if you're looking for a Windows-based business management system that keeps sales, inventory, purchases, customers, invoices, payments and expenses connected in one application." );
      paras.push("It is built for businesses that manage inventory, sales and purchases directly.");
    }
    const actions = [LINK.features, LINK.pricing];
    if (p.platform !== "Cloud software") actions.push(BUY);
    actions.push({ t: "lead", l: "Tell us about your business" });
    addBot({ intent: "conclusion", text: paras, actions });
  }

  function tryFlowFreeText(n) {
    const f = FLOW[S.step];
    const hit = f.opts.find(o => { const on = norm(o); return n === on || n.indexOf(on) === 0 || on.indexOf(n) === 0 && n.length > 3; });
    if (hit) { takeFlowAnswer(S.step, hit); return true; }
    S.step = null; // visitor asked something else: leave the flow
    return false;
  }

  /* ------------------------------------------------------------------ */
  /* Knowledge base — every statement below comes from the website       */
  /* ------------------------------------------------------------------ */
  const UNKNOWN = "I don't have that information available right now. You can contact Klyvero directly and we'll be happy to help.";

  const INTENTS = [
    { id: "greeting", w: 3, re: /^(hi|hello|hey|hola|salam|assalam o alaikum|good (morning|afternoon|evening))( there)?$/,
      r: () => ({ text: ["Hi! What would you like to know about Klyvero ERP?"], actions: [CHIP("What is Klyvero ERP?"), CHIP("How much does it cost?"), CHIP("Is it right for my business?")] }) },
    { id: "thanks", w: 3, re: /\b(thanks|thank you|thx|appreciate it)\b/,
      r: () => ({ text: ["You're welcome. Ask me anything else about Klyvero whenever you like."], actions: [] }) },
    { id: "bye", w: 3, re: /\b(bye|goodbye|see you)\b/,
      r: () => ({ text: ["Goodbye. If more questions come up, I'm here."], actions: [] }) },

    { id: "explore", w: 5, re: /explore klyvero/,
      r: () => ({ text: ["Klyvero ERP is a Windows desktop application that brings sales, purchases, inventory, customers, suppliers, invoices, payments, expenses and reports into one connected system, backed by a private local database.", "Where would you like to start?"], actions: [LINK.features, LINK.how, LINK.preview] }) },
    { id: "what", w: 3, re: /\bwhat is (klyvero|klyvero erp|this|it)\b|tell me about (klyvero|it|this)|about klyvero|klyvero erp\?*$/,
      r: () => ({ text: ["Klyvero ERP is a Windows desktop application that helps businesses manage sales, purchases, inventory, customers, suppliers, invoices, payments, expenses and reports from one connected system.", "It runs on a private local database, so no cloud is required."], actions: [LINK.features, CHIP("Is it right for my business?")] }) },
    { id: "fit", w: 3, re: /right for my business|suitable for my business|fit (my|for my)|good (fit|for my)|find the right|should i (use|get|buy)|is klyvero (right|suitable|for me)|recommend|right features|is it right/,
      r: () => { startDiscovery(); return null; } },
    { id: "features", w: 3, re: /\bfeatures?\b|\bmodules?\b|what can (klyvero|it|i) (do|manage)|what does it (include|have|offer)|capabilit|functionality|what is included|what s included/,
      r: () => ({ text: ["Klyvero covers the core operations a business runs on:", "Sales, purchases and inventory, connected so every purchase updates stock and every sale updates inventory and the customer record. Customers and suppliers. Invoices, payments and expenses. Reports. Warehouses. User accounts with roles and permissions. Backup & restore, plus authentication with additional verification and audit logs."], actions: [LINK.features, DEMO, CHIP("Find the right features")] }) },
    { id: "small", w: 4, re: /small (business|shop|company|operation|team)|startup|growing business|home business/,
      r: () => ({ text: ["Klyvero is built for businesses that manage inventory, sales and purchases directly, from small operations to growing companies that need a single system for daily operations.", "Whether it fits depends on what you need to manage. I can walk through that with a few quick questions."], actions: [CHIP("Find the right features"), LINK.features] }) },
    { id: "who", w: 3, re: /who (is (it|klyvero|this) for|can use|should use)|what (businesses|kind of business|type of business)|which (businesses|industries)|industr|retail|wholesale|trading|distribution|suitable for/,
      r: () => ({ text: ["Klyvero is built for businesses that manage inventory, sales and purchases directly, from small operations to growing companies that need one system for daily operations.", "I don't have a list of specific industries. If you tell me about your business, I can point out the parts of Klyvero that are most relevant."], actions: [CHIP("Find the right features"), { t: "lead", l: "Tell us about your business" }] }) },

    { id: "inventory", w: 3, re: /\binventor|\bstock\b|\bwarehouses?\b/,
      r: () => ({ text: ["Yes. Klyvero ERP includes inventory management: live stock levels that update automatically as purchases come in and sales go out, organized by category and warehouse, with full stock movement history.", "Because inventory is connected to sales and purchases, nothing has to be entered twice."], actions: [LINK.features, LINK.preview] }) },
    { id: "sales", w: 2, re: /\bsales?\b|\bselling\b|walk in/,
      r: () => ({ text: ["Yes. You can record customer and walk-in sales against real stock and customer accounts. Stock updates automatically, and invoices can be generated directly from sales."], actions: [LINK.features, LINK.preview] }) },
    { id: "purchases", w: 3, re: /manage purchas|purchas(e|es|ing) (order|record|manag|module|workflow)|\bpurchasing\b|track purchases/,
      r: () => ({ text: ["Yes. Purchases are connected to your inventory: every purchase updates your stock. Supplier records and purchase relationships are kept organized and searchable."], actions: [LINK.features] }) },
    { id: "parties", w: 2, re: /\bcustomers?\b|\bsuppliers?\b|\bvendors?\b|\bclients?\b/,
      r: () => ({ text: ["Yes. Klyvero keeps customer records, balances and full transaction history in one place, and supplier records and purchase relationships organized and searchable."], actions: [LINK.features] }) },
    { id: "invoices", w: 3, re: /\binvoic/,
      r: () => ({ text: ["Yes. You can create and manage professional business invoices, and invoices can be generated directly from your sales."], actions: [LINK.features, LINK.preview] }) },
    { id: "payments", w: 3, re: /\bpayments?\b|outstanding|\bbalances?\b|receivable/,
      r: () => ({ text: ["Klyvero lets you track payments and outstanding balances where supported, alongside customer and supplier records."], actions: [LINK.features] }) },
    { id: "expenses", w: 3, re: /\bexpenses?\b/,
      r: () => ({ text: ["Yes. You can record and organize business expenses as they happen."], actions: [LINK.features] }) },
    { id: "reports", w: 3, re: /\breports?\b|analytics|dashboard|charts?/,
      r: () => ({ text: ["Klyvero includes organized reports and summaries built from your actual records: sales and purchase summaries, trend charts over time, and exportable business summaries. The dashboard gives an overview the moment you open the app."], actions: [LINK.preview, LINK.features] }) },
    { id: "users", w: 3, re: /multi.?user|multiple users|\busers?\b|permissions?|\broles?\b|team members|employees|staff/,
      r: () => ({ text: ["Yes. Klyvero supports multiple user accounts with different roles and permissions, so your team can each sign in with their own credentials."], actions: [LINK.features] }) },
    { id: "security", w: 3, re: /secur|\bsafe\b|protect|encrypt|authentic|two.?factor|2fa|verification|audit|privacy|private/,
      r: () => ({ text: ["Klyvero protects business data through authenticated user accounts, role-based permissions, audit logs of important actions, and backup & restore tools, all built into the application. Additional verification methods are available for sign-in.", "Your data lives in a private database on your own computer."], actions: [LINK.faq] }) },
    { id: "backup", w: 3, re: /\bbackups?\b|restore|recover/,
      r: () => ({ text: ["Yes. Klyvero includes built-in tools to back up your business data, and backups taken from Klyvero can be restored directly from within the application."], actions: [] }) },

    { id: "offline", w: 3, re: /offline|internet|online|connection|wifi/,
      r: () => ({ text: ["Klyvero runs on a private local database, so your core day-to-day operations don't depend on an internet connection."], actions: [CHIP("Where is my data stored?")] }) },
    { id: "datastore", w: 3, re: /where.*(data|stored|store)|data stor|my data|\bcloud\b|stored|local.first|server/,
      r: () => ({ text: ["Your business data is stored locally on your own computer, in the private database Klyvero manages. It is not kept on an external cloud service, and no cloud is required to run Klyvero."], actions: [LINK.faq] }) },
    { id: "postgres", w: 4, re: /postgres|database|\bdb\b|\bsql\b/,
      r: () => ({ text: ["No separate database setup is needed. Klyvero includes and manages its own private database automatically, so you don't need to install PostgreSQL or anything else yourself."], actions: [LINK.how] }) },
    { id: "windows", w: 3, re: /windows|\bmac\b|macos|linux|android|iphone|mobile app|web app|browser|operating system/,
      r: () => ({ text: ["Klyvero is a Windows desktop application, installed directly on your computer.", "I don't have information about versions for other operating systems."], actions: [LINK.faq] }) },

    { id: "subscription", w: 4, re: /subscri|monthly|annual|yearly|recurring|per month|per year|renew|one.time|lifetime/,
      r: () => ({ text: ["No. Klyvero ERP is currently " + page.price() + " as a one-time purchase. There is no monthly or annual subscription for the product."], actions: [BUY], buyKind: "soft" }) },
    { id: "price", w: 4.5, re: /price|pricing|\bcost|how much|\$69|\bfee\b|afford|expensive|cheap/,
      r: () => ({ text: ["Klyvero ERP is currently available for " + page.price() + " as a one-time purchase. There is no monthly or annual subscription for the product."], actions: [BUY, ASK], buyKind: "force" }) },
    { id: "paymethod", w: 5, re: /payment method|pay with|credit card|debit card|paypal|accepted|how (do|can) i pay|bank transfer|jazzcash|easypaisa/,
      r: () => ({ text: ["Checkout is handled by Lemon Squeezy. I don't have a list of the payment methods it offers, but you'll see the available options at checkout."], actions: [BUY, { t: "wa" }], buyKind: "soft" }) },
    { id: "buy", w: 4, re: /\bbuy\b|purchase klyvero|purchase it|how (do|can) i (purchase|buy|order)|how (do|can) i get (it|klyvero)|where (do|can) i (buy|get|purchase)|checkout|sign me up|take it|i (ll|will) (take|buy|get)|ready to (buy|purchase)|get klyvero/,
      r: () => ({ text: ["Klyvero ERP is " + page.price() + " as a one-time purchase. When you're ready, you can purchase it through the checkout, which is handled by Lemon Squeezy."], actions: [BUY], buyKind: "force" }) },
    { id: "afterpurchase", w: 4, re: /after (i )?(buy|purchase|pay|checkout)|what happens (after|when i (buy|purchase))|what do i get|delivery|download|licen[sc]e|activat|receive/,
      r: () => ({ text: ["Checkout is handled by Lemon Squeezy. I don't have details about exactly what you receive or how delivery works after checkout, so please contact Klyvero directly if you want that confirmed first.", "Once Klyvero is on your Windows computer, setup is: install it, complete the initial company and administrator setup (business name, currency and core settings), then start managing."], actions: [{ t: "wa" }, { t: "mail" }, BUY], buyKind: "soft" }) },
    { id: "setup", w: 3, re: /install|setup|set up|technical|tech.?savvy|easy to use|\blearn|training|difficult|complicated|non.?technical|get started/,
      r: () => ({ text: ["Setup follows three steps: install Klyvero on your Windows computer (no separate database or additional software), complete the initial company and administrator setup (business name, currency and core settings), then start managing.", "I don't have further details such as training material. Contact Klyvero if you'd like to talk it through."], actions: [LINK.how, { t: "wa" }] }) },
    { id: "support", w: 3, re: /support|help desk|customer service|maintenance|technical help/,
      r: () => ({ text: ["I don't have details about a support plan or response times. You can contact Klyvero directly and we'll be happy to help."], actions: contactActions() }) },
    { id: "policy", w: 5, re: /refund|guarantee|money.?back|\btrial\b|free version|warranty|\bterms\b|customi[sz]|white.?label|source code/,
      r: () => ({ text: [UNKNOWN], actions: contactActions() }) },
    { id: "updates", w: 3, re: /update|upgrade|new version|future version/,
      r: () => ({ text: ["Updates are installed like any Windows application, and your existing business data is preserved when you update to a new version."], actions: [] }) },
    { id: "demo", w: 4.2, re: /demo|video|watch|screenshots?|preview|walkthrough|look(s)? like|(see|view|explore|try) (the |your |this )?(klyvero|erp|software|product|app|application|dashboard|features|system|interface|it)\b|see how|show me (the |a )?(klyvero|erp|software|product|app|application|dashboard|features|system|interface|video|demo|how|it)\b|how (it|klyvero|the erp|the software) works?|how does (klyvero|it|the erp|the software) work|before (buying|i buy|purchasing)/,
      r: () => ({ text: ["Absolutely. You can watch the Klyvero ERP product demo to see the application and its main workflows in action."], actions: [DEMO, LINK.features] }) },
    { id: "ask", w: 6, re: /^ask a question$|^i have a question$|^question$/,
      r: () => ({ text: ["Of course. What would you like to know?"], actions: [CHIP("What features does it have?"), CHIP("Is it right for my business?"), CHIP("How does it store my data?"), CHIP("Do I need to install PostgreSQL?")] }) },

    { id: "spreadsheet", w: 4, re: /spreadsheet|excel|google sheets|\bsheets\b|\bpaper\b|notebook|ledger|manual|handwritten|by hand/,
      r: () => ({ text: ["Klyvero ERP can help bring your inventory, sales, purchases, customers, suppliers, invoices and payments into one connected system, instead of keeping them across separate spreadsheets and records.", "Because sales, purchases and stock draw from the same records, nothing has to be entered twice, and balances and stock levels stay current."], actions: [LINK.features, LINK.how] }) },
    { id: "competitor", w: 5, re: /odoo|quickbooks|zoho|\bsap\b|tally|erpnext|netsuite|xero|\bsage\b|dynamics|competitor|alternative|better than|compare|comparison|versus|\bvs\b/,
      r: () => ({ text: ["They take different approaches. Klyvero focuses on a practical Windows-based, local-first business management experience for small and growing businesses, while larger platforms may offer broader ecosystems and deployment options. The right choice depends on what your business needs."], actions: [CHIP("Find the right features"), LINK.features] }) },

    { id: "proof", w: 5, re: /how many (customers|users|businesses|companies|people)|who (uses|is using)|customers use|reviews?|testimonials?|trusted by|ratings?|thousands|case stud/,
      r: () => ({ text: ["I don't have customer numbers, reviews or testimonials to share, and I won't make any up. If you'd like to talk to someone before deciding, you can contact Klyvero directly."], actions: contactActions() }) },
    { id: "lead", w: 5, re: /talk to klyvero|tell us about (my|your) business|get a quote|\bquote\b|inquiry|enquiry|consult|contact sales/,
      r: () => { openLead(); return null; } },
    { id: "contact", w: 3, re: /contact|reach|whatsapp|\bemail\b|phone|\bcall\b|talk to|speak|human|someone|owner|developer/,
      r: () => ({ text: ["You can contact Klyvero directly. Pick whichever is easiest:"], actions: contactActions() }) },
    { id: "positive", w: 4, re: /this (could|can|might|would) work|sounds (good|great|interesting)|looks (good|great)|i like (it|this|klyvero)|interested|makes sense|i think (this|it)/,
      r: () => ({ text: ["Great. You can explore the product details first, or purchase Klyvero ERP when you're ready."], actions: [LINK.features, LINK.pricing, BUY], buyKind: "soft" }) }
  ];

  /* ------------------------------------------------------------------ */
  /* Matching                                                            */
  /* ------------------------------------------------------------------ */
  function norm(t) { return t.toLowerCase().replace(/[^a-z0-9$ ]+/g, " ").replace(/\s+/g, " ").trim(); }

  function match(n) {
    let best = null, bestScore = 0;
    for (const it of INTENTS) {
      if (it.re.test(n) && it.w > bestScore) { best = it; bestScore = it.w; } // earlier entries win ties
    }
    return best;
  }

  function route(text) {
    const n = norm(text);
    if (S.step && tryFlowFreeText(n)) return;
    const it = match(n);
    if (!it) { addBot({ intent: "unknown", text: [UNKNOWN], actions: contactActions() }); return; }
    const out = it.r();
    if (out) addBot({ intent: it.id, text: out.text, actions: out.actions, buyKind: out.buyKind });
  }

  /* ------------------------------------------------------------------ */
  /* Rendering                                                           */
  /* ------------------------------------------------------------------ */
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function rich(node, str) {
    str.split(/(\*\*[^*]+\*\*)/).forEach(part => {
      if (/^\*\*[^*]+\*\*$/.test(part)) node.appendChild(el("strong", null, part.slice(2, -2)));
      else if (part) node.appendChild(document.createTextNode(part));
    });
  }

  function scrollTo(msg) {
    requestAnimationFrame(() => {
      const tall = msg.offsetHeight > log.clientHeight * 0.6;
      log.scrollTop = tall ? Math.max(msg.offsetTop - 12, 0) : log.scrollHeight;
    });
  }

  function addUser(text) {
    const m = el("div", "asst-msg asst-msg--user", text);
    log.appendChild(m); scrollTo(m);
  }

  function addBot(o) {
    const m = el("div", "asst-msg asst-msg--bot");
    m.dataset.intent = o.intent || "";
    o.text.forEach(p => { const pe = el("p"); rich(pe, p); m.appendChild(pe); });
    S.botCount++;
    if (o.actions && o.actions.length) {
      const row = el("div", "asst-actions");
      o.actions.forEach(a => { const n = renderAction(a, o); if (n) row.appendChild(n); });
      if (row.children.length) m.appendChild(row);
    }
    log.appendChild(m); scrollTo(m);
    if (m.querySelector(".lemonsqueezy-button")) {
      try { if (window.LemonSqueezy && typeof window.LemonSqueezy.Refresh === "function") window.LemonSqueezy.Refresh(); } catch (e) { /* link still works as a normal link */ }
    }
    return m;
  }

  function closeOnMobile() { if (window.matchMedia("(max-width: 640px)").matches) api.close(true); }

  function renderAction(a, ctx) {
    switch (a.t) {
      case "chip": {
        const b = el("button", "asst-chip", a.l); b.type = "button";
        b.addEventListener("click", () => send(a.q)); return b;
      }
      case "flow": {
        const b = el("button", "asst-chip", a.l); b.type = "button";
        b.addEventListener("click", () => { if (S.step !== a.step || S.busy) return; S.busy = true; addUser(a.v); showTyping(); setTimeout(() => { hideTyping(); try { takeFlowAnswer(a.step, a.v); } catch (e) { try { errorReply(); } catch (e2) {} } finally { S.busy = false; } }, 350); });
        return b;
      }
      case "link": {
        const x = el("a", "btn btn-ghost btn-sm", a.l); x.href = a.to;
        x.addEventListener("click", closeOnMobile); return x;
      }
      case "buy": {
        const href = page.buyHref();
        // Avoid repeating the buy button in back-to-back replies unless the visitor explicitly asked to buy.
        if (ctx && ctx.buyKind !== "force" && S.lastBuy >= S.botCount - 1 && ctx.intent !== "conclusion") return null;
        S.lastBuy = S.botCount;
        const x = el("a", "btn btn-primary btn-sm lemonsqueezy-button", "Buy Klyvero ERP \u2014 " + page.price());
        x.href = href || "#pricing"; // normally the existing Lemon Squeezy checkout link, read from the pricing card
        return x;
      }
      case "demo": {
        const href = page.demoHref();
        const x = el("a", "btn btn-primary btn-sm", "Watch Product Demo");
        x.href = href || "#demo";
        if (href) { x.target = "_blank"; x.rel = "noopener noreferrer"; } else { x.addEventListener("click", closeOnMobile); }
        return x;
      }
      case "wa": {
        const base = page.wa(); if (!base) return null;
        const x = el("a", "btn btn-ghost btn-sm", "WhatsApp"); x.href = base; x.target = "_blank"; x.rel = "noopener noreferrer"; return x;
      }
      case "mail": {
        const addr = page.mail(); if (!addr) return null;
        const x = el("a", "btn btn-ghost btn-sm", "Email"); x.href = "mailto:" + addr; return x;
      }
      case "lead": {
        const b = el("button", "asst-chip asst-chip--accent", a.l); b.type = "button";
        b.addEventListener("click", () => { if (!S.busy) openLead(); }); return b;
      }
    }
    return null;
  }

  function showTyping() {
    typingEl = el("div", "asst-msg asst-msg--bot asst-typing");
    typingEl.setAttribute("aria-label", "Klyvero Assistant is typing");
    for (let i = 0; i < 3; i++) typingEl.appendChild(el("span"));
    log.appendChild(typingEl); log.scrollTop = log.scrollHeight;
  }
  function hideTyping() { if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl); typingEl = null; }

  function errorReply() {
    addBot({ intent: "error", text: ["Sorry, something went wrong on my side. You can still reach Klyvero directly:"], actions: [{ t: "wa" }, { t: "mail" }, LINK.contact] });
  }

  function send(raw) {
    const text = String(raw || "").trim().slice(0, 300);
    if (!text || S.busy) return;
    S.busy = true;
    addUser(text); showTyping();
    setTimeout(() => {
      hideTyping();
      try { route(text); }
      catch (err) { try { errorReply(); } catch (e2) { /* nothing more we can do */ } }
      finally { S.busy = false; }
    }, 400);
  }

  /* ------------------------------------------------------------------ */
  /* Lead flow — builds WhatsApp / mailto links. Nothing is stored or    */
  /* sent by this site; the visitor reviews the message in their own app.*/
  /* ------------------------------------------------------------------ */
  function openLead() {
    S.step = null;
    const p = S.profile;
    const m = addBot({ intent: "lead-form", text: ["Happy to pass this to Klyvero. Fill in whatever you like (everything is optional). I'll prepare a message you can review and send yourself."], actions: [] });
    const form = el("form", "asst-lead"); form.noValidate = true;

    const fields = [
      { k: "biz", label: "Business type", type: "select", opts: ["", "Retail", "Wholesale", "Trading", "Distribution", "Other"], val: p.biz || "" },
      { k: "need", label: "What do you need?", type: "text", ph: "e.g. inventory and sales in one place", val: p.focus ? p.focus.toLowerCase() : "" },
      { k: "problem", label: "Main problem", type: "text", ph: "e.g. stock counts never match", val: "" },
      { k: "features", label: "Functionality you want", type: "text", ph: "e.g. invoices, supplier balances", val: "" },
      { k: "name", label: "Your name (optional)", type: "text", ph: "", val: "" },
      { k: "contact", label: "Email or WhatsApp (optional)", type: "text", ph: "", val: "" }
    ];
    const inputs = {};
    fields.forEach((f, i) => {
      const wrap = el("label", "asst-field");
      wrap.appendChild(el("span", null, f.label));
      let c;
      if (f.type === "select") {
        c = el("select");
        f.opts.forEach(o => { const op = el("option", null, o || "Select\u2026"); op.value = o; c.appendChild(op); });
      } else { c = el("input"); c.type = "text"; c.maxLength = 160; if (f.ph) c.placeholder = f.ph; }
      c.value = f.val; c.name = f.k; inputs[f.k] = c; wrap.appendChild(c); form.appendChild(wrap);
    });

    const row = el("div", "asst-actions asst-actions--lead");
    const wa = el("a", "btn btn-primary btn-sm", "Send via WhatsApp"); wa.target = "_blank"; wa.rel = "noopener noreferrer";
    const mail = el("a", "btn btn-ghost btn-sm", "Send via Email");
    row.appendChild(wa); row.appendChild(mail); form.appendChild(row);
    form.appendChild(el("p", "asst-lead__note", "Nothing is sent or stored by this website. WhatsApp or your email app opens with the message ready for you to review."));

    const val = k => inputs[k].value.trim();
    function message() {
      const parts = ["Hi, I'm interested in Klyvero ERP."];
      const biz = val("biz");
      if (biz && biz !== "Other") parts.push("I run a " + biz.toLowerCase() + " business.");
      if (val("need")) parts.push("I'm mainly looking for " + val("need") + ".");
      if (val("problem")) parts.push("My main challenge is " + val("problem") + ".");
      if (val("features")) parts.push("The functionality I need: " + val("features") + ".");
      if (val("name")) parts.push("My name is " + val("name") + ".");
      if (val("contact")) parts.push("You can reach me at " + val("contact") + ".");
      return parts.join(" ");
    }
    function sync() {
      const msg = message(), base = page.wa(), addr = page.mail();
      if (base) wa.href = base + (base.indexOf("?") > -1 ? "&" : "?") + "text=" + encodeURIComponent(msg); else wa.hidden = true;
      if (addr) mail.href = "mailto:" + addr + "?subject=" + encodeURIComponent("Klyvero ERP inquiry") + "&body=" + encodeURIComponent(msg); else mail.hidden = true;
    }
    form.addEventListener("input", sync); form.addEventListener("change", sync);
    form.addEventListener("submit", e => e.preventDefault());
    wa.addEventListener("click", () => setTimeout(() => addBot({ intent: "lead-sent", text: ["WhatsApp should open with your message ready. Nothing is sent until you press send there."], actions: [] }), 300));
    mail.addEventListener("click", () => setTimeout(() => addBot({ intent: "lead-sent", text: ["Your email app should open with the message ready. Nothing is sent until you press send there."], actions: [] }), 300));
    sync();
    m.appendChild(form); scrollTo(m);
  }

  /* ------------------------------------------------------------------ */
  /* Panel                                                               */
  /* ------------------------------------------------------------------ */
  function build() {
    panel = el("section", "asst");
    panel.id = "assistantPanel";
    panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Klyvero Assistant"); panel.setAttribute("aria-modal", "false");
    panel.setAttribute("inert", "");

    const head = el("header", "asst__head");
    const mark = document.createElement("img"); mark.src = "assets/klyvero-mark-256.png"; mark.alt = ""; mark.width = 30; mark.height = 30;
    const title = el("div", "asst__title"); title.appendChild(el("b", null, "Klyvero Assistant")); title.appendChild(el("span", null, "Product advisor"));
    const close = el("button", "asst__close"); close.type = "button"; close.setAttribute("aria-label", "Close assistant");
    close.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    close.addEventListener("click", () => api.close());
    head.appendChild(mark); head.appendChild(title); head.appendChild(close);

    log = el("div", "asst__log"); log.setAttribute("role", "log"); log.setAttribute("aria-live", "polite");

    const form = el("form", "asst__form");
    input = el("input"); input.type = "text"; input.maxLength = 300; input.autocomplete = "off";
    input.placeholder = "Ask about Klyvero ERP\u2026"; input.setAttribute("aria-label", "Ask a question about Klyvero ERP");
    const sendBtn = el("button", "asst__send"); sendBtn.type = "submit"; sendBtn.setAttribute("aria-label", "Send message");
    sendBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>';
    form.addEventListener("submit", e => { e.preventDefault(); const v = input.value; input.value = ""; send(v); });
    form.appendChild(input); form.appendChild(sendBtn);

    const foot = el("p", "asst__foot", "Answers come from the Klyvero website. Nothing you type is stored.");

    panel.appendChild(head); panel.appendChild(log); panel.appendChild(form); panel.appendChild(foot);
    panel.addEventListener("keydown", e => { if (e.key === "Escape") api.close(); });
    document.body.appendChild(panel);
  }

  function welcome() {
    addBot({
      intent: "welcome",
      text: ["**Hi! I'm the Klyvero ERP Assistant** \uD83D\uDC4B", "I can help you understand Klyvero, explore its features, see whether it fits your business, and answer questions before you decide to purchase.", "**What would you like to know?**"],
      actions: [
        CHIP("Explore Klyvero"), CHIP("Find the right features"), CHIP("Watch Product Demo"), CHIP("See pricing"), CHIP("Buy Klyvero ERP"),
        CHIP("What features does it have?"), CHIP("Is it a subscription?"), CHIP("How does it store my data?")
      ]
    });
  }

  const api = {
    open() {
      if (!panel) build();
      S.open = true;
      panel.classList.add("is-open"); panel.removeAttribute("inert");
      if (launcher) { launcher.classList.add("is-hidden"); launcher.setAttribute("aria-expanded", "true"); }
      if (!S.started) { S.started = true; welcome(); }
      setTimeout(() => input.focus({ preventScroll: true }), 60);
    },
    close(skipFocus) {
      if (!panel) return;
      S.open = false;
      panel.classList.remove("is-open"); panel.setAttribute("inert", "");
      if (launcher) { launcher.classList.remove("is-hidden"); launcher.setAttribute("aria-expanded", "false"); if (!skipFocus) launcher.focus({ preventScroll: true }); }
    },
    toggle(btn) { if (btn) launcher = btn; S.open ? api.close() : api.open(); }
  };
  window.KlyveroAssistant = api;
})();
