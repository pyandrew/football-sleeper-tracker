(() => {
  "use strict";
  const C = window.TRACKER_CONFIG;
  const API = "https://api.sleeper.app/v1";
  const app = document.getElementById("app");
  const statusEl = document.getElementById("status");

  const getJSON = async (url) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${r.status} loading ${url}`);
    return r.json();
  };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ordinal = (n) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

  // Player list is ~5 MB; keep a trimmed copy in the browser for a day.
  async function loadPlayers() {
    const KEY = "kt_players_v1";
    try {
      const cached = JSON.parse(localStorage.getItem(KEY) || "null");
      if (cached && Date.now() - cached.t < 24 * 3600 * 1000) return cached.p;
    } catch (e) { /* ignore */ }
    const all = await getJSON(`${API}/players/nfl`);
    const p = {};
    for (const [id, x] of Object.entries(all)) {
      if (!["QB", "RB", "WR", "TE", "K", "DEF"].includes(x.position)) continue;
      p[id] = [x.full_name || `${x.first_name || ""} ${x.last_name || ""}`.trim() || id, x.position, x.team || "", x.last_name || x.full_name || id];
    }
    try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), p })); } catch (e) { /* storage full: fine */ }
    return p;
  }

  async function load() {
    const L = C.leagueId;
    statusEl.textContent = "Loading league from Sleeper…";
    const [league, users, rosters, drafts, traded, state, players] = await Promise.all([
      getJSON(`${API}/league/${L}`), getJSON(`${API}/league/${L}/users`), getJSON(`${API}/league/${L}/rosters`),
      getJSON(`${API}/league/${L}/drafts`), getJSON(`${API}/league/${L}/traded_picks`), getJSON(`${API}/state/nfl`), loadPlayers()
    ]);
    const draft = drafts.sort((a, b) => Number(a.season) - Number(b.season))[0];
    const picks = draft ? await getJSON(`${API}/draft/${draft.draft_id}/picks`) : [];
    // Always read every week so the full trade history is there, in season or out.
    const weeks = await Promise.all(Array.from({ length: 19 }, (_, w) => getJSON(`${API}/league/${L}/transactions/${w}`).catch(() => [])));
    const tx = weeks.flat().filter((t) => t.status === "complete").sort((a, b) => a.status_updated - b.status_updated);
    // Scored regular-season weeks, for the standings-by-week chart and season stats.
    const ls = league.settings || {};
    const lastWeek = Math.min(ls.last_scored_leg || 0, (ls.playoff_week_start || 99) - 1);
    const matchups = await Promise.all(Array.from({ length: lastWeek }, (_, i) => getJSON(`${API}/league/${L}/matchups/${i + 1}`).catch(() => [])));
    return { league, users, rosters, picks, traded, tx, players, matchups };
  }

  function build(d) {
    const userById = Object.fromEntries(d.users.map((u) => [u.user_id, u]));
    const teamName = (r) => { const u = userById[r.owner_id] || {}; return (u.metadata && u.metadata.team_name) || u.display_name || `Team ${r.roster_id}`; };
    const person = (r) => { const u = userById[r.owner_id] || {}; return C.names[u.display_name] || u.display_name || `Team ${r.roster_id}`; };
    const rid2person = Object.fromEntries(d.rosters.map((r) => [r.roster_id, person(r)]));
    const draftPick = Object.fromEntries(d.picks.map((p) => [p.player_id, p]));
    const P = (id) => d.players[id] || [id, "?", "", id];
    const shortName = (id) => { const p = P(id); return p[1] === "DEF" ? `${p[2] || p[0]} D` : p[3]; };
    const tradeLabel = (t) => { const ps = Object.keys(t.adds || {}).map(shortName); return ps.length ? `${ps.join(" + ")} trade` : "pick swap"; };

    const keepCost = (rd, i) => {
      const off = C.keepOffsets[i];
      if (rd === "FA") { const c = C.undraftedKeeperRound - (off - 1); return c >= 1 ? c : null; }
      const c = rd - off; return c >= 1 ? c : null;
    };

    const teams = d.rosters.map((r) => {
      const rows = [];
      for (const id of r.players || []) {
        const p = P(id);
        const adds = d.tx.filter((t) => t.adds && t.adds[id] === r.roster_id);
        const last = adds[adds.length - 1];
        const dp = draftPick[id];
        let how;
        if (last) how = last.type === "trade" ? "Trade" : (dp ? "Waiver (drafted)" : "Waiver (undrafted)");
        else how = dp && dp.picked_by === r.owner_id ? "Drafted" : (dp ? "Waiver (drafted)" : "Waiver (undrafted)");
        const ir = (r.reserve || []).includes(id);
        const rd = dp ? dp.round : "FA";
        rows.push({ name: p[0], pos: p[1], team: p[2], how, ir, rd, costs: C.keeperSeasons.map((_, i) => keepCost(rd, i)) });
      }
      rows.sort((a, b) => (a.rd === "FA" ? 99 : a.rd) - (b.rd === "FA" ? 99 : b.rd) || a.name.localeCompare(b.name));

      const pickRows = [];
      for (const season of C.pickSeasons) {
        const tp = d.traded.filter((p) => p.season === season);
        for (let rd = 1; rd <= C.rounds; rd++) {
          const own = tp.find((p) => p.round === rd && p.roster_id === r.roster_id);
          const ownKept = !own || own.owner_id === r.roster_id;
          const extras = tp.filter((p) => p.round === rd && p.owner_id === r.roster_id && p.roster_id !== r.roster_id);
          if (ownKept && !extras.length) continue;
          const movesOf = (orig) => d.tx.filter((x) => x.type === "trade" && (x.draft_picks || []).some((p) => p.season === season && p.round === rd && p.roster_id === orig));
          const parts = [];
          if (!ownKept) {
            const first = movesOf(r.roster_id).find((x) => x.draft_picks.some((p) => p.season === season && p.round === rd && p.roster_id === r.roster_id && p.previous_owner_id === r.roster_id));
            const fp = first && first.draft_picks.find((p) => p.season === season && p.round === rd && p.roster_id === r.roster_id);
            let s = `Own pick traded to ${rid2person[fp ? fp.owner_id : own.owner_id]}${first ? ` (${tradeLabel(first)})` : ""}`;
            if (fp && fp.owner_id !== own.owner_id) s += `, now with ${rid2person[own.owner_id]}`;
            parts.push(s);
          }
          for (const e of extras) {
            const via = movesOf(e.roster_id).filter((x) => x.draft_picks.some((p) => p.season === season && p.round === rd && p.roster_id === e.roster_id && p.owner_id === r.roster_id)).pop();
            const vp = via && via.draft_picks.find((p) => p.season === season && p.round === rd && p.roster_id === e.roster_id && p.owner_id === r.roster_id);
            const from = vp ? rid2person[vp.previous_owner_id] : rid2person[e.roster_id];
            parts.push(`Extra from ${from}${from !== rid2person[e.roster_id] ? ` (originally ${rid2person[e.roster_id]}'s)` : ""}${via ? ` (${tradeLabel(via)})` : ""}`);
          }
          pickRows.push({ season, rd, n: (ownKept ? 1 : 0) + extras.length, detail: parts.join("; ") });
        }
      }
      const s = r.settings || {};
      return {
        id: r.roster_id, person: person(r), team: teamName(r), user: (userById[r.owner_id] || {}).display_name || "",
        w: s.wins || 0, l: s.losses || 0, t: s.ties || 0, pf: (s.fpts || 0) + (s.fpts_decimal || 0) / 100,
        rows, pickRows
      };
    });
    const recordSort = (a, b) => (b.w + b.t / 2) - (a.w + a.t / 2) || b.pf - a.pf;
    teams.sort(recordSort);

    // Week-by-week: running record for the rank chart, plus PA / high / low.
    const run = Object.fromEntries(teams.map((t) => [t.id, { id: t.id, w: 0, t: 0, pf: 0 }]));
    const stat = Object.fromEntries(teams.map((t) => [t.id, { pa: 0, hi: null, lo: null, g: 0, expW: 0, ranks: [] }]));
    for (const week of d.matchups) {
      const games = {};
      for (const m of week) if (m.matchup_id != null) (games[m.matchup_id] = games[m.matchup_id] || []).push(m);
      for (const [a, b] of Object.values(games)) {
        if (!a || !b || !run[a.roster_id] || !run[b.roster_id]) continue;
        for (const [x, y] of [[a, b], [b, a]]) {
          const pts = x.points || 0, opp = y.points || 0, st = stat[x.roster_id], r = run[x.roster_id];
          r.pf += pts; st.pa += opp; st.g += 1;
          st.hi = st.hi == null ? pts : Math.max(st.hi, pts);
          st.lo = st.lo == null ? pts : Math.min(st.lo, pts);
          if (pts > opp) r.w += 1; else if (pts === opp) r.t += 1;
        }
      }
      // Expected wins: share of the other teams your score beat that week (ties count half).
      const scored = week.filter((x) => stat[x.roster_id]);
      for (const x of scored) {
        const others = scored.filter((o) => o !== x);
        if (!others.length) continue;
        const beat = others.reduce((n, o) => n + ((x.points || 0) > (o.points || 0) ? 1 : (x.points || 0) === (o.points || 0) ? 0.5 : 0), 0);
        stat[x.roster_id].expW += beat / others.length;
      }
      Object.values(run).sort(recordSort).forEach((r, i) => stat[r.id].ranks.push(i + 1));
    }
    teams.forEach((t) => Object.assign(t, stat[t.id]));

    const recent = d.tx.filter((t) => ["trade", "waiver", "free_agent"].includes(t.type)).slice(-25).reverse().map((t) => {
      const when = new Date(t.status_updated).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      const lines = [];
      const byRoster = {};
      for (const [id, rid] of Object.entries(t.adds || {})) (byRoster[rid] = byRoster[rid] || { add: [], drop: [], pick: [] }).add.push(P(id)[0]);
      for (const [id, rid] of Object.entries(t.drops || {})) (byRoster[rid] = byRoster[rid] || { add: [], drop: [], pick: [] }).drop.push(P(id)[0]);
      for (const p of t.draft_picks || []) (byRoster[p.owner_id] = byRoster[p.owner_id] || { add: [], drop: [], pick: [] }).pick.push(`${p.season} ${ordinal(p.round)}${p.roster_id !== p.owner_id ? ` (${rid2person[p.roster_id]}'s)` : ""}`);
      for (const [rid, v] of Object.entries(byRoster)) {
        const bits = [];
        if (v.add.length || v.pick.length) bits.push(`gets ${[...v.add, ...v.pick].join(", ")}`);
        if (t.type !== "trade" && v.drop.length) bits.push(`drops ${v.drop.join(", ")}`);
        if (bits.length) lines.push(`<b>${esc(rid2person[rid])}</b> ${esc(bits.join("; "))}`);
      }
      const kind = t.type === "trade" ? "Trade" : t.type === "waiver" ? "Waiver" : "Free agent";
      return { when, kind, lines };
    });

    const playoffTeams = (d.league.settings && d.league.settings.playoff_teams) || 4;
    return { teams, recent, season: d.league.season, leagueName: d.league.name, weeks: d.matchups.length, playoffTeams };
  }

  const LINE_COLOURS = ["#59a7ff", "#20ceb8", "#feae58", "#c96cff", "#fc2b6d", "#8bd450", "#f5d547", "#ff8a5b", "#7aa2c9", "#e58bd3", "#b0b0b8", "#5fd0e8"];
  function rankChart(m) {
    const W = m.weeks, N = m.teams.length;
    if (W < 1) return "";
    const L = 60, R = 570, T = 20, B = 300;
    const x = (w) => (W === 1 ? (L + R) / 2 : L + ((w - 1) * (R - L)) / (W - 1));
    const y = (r) => T + ((r - 1) * (B - T)) / Math.max(N - 1, 1);
    let g = "";
    for (let r = 1; r <= N; r++) g += `<line x1="${L}" x2="${R}" y1="${y(r)}" y2="${y(r)}" class="grid"/><text x="${L - 40}" y="${y(r) + 4}" class="axis">#${r}</text>`;
    const cut = (y(m.playoffTeams) + y(m.playoffTeams + 1)) / 2;
    g += `<line x1="${L - 8}" x2="${R + 8}" y1="${cut}" y2="${cut}" class="cutline"/>`;
    for (let w = 1; w <= W; w++) g += `<text x="${x(w)}" y="${B + 22}" class="axis" text-anchor="middle">Wk ${w}</text>`;
    const lines = m.teams.map((t, i) => {
      const c = LINE_COLOURS[i % LINE_COLOURS.length];
      const pts = t.ranks.map((r, k) => `${x(k + 1)},${y(r)}`);
      return `<g class="team-line"><polyline points="${pts.join(" ")}" stroke="${c}"/>${t.ranks.map((r, k) => `<circle cx="${x(k + 1)}" cy="${y(r)}" r="3.5" fill="${c}"/>`).join("")}<text x="${R + 12}" y="${y(t.ranks[t.ranks.length - 1]) + 4}" fill="${c}">${esc(t.person)}</text></g>`;
    }).join("");
    return `<svg class="bump" viewBox="0 0 680 330" role="img" aria-label="Standings position after each week">${g}${lines}</svg>`;
  }

  function wireStandingsToggle() {
    const sec = document.getElementById("standings");
    if (!sec) return;
    sec.querySelectorAll(".seg button").forEach((btn) => btn.addEventListener("click", () => {
      sec.querySelectorAll(".seg button").forEach((b) => b.classList.toggle("on", b === btn));
      sec.querySelectorAll("[data-pane]").forEach((p) => { p.hidden = p.dataset.pane !== btn.dataset.view; });
    }));
  }

  function render(m) {
    const costCell = (c) => (c ? `<td class="num">${ordinal(c)}</td>` : `<td class="num muted">—</td>`);
    const nav = m.teams.map((t) => `<a href="#team-${t.id}">${esc(t.person)}</a>`).join("");
    const f1 = (n) => (n == null ? "—" : n.toFixed(1));
    const signed = (n) => (n == null ? "—" : `<span class="${n > 0.05 ? "up" : n < -0.05 ? "down" : ""}">${n > 0.05 ? "+" : ""}${n.toFixed(1)}</span>`);
    const standings = m.teams.map((t, i) => `<tr${i === m.playoffTeams - 1 ? ' class="cut"' : ""}><td class="num">${i + 1}</td><td><a href="#team-${t.id}">${esc(t.person)}</a></td><td>${esc(t.team)}</td><td class="num">${t.w}-${t.l}${t.t ? "-" + t.t : ""}</td><td class="num">${signed(t.g ? t.pf - t.pa : null)}</td><td class="num">${f1(t.hi)}</td><td class="num">${f1(t.g ? t.pf / t.g : null)}</td><td class="num">${f1(t.lo)}</td><td class="num">${signed(t.g ? t.w + t.t / 2 - t.expW : null)}</td></tr>`).join("");
    const bump = rankChart(m);
    const POS_ORDER = ["QB", "RB", "WR", "TE", "K", "DEF"];
    const posSummary = (rows) => {
      const n = {};
      rows.forEach((r) => { n[r.pos] = (n[r.pos] || 0) + 1; });
      const order = POS_ORDER.concat(Object.keys(n).filter((p) => !POS_ORDER.includes(p)));
      const parts = order.filter((p) => n[p]).map((p) => `<span><span class="pos pos-${esc(p)}">${esc(p)}</span> ${n[p]}</span>`).join("");
      return `<div class="pos-sum">${parts}<span class="total">${rows.length} players</span></div>`;
    };
    const teamSections = m.teams.map((t) => `
      <section class="team" id="team-${t.id}">
        <h2>${esc(t.person)} <span class="sub">${esc(t.team)} · ${t.w}-${t.l}${t.t ? "-" + t.t : ""} · @${esc(t.user)}</span></h2>
        <div class="scroll"><table>
          <thead><tr><th>Player</th><th>Pos</th><th>How acquired</th><th class="num">Drafted</th>${C.keeperSeasons.map((s, i) => `<th class="num">${s}<br><span class="sub">${ordinal(i + 1)} keep</span></th>`).join("")}</tr></thead>
          <tbody>${t.rows.map((r) => `<tr><td>${esc(r.name)}${r.team && r.pos !== "DEF" ? `<span class="nfl">${esc(r.team)}</span>` : ""}${r.ir ? ' <span class="tag">IR</span>' : ""}</td><td><span class="pos pos-${esc(r.pos)}">${esc(r.pos)}</span></td><td>${esc(r.how)}</td><td class="num">${r.rd === "FA" ? "Undrafted" : ordinal(r.rd)}</td>${r.costs.map(costCell).join("")}</tr>`).join("")}</tbody>
        </table></div>
        ${posSummary(t.rows)}
        <h3>Draft pick trades</h3>
        ${t.pickRows.length ? `<div class="scroll"><table class="picks"><thead><tr><th>Season</th><th class="num">Round</th><th class="num"># of picks</th><th>Details</th></tr></thead><tbody>${t.pickRows.map((p) => `<tr><td>${p.season}</td><td class="num">${ordinal(p.rd)}</td><td class="num${p.n === 0 ? " muted" : ""}">${p.n}</td><td>${esc(p.detail)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted">No draft-pick trades. One pick in every round.</p>`}
      </section>`).join("");
    const recent = m.recent.map((r) => `<li><span class="sub">${esc(r.when)} · ${r.kind}</span><br>${r.lines.join("<br>")}</li>`).join("");
    const rules = C.rulesText.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("");

    app.innerHTML = `
      <nav class="teams"><div class="nav-row">${nav}<span class="sep sep-main" aria-hidden="true"></span><a class="info" href="#rules">Keeper rules</a><span class="sep" aria-hidden="true"></span><a class="info" href="rules.html">Full league rules</a><span class="sep" aria-hidden="true"></span><a class="info" href="https://ordinarygentlemen.pages.dev/">League history</a></div></nav>
      <section id="standings">
        <div class="sec-head"><h2>Standings</h2>${bump ? `<div class="seg" role="tablist"><button type="button" class="on" data-view="table">Table</button><button type="button" data-view="chart">By week</button></div>` : ""}</div>
        <div data-pane="table"><div class="scroll"><table><thead><tr><th class="num">#</th><th>Manager</th><th>Team</th><th class="num">Record</th><th class="num">Diff</th><th class="num">High</th><th class="num">Avg</th><th class="num">Low</th><th class="num">Luck</th></tr></thead><tbody>${standings}</tbody></table></div>
        <p class="note">Luck = actual wins minus expected wins. Expected wins are based on how many teams your score would have beaten each week. Positive means your record is better than your scoring; negative means worse.</p></div>
        ${bump ? `<div data-pane="chart" hidden>${bump}<p class="note">Rank after each week, by record then points for. Hover a line to highlight it.</p></div>` : ""}
      </section>
      <section><h2>Recent moves</h2><ul class="moves">${recent || "<li class='muted'>No moves yet.</li>"}</ul></section>
      ${teamSections}
      <section id="rules"><h2>Keeper rules</h2><p><a href="rules.html">Read the full league rules &rarr;</a></p><p class="sub">Keeper costs show the round needed for each consecutive keep. "—" means the player can't be kept that year. Collisions (two keepers in one round) and traded-away picks can push a keeper to an earlier round; this page shows the base cost only.</p><table><tbody>${rules}</tbody></table></section>`;
    statusEl.textContent = `Live from Sleeper · updated ${new Date().toLocaleString()}`;
    wireStandingsToggle();
  }

  load().then((d) => render(build(d))).catch((e) => {
    console.error(e);
    statusEl.textContent = `Couldn't load from Sleeper: ${e.message}. Try refreshing.`;
  });
})();
