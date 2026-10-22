(() => {
  "use strict";

  const cv = JSON.parse(document.getElementById("cv-data").textContent);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SVG = "http://www.w3.org/2000/svg";

  // Small DOM helpers. Text always goes in through textContent.
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function svg(tag, attrs, text) {
    const n = document.createElementNS(SVG, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  // ---- Dates -------------------------------------------------------------

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];

  function parseMonth(s) {
    const m = /([A-Za-z]{3})[a-z]*\s+(\d{4})/.exec(s);
    return m ? { y: +m[2], m: MONTHS.indexOf(m[1]) } : null;
  }

  // "Jun 2018 – May 2020" -> start of first month, start of the month after the last.
  function parsePeriod(p) {
    const [a, b] = p.split(/\s+[–-]\s+/);
    const s = parseMonth(a);
    const e = b && parseMonth(b);
    const start = new Date(s.y, s.m, 1);
    const end = e ? new Date(e.y, e.m + 1, 1) : null;
    return { start, end, s, current: !e };
  }

  function duration(start, end) {
    const months = Math.max(1, Math.round((end - start) / (30.4375 * 864e5)));
    const y = Math.floor(months / 12), mo = months % 12;
    const parts = [];
    if (y) parts.push(y + (y === 1 ? " yr" : " yrs"));
    if (mo) parts.push(mo + " mo");
    return parts.join(" ");
  }

  const roles = cv.Experience.map((j, i) => Object.assign({ i }, j, parsePeriod(j.Period)));
  const first = roles.reduce((a, b) => (b.start < a.start ? b : a));

  // ---- Copy button -------------------------------------------------------

  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = "Copied";
      } catch {
        btn.textContent = "Press Ctrl+C";
      }
      setTimeout(() => (btn.textContent = "Copy"), 1600);
    });
  });

  // ---- Years counter -----------------------------------------------------

  (function counter() {
    const out = document.getElementById("years");
    const note = document.getElementById("years-note");
    const yearMs = 365.2425 * 864e5;
    const years = () => (Date.now() - first.start) / yearMs;
    note.textContent = `since ${MONTH_NAMES[first.s.m]} ${first.s.y} at ${first.Company}, and counting`;
    if (reduceMotion) {
      out.textContent = years().toFixed(2);
      return;
    }
    const tick = () => {
      out.textContent = years().toFixed(8);
      requestAnimationFrame(tick);
    };
    tick();
  })();

  // ---- Up next: countdowns from dates in the CV ---------------------------

  (function upNext() {
    const list = document.getElementById("upnext");
    const now = new Date();
    const monthsUntil = (d) => (d.getFullYear() - now.getFullYear()) * 12 + d.getMonth() - now.getMonth();
    const inText = (d) => {
      const m = monthsUntil(d);
      return m <= 0 ? "now" : m === 1 ? "in 1 month" : `in ${m} months`;
    };

    for (const c of cv.Certifications) {
      const m = /^(\w{3} \d{4}).*valid until (\w{3} \d{4})/.exec(c.Date);
      if (!m) continue;
      const a = parseMonth(m[1]), b = parseMonth(m[2]);
      const from = new Date(a.y, a.m, 1), to = new Date(b.y, b.m, 1);
      const used = Math.min(1, Math.max(0, (now - from) / (to - from)));
      const li = el("li");
      const r = el("div", "u-row");
      r.append(el("span", "u-what", `${c.Name} renewal`), el("span", "u-in", inText(to)));
      const meter = el("div", "meter");
      meter.setAttribute("role", "meter");
      meter.setAttribute("aria-valuemin", "0");
      meter.setAttribute("aria-valuemax", "100");
      meter.setAttribute("aria-valuenow", String(Math.round(used * 100)));
      meter.setAttribute("aria-label", "Share of the certification's validity already used");
      const fill = el("i");
      fill.style.width = (used * 100).toFixed(1) + "%";
      meter.append(fill);
      li.append(r, meter, el("div", "meter-note", `${Math.round(used * 100)}% of validity used, ${m[1]} to ${m[2]}`));
      list.append(li);
    }

    for (const e of cv.Education) {
      if (!/expected/i.test(e.Date)) continue;
      const d = parseMonth(e.Date);
      const to = new Date(d.y, d.m, 1);
      const li = el("li");
      const r = el("div", "u-row");
      r.append(el("span", "u-what", e.Degree), el("span", "u-in", inText(to)));
      li.append(r, el("div", "meter-note", `${e.School}, expected ${MONTHS[d.m]} ${d.y}`));
      list.append(li);
    }
  })();

  // ---- Ticker ------------------------------------------------------------

  (function ticker() {
    const track = document.getElementById("ticker");
    const now = roles[0];
    const items = [
      [now.Company.toUpperCase(), "▲", `${now.Role}, since ${MONTHS[now.s.m]} ${now.s.y}`],
      ["YRS.DATA", "▲", ((Date.now() - first.start) / (365.2425 * 864e5)).toFixed(2)],
      ["EULER", "▲", "115+ problems solved"],
    ];
    for (const c of cv.Certifications) {
      const m = /valid until (.+)$/.exec(c.Date);
      items.push([c.Issuer.split(" ").map((w) => w[0]).join(""), "●", m ? `${c.Name}, valid to ${m[1]}` : c.Name]);
    }
    for (const e of cv.Education) {
      if (/expected/i.test(e.Date)) items.push(["MATH", "▲", `${e.Degree}, ${e.Date}`]);
    }
    items.push(["SSH", "●", "henriquelop.es is up"]);

    // Two copies so the loop is seamless at -50%.
    for (let k = 0; k < 2; k++) {
      for (const [sym, arrow, text] of items) {
        const t = el("span", "tick");
        t.append(el("b", null, sym), el("span", "up", arrow), el("span", null, text));
        track.append(t);
      }
    }
  })();

  // ---- Terminal ----------------------------------------------------------

  (function terminal() {
    const term = document.getElementById("term");
    const TABS = ["About", "Experience", "Projects", "Skills", "Education", "Contact"];
    const state = { tab: 0, cursor: [0, 0, 0, 0, 0, 0], closed: false };
    let body;

    const listLen = () => (state.tab === 1 ? cv.Experience.length : state.tab === 2 ? cv.Projects.length : 0);

    function row(left, right, leftCls) {
      const r = el("div", "t-row");
      const l = el("span", "l " + (leftCls || ""));
      if (typeof left === "string") l.textContent = left;
      else l.append(...left);
      r.append(l);
      if (right) r.append(el("span", "r", right));
      return r;
    }

    function accordion(items) {
      const wrap = el("div");
      items.forEach((it, i) => {
        const open = i === state.cursor[state.tab];
        const item = el("div", "t-item" + (open ? " sel" : ""));
        item.dataset.i = i;
        item.append(row([el("span", "mk", open ? "▸" : ""), document.createTextNode(it.title)], it.right));
        if (open) {
          const d = el("div", "t-detail");
          if (it.sub) d.append(el("div", "t-sub", it.sub));
          const ul = el("ul", "t-bullets");
          it.bullets.forEach((b) => ul.append(el("li", null, b)));
          d.append(ul);
          if (it.url) {
            const u = el("div", "t-url");
            const a = el("a", null, "↗ " + it.url);
            a.href = "https://" + it.url;
            u.append(a);
            d.append(u);
          }
          item.append(d);
        }
        item.addEventListener("click", (e) => {
          if (e.target.closest("a")) return;
          state.cursor[state.tab] = i;
          render(true);
        });
        wrap.append(item);
      });
      return wrap;
    }

    function renderBody() {
      const b = el("div");
      switch (state.tab) {
        case 0: {
          b.append(el("p", null, cv.Summary.trim()));
          const now = cv.Experience[0];
          const p = el("p");
          p.append(el("span", "t-muted", "Currently  "), el("span", "t-label", now.Role),
            el("span", "t-muted", " at "), el("span", "t-accent", now.Company));
          b.append(p);
          const chips = el("div", "t-chips");
          chips.append(el("span", null, `${cv.Experience.length} roles`),
            el("span", null, `${cv.Projects.length} projects`),
            el("span", null, `${cv.Certifications.length} certifications`));
          b.append(chips, el("p", "t-muted", "Press → or 2 to see my experience."));
          break;
        }
        case 1:
          b.append(accordion(cv.Experience.map((j) => ({
            title: `${j.Role} · ${j.Company}`, right: j.Period, sub: j.Location, bullets: j.Bullets,
          }))));
          break;
        case 2:
          b.append(accordion(cv.Projects.map((p) => ({
            title: p.Name, sub: p.Stack, bullets: p.Bullets, url: p.URL,
          }))));
          break;
        case 3:
          for (const g of cv.Skills) {
            const chips = el("div", "t-chips");
            g.Items.forEach((s) => chips.append(el("span", null, s)));
            b.append(el("div", "t-label", g.Category), chips);
          }
          break;
        case 4: {
          const entry = (title, right, sub) => {
            b.append(row(title, right, "t-label"), el("p", "t-muted", sub));
          };
          b.append(el("p", "t-accent", "Education"));
          cv.Education.forEach((e) => entry(e.Degree, e.Date, `${e.School} · ${e.Location}`));
          b.append(el("p", "t-accent", "Courses & Certifications"));
          cv.Certifications.forEach((c) =>
            entry(c.Name, c.Date, c.Issuer + (c.Items && c.Items.length ? " · " + c.Items.join(", ") : "")));
          break;
        }
        case 5:
          [["Email", cv.Contact.Email], ["LinkedIn", cv.Contact.LinkedIn], ["GitHub", cv.Contact.GitHub]]
            .forEach(([k, v]) => {
              const p = el("p");
              p.append(el("span", "t-muted", k.padEnd(10, " ")), el("span", "t-accent", v));
              p.style.whiteSpace = "pre-wrap";
              b.append(p);
            });
          break;
      }
      return b;
    }

    function render(follow) {
      term.replaceChildren();
      if (state.closed) {
        const g = el("div", "t-gone");
        g.append(el("p", null, "Connection to henriquelop.es closed."), el("p", null, "Press any key to reconnect."));
        term.append(g);
        return;
      }
      const head = el("div", "t-head");
      const title = el("div", "t-title");
      title.append(el("span", "t-name", cv.Name), el("span", "t-headline", cv.Headline));
      const tabs = el("div", "t-tabs");
      TABS.forEach((name, i) => {
        const t = el("button", "t-tab" + (i === state.tab ? " on" : ""), `${i + 1} ${name}`);
        t.type = "button";
        t.tabIndex = -1;
        t.addEventListener("click", () => setTab(i));
        tabs.append(t);
      });
      head.append(title, tabs);

      body = el("div", "t-body");
      body.append(renderBody());
      const help = listLen()
        ? "←/→ sections • ↑/↓ select • pgup/pgdn scroll • q quit"
        : "←/→ sections • q quit";
      term.append(head, body, el("div", "t-foot", help));

      if (follow) {
        const sel = body.querySelector(".sel");
        if (sel) {
          const top = sel.offsetTop - body.offsetTop;
          if (top < body.scrollTop) body.scrollTop = top;
          else if (top + sel.offsetHeight > body.scrollTop + body.clientHeight)
            body.scrollTop = top + sel.offsetHeight - body.clientHeight;
        }
      }
    }

    function setTab(i) {
      state.tab = (i + TABS.length) % TABS.length;
      render(false);
    }

    term.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (state.closed) {
        state.closed = false;
        render(false);
        e.preventDefault();
        return;
      }
      const k = e.key;
      const n = listLen();
      const c = state.cursor;
      let handled = true;
      if (k === "ArrowRight" || k === "l") setTab(state.tab + 1);
      else if (k === "ArrowLeft" || k === "h") setTab(state.tab - 1);
      else if (/^[1-6]$/.test(k)) setTab(+k - 1);
      else if (k === "q" || k === "Escape") { state.closed = true; render(false); }
      else if (n && (k === "ArrowDown" || k === "j")) { c[state.tab] = (c[state.tab] + 1) % n; render(true); }
      else if (n && (k === "ArrowUp" || k === "k")) { c[state.tab] = (c[state.tab] - 1 + n) % n; render(true); }
      else if (n && (k === "Home" || k === "g")) { c[state.tab] = 0; render(true); }
      else if (n && (k === "End" || k === "G")) { c[state.tab] = n - 1; render(true); }
      else if (k === "PageDown") body.scrollBy(0, body.clientHeight * 0.8);
      else if (k === "PageUp") body.scrollBy(0, -body.clientHeight * 0.8);
      else if (!n && k === "ArrowDown") body.scrollBy(0, 40);
      else if (!n && k === "ArrowUp") body.scrollBy(0, -40);
      else handled = false;
      if (handled) e.preventDefault();
    });

    // Clicking anywhere in the terminal focuses it, like a real window.
    term.addEventListener("pointerdown", () => term.focus({ preventScroll: true }));

    render(false);
  })();

  // ---- Shared tooltip placement -----------------------------------------

  function showTip(tip, fig, x, y, parts) {
    tip.replaceChildren(el("strong", null, parts[0]), ...parts.slice(1).map((p) => el("div", null, p)));
    tip.hidden = false;
    const fw = fig.clientWidth;
    const tw = tip.offsetWidth;
    let left = x + 14;
    if (left + tw > fw) left = Math.max(0, x - tw - 14);
    tip.style.left = left + "px";
    tip.style.top = Math.max(0, y - tip.offsetHeight / 2) + "px";
  }

  // ---- Career timeline ----------------------------------------------------

  (function timeline() {
    const host = document.getElementById("timeline");
    const fig = host.parentElement;
    const tip = document.getElementById("tl-tip");
    const details = [...document.querySelectorAll("#roles details")];
    let selected = 0;
    let bars = [];

    function select(i, scroll) {
      selected = i;
      details.forEach((d, k) => (d.open = k === i));
      bars.forEach((b, k) => b.classList.toggle("on", k === i));
      if (scroll) details[i].scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    }

    details.forEach((d, i) =>
      d.addEventListener("toggle", () => {
        if (d.open && selected !== i) select(i, false);
      }));

    function draw() {
      const W = host.clientWidth;
      if (!W) return;
      const narrow = W < 620;
      const labelW = narrow ? 0 : 230;
      const rowH = narrow ? 44 : 32;
      const barH = 14;
      const top = 8, axisH = 26;
      const H = top + roles.length * rowH + axisH;
      const now = new Date();
      const x0 = new Date(first.start.getFullYear(), 0, 1);
      const x1 = new Date(now.getFullYear() + 1, 0, 1);
      const plotL = labelW, plotR = W - 8;
      const x = (d) => plotL + ((d - x0) / (x1 - x0)) * (plotR - plotL);

      const s = svg("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img",
        "aria-label": "Career timeline: one bar per role, from " + first.s.y + " to today. The list below has the same information." });

      for (let y = x0.getFullYear(); y <= x1.getFullYear(); y++) {
        const gx = x(new Date(y, 0, 1));
        s.append(svg("line", { class: "grid", x1: gx, x2: gx, y1: top - 4, y2: H - axisH + 4 }));
        if (!narrow || y % 2 === 0) {
          s.append(svg("text", { x: gx, y: H - 6, "text-anchor": y === x1.getFullYear() ? "end" : "middle" }, String(y)));
        }
      }

      const nx = x(now);
      s.append(svg("line", { class: "now-line", x1: nx, x2: nx, y1: top - 4, y2: H - axisH + 4 }));

      bars = [];
      roles.forEach((r, i) => {
        const yRow = top + i * rowH;
        const by = narrow ? yRow + 20 : yRow + (rowH - barH) / 2;
        const label = `${r.Company}`;
        s.append(svg("text", narrow
          ? { class: "row-label", x: 0, y: yRow + 13 }
          : { class: "row-label", x: 0, y: by + barH / 2 + 4 }, label));
        const bx = x(r.start);
        const bw = Math.max(6, x(r.end || now) - bx);
        const hit = svg("rect", { class: "hit", x: narrow ? 0 : 0, y: yRow, width: W, height: rowH,
          tabindex: 0, role: "button", "aria-label": `${r.Role} at ${r.Company}, ${r.Period}. Show details.` });
        const bar = svg("rect", { class: "bar" + (i === selected ? " on" : ""), x: bx, y: by, width: bw, height: barH, rx: 4 });
        const show = () => showTip(tip, fig, bx + bw, by + barH / 2,
          [duration(r.start, r.end || now), `${r.Role}, ${r.Company}`, r.Period]);
        hit.addEventListener("pointerenter", show);
        hit.addEventListener("focus", show);
        hit.addEventListener("pointerleave", () => (tip.hidden = true));
        hit.addEventListener("blur", () => (tip.hidden = true));
        hit.addEventListener("click", () => select(i, true));
        hit.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(i, true); }
        });
        s.append(hit, bar);
        bars.push(bar);
      });

      host.replaceChildren(s);
    }

    draw();
    new ResizeObserver(draw).observe(host);
  })();

  // ---- Efficient frontier (toy example) ----------------------------------

  (function frontier() {
    const host = document.getElementById("frontier");
    if (!host) return;
    const fig = host.parentElement;
    const tip = document.getElementById("fr-tip");

    // Three made-up assets.
    const names = ["A", "B", "C"];
    const mu = [0.05, 0.09, 0.13];
    const sd = [0.08, 0.16, 0.26];
    const rho = [[1, 0.3, 0.1], [0.3, 1, 0.4], [0.1, 0.4, 1]];
    const S = rho.map((r, i) => r.map((c, j) => c * sd[i] * sd[j]));

    function inv3(m) {
      const [a, b, c] = m[0], [d, e, f] = m[1], [g, h, k] = m[2];
      const A = e * k - f * h, B = -(d * k - f * g), C = d * h - e * g;
      const det = a * A + b * B + c * C;
      return [
        [A / det, -(b * k - c * h) / det, (b * f - c * e) / det],
        [B / det, (a * k - c * g) / det, -(a * f - c * d) / det],
        [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
      ];
    }
    const Si = inv3(S);
    const one = [1, 1, 1];
    const mv = (M, v) => M.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
    const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
    const Si1 = mv(Si, one), Simu = mv(Si, mu);
    const A = dot(one, Si1), B = dot(one, Simu), C = dot(mu, Simu), D = A * C - B * B;

    const sigmaOf = (m) => Math.sqrt((A * m * m - 2 * B * m + C) / D);
    const weightsOf = (m) => Si1.map((v, i) => ((C - B * m) * v + (A * m - B) * Simu[i]) / D);
    const mGMV = B / A, sGMV = sigmaOf(mGMV);
    // Upper branch: the return for a given risk.
    const mOf = (s) => (B + Math.sqrt(Math.max(0, B * B - A * (C - D * s * s)))) / A;

    const xMax = 0.3, yMax = 0.16, yMin = 0;
    let state = null;

    function draw() {
      const W = host.clientWidth;
      if (!W) return;
      const H = Math.round(Math.min(260, Math.max(200, W * 0.5)));
      const L = 40, R = 10, T = 10, Bm = 34;
      const x = (v) => L + (v / xMax) * (W - L - R);
      const y = (v) => T + (1 - (v - yMin) / (yMax - yMin)) * (H - T - Bm);

      const s = svg("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, tabindex: 0,
        "aria-label": "Efficient frontier for three made-up assets. Use left and right arrow keys to move along the curve." });

      for (let v = 0; v <= xMax + 1e-9; v += 0.1) {
        s.append(svg("line", { class: "grid", x1: x(v), x2: x(v), y1: T, y2: H - Bm }));
        if (v > 0) s.append(svg("text", { x: x(v), y: H - Bm + 16, "text-anchor": "middle" }, Math.round(v * 100) + "%"));
      }
      for (let v = 0; v <= yMax + 1e-9; v += 0.05) {
        s.append(svg("line", { class: "grid", x1: L, x2: W - R, y1: y(v), y2: y(v) }));
        s.append(svg("text", { x: L - 6, y: y(v) + 4, "text-anchor": "end" }, Math.round(v * 100) + "%"));
      }
      s.append(svg("text", { x: W - R, y: H - 4, "text-anchor": "end" }, "Risk (volatility)"));
      s.append(svg("text", { x: L + 4, y: T + 12 }, "Expected return"));

      const path = (from, to) => {
        let d = "";
        for (let k = 0; k <= 80; k++) {
          const m = from + ((to - from) * k) / 80;
          const sx = sigmaOf(m);
          if (sx > xMax) break;
          d += (d ? "L" : "M") + x(sx).toFixed(1) + " " + y(m).toFixed(1);
        }
        return d;
      };
      s.append(svg("path", { class: "curve lower", d: path(mGMV, 0.02) }));
      s.append(svg("path", { class: "curve", d: path(mGMV, yMax) }));

      // A sits on the curve's nose, so its label goes to the left, clear of the line.
      names.forEach((n, i) => {
        s.append(svg("circle", { class: "asset", cx: x(sd[i]), cy: y(mu[i]), r: 4.5 }));
        s.append(svg("text", i === 0
          ? { class: "asset-label", x: x(sd[i]) - 9, y: y(mu[i]) + 4, "text-anchor": "end" }
          : { class: "asset-label", x: x(sd[i]) + 9, y: y(mu[i]) + 4 }, n));
      });

      const cross = svg("line", { class: "cross", y1: T, y2: H - Bm, visibility: "hidden" });
      const pick = svg("circle", { class: "pick", r: 5, visibility: "hidden" });
      s.append(cross, pick);

      const sMax = Math.min(xMax, sigmaOf(yMax));
      function at(sig) {
        sig = Math.min(sMax, Math.max(sGMV, sig));
        const m = mOf(sig);
        const px = x(sig), py = y(m);
        cross.setAttribute("x1", px); cross.setAttribute("x2", px);
        cross.setAttribute("visibility", "visible");
        pick.setAttribute("cx", px); pick.setAttribute("cy", py);
        pick.setAttribute("visibility", "visible");
        const w = weightsOf(m).map((v, i) => `${names[i]} ${(v * 100).toFixed(0)}%`).join("   ");
        showTip(tip, fig, px + 12, py + 12,
          [`${(m * 100).toFixed(1)}% return`, `${(sig * 100).toFixed(1)}% risk`, `Weights: ${w}`]);
        state = sig;
      }
      const hide = () => {
        cross.setAttribute("visibility", "hidden");
        pick.setAttribute("visibility", "hidden");
        tip.hidden = true;
      };

      s.addEventListener("pointermove", (e) => {
        const r = s.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * W;
        at(((px - L) / (W - L - R)) * xMax);
      });
      s.addEventListener("pointerleave", hide);
      s.addEventListener("blur", hide);
      s.addEventListener("focus", () => at(state ?? sGMV));
      s.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        at((state ?? sGMV) + (e.key === "ArrowRight" ? 0.005 : -0.005));
      });

      host.replaceChildren(s);
    }

    draw();
    new ResizeObserver(draw).observe(host);
  })();
})();
