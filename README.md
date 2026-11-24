# League of Ordinary Gentlemen · Keeper Tracker

**Live site:** https://pyandrew.github.io/football-sleeper-tracker/

A live dashboard for The League of Ordinary Gentlemen, a 10-team, half-PPR keeper league on Sleeper. It shows standings, season stats, every roster with its future keeper costs, and all draft-pick trades. It updates itself: each visit reads the latest data straight from Sleeper, so there's no server, no database and nothing to run each week.

---

## How it works

- **Data source:** [Sleeper's public API](https://docs.sleeper.com/). It's free, read-only, needs no login or key, and can be called straight from the browser. Nobody can change anything in the league through it.
- **What it loads on each visit:** the league settings, managers, rosters, draft results, traded picks, every week's transactions, and each scored week's matchups.
- **Player list:** Sleeper's full NFL player list is about 5 MB, so a trimmed copy (name, position, NFL team) is saved in the browser for 24 hours.
- **Hosting:** GitHub Pages serves the static files from `main`. A push goes live in about a minute.
- **Cache busting:** the two script tags in `index.html` end in `?v=N`. Bump the number on any change to `app.js` or `config.js` so every browser loads the new version instead of an old saved one.

---

## The page

Dark mode only, styled to match Sleeper.

### Header and top bar
- The title, plus a status line showing when the data was last loaded from Sleeper.
- **Pinned top bar:** stays at the top while scrolling.
  - Pills for each manager, in standings order, that jump to that team's roster.
  - After a divider: plain links to **Keeper rules**, **Full league rules** (`rules.html`) and **League history** (the league's separate history site, built from its ESPN years).
- A floating **↑ Back to top** button appears after scrolling down.

### Standings
Three views, switched with the **Table / By week / Results** buttons.

**Table:** one row per team, ranked by record, then points for. A dashed line under 4th place marks the playoff cut.

- **Playoff marks:** shown before the manager's name and updated each week: **\*** clinched the top seed, **X** clinched a playoff spot, **E** eliminated. A tie in wins counts as a threat, since points for decides it and can still change, so a mark only appears once it's certain. A legend sits under the table.

| Column | What it shows |
|---|---|
| # / Manager / Team | Rank, manager's first name (links to their roster), and Sleeper team name |
| Record | Wins-losses (-ties) |
| Diff | Points for minus points against. Green if positive, red if negative |
| Avg (low–high) | Average points per game, with the season's lowest and highest scores in small text |
| Bench pts | Total points scored by players on the bench, with rank (1st = most) |
| Pts left on bench | Points the best possible lineup would have added each week, with rank (1st = fewest, the best lineup calls) |
| Luck | Actual wins minus expected wins. Green if lucky, red if unlucky |

- **Expected wins:** each week, a team's score is compared with every other team's score that week. Beating 7 of 9 is worth 0.78 of a win, and ties count half. Expected wins are those weekly shares added up.
- **Best possible lineup:** for each week, the highest-scoring rostered players are fitted to the league's starting slots (QB, 2 RB, 3 WR, TE, K, DEF). Flex slots are supported if the league adds them.
- **Rank labels:** 1st place in Bench pts and Pts left on bench is highlighted in orange.
- **Team-name nudge:** managers who never set a Sleeper team name (it falls back to their username) get a dotted underline. Hovering or tapping shows 😴 and the tooltip "Booo, set a team name". It disappears on its own once they set one.
- A note under the table explains the calculated columns.

**By week:** a bump chart of every team's standings position after each regular-season week.
- One coloured line per team, with the dashed playoff line. Each team's current record is shown next to its name on the right.
- Hovering (or tapping on a phone) a line highlights it, fades the others, and labels each earlier week's dot with that team's record at the time. The labels only exist while the line is selected, so the chart stays clean otherwise.

**Results:** a grid with one row per team and one column per week. Each square is a W or L, shaded darker for close games and brighter for blowouts (full colour at a 60+ point margin). Hovering or tapping a square shows the opponent and margin, e.g. "Andrew R, week 1: beat Richard by 9.0". Each row ends with the team's record.

### Recent moves
The 25 latest trades, waiver claims and free-agent pickups, newest first, showing who got which players and picks and who was dropped.

### Team sections
One section per team, with the manager, team name, record and Sleeper username. The years in the examples below are from the 2026 season; all of them roll forward each season.

**Roster table:** every rostered player, defenses included.

| Column | What it shows |
|---|---|
| Player | Name, NFL team in small grey text (e.g. DAL), and an IR tag if on injured reserve |
| Pos | Position as coloured text matching Sleeper's Matchup page: QB `#fc2b6d`, RB `#20ceb8`, WR `#59a7ff`, TE `#feae58`, K `#c96cff`, DEF `#bf5f40` |
| How acquired | Drafted, Trade, Waiver (drafted) or Waiver (undrafted) |
| Drafted | Original draft round with the draft year in small text (e.g. 3rd 2026), or "Undrafted" with the pickup season |
| Next 4 seasons | Keeper cost each year: the round, with the keep number in small text (e.g. 9th 1st, 6th 2nd). "—" means the player can't be kept that year |

- **Position summary:** under the roster, a count of each position (QB 4, RB 4, WR 7…) and the total roster size.
- **Draft pick trades:** for each round in the next two drafts where a team has traded picks, it shows how many picks the team holds in that round. Details say who each pick was traded to and which trade it was part of, or where an extra pick came from. Teams with no pick trades see "One pick in every round".

### Keeper rules section
A summary of the keeper rules from `config.js`, plus a link to the full rules page.

### Phone layout (screens under 640px)
- The top bar is one row you swipe sideways, instead of several pinned rows.
- In the standings, the # and Manager columns stay in place while swiping. The Team, Bench pts and Pts left on bench columns are hidden, and so is their part of the note.
- In rosters, the player name column stays in place while swiping through the keeper years.
- The small keep numbers and draft years are hidden.
- On touch screens, tapping does what hovering does: pin a chart line, show a results-grid square's details, or show the 😴.

---

## Keeper cost logic

Based on the league's written rules and the commissioner's clarifications (see `rules.html`):

- **Cost per keep:** a keeper costs a pick earlier than the player's original draft round, and the steps add up with each keep. The 1st keep is 1 round earlier, the 2nd is 4 in total (1 + 3), the 3rd is 9 (+5), and the 4th is 16 (+7). A player can be kept at most 4 times.
- **Undrafted pickups:** the first keep costs an 8th, then moves up the same way.
- **Dropped players:** a drafted player who was dropped and picked up again keeps his original draft-round cost.
- **Traded players:** keeper costs move with the player in a trade.
- **What the table doesn't do:** it shows the base cost only. Collisions (two keepers needing the same round) and traded-away picks can push a keeper to an earlier round, which the page notes.

The offsets, the undrafted round and the seasons shown are all in `config.js`.

---

## Files

| File | Purpose |
|---|---|
| `index.html` | Page layout and all styles (including the phone layout) |
| `app.js` | Loads Sleeper data, works out every stat and keeper cost, and draws the page |
| `config.js` | League ID, manager names, keeper rule numbers, seasons shown, and the rules summary text. Edit this to change names or rules |
| `rules.html` | The full league rules, plus commissioner clarifications |
| `favicon.svg` | Football tab icon |

## Working on the site

- **Preview first:** design or layout changes are previewed and approved before going live. Small requested fixes and text tweaks go straight out.
- **`preview` branch:** a scratch branch for testing a change against live league data before it goes to `main`. It's overwritten each time and is never merged.
- **Deploying:** push to `main`, and GitHub Pages publishes it in about a minute. Remember to bump `?v=` when `app.js` or `config.js` changes.

---

## New season checklist

Do these each year, once the commissioner renews the league on Sleeper for the new season.

### Every season
- [ ] **New league ID:** copy it from the new league's Sleeper URL into `leagueId` in `config.js`. Sleeper links each new league back to the previous one (`previous_league_id`), but not forwards, so the site keeps showing last season's league until this is changed.
- [ ] **Seasons shown:** move `keeperSeasons` (the next 4 seasons) and `pickSeasons` (the next 2 drafts) in `config.js` forward one year. This step goes away once the one-time setup below works them out from the league's season.
- [ ] **Check by hand:** compare a few keeper costs (a player on his 2nd+ keep, a new draft pick and an undrafted pickup) against the league rules before telling the league.
- [ ] **Bump the cache version:** raise the `?v=` number on the two script tags in `index.html`. Changing the league ID edits `config.js`, so without a bump some browsers would keep showing last season.

### One-time setup (before the first season with returning keepers)
Build these once so they work for every season after:

- [ ] **Keeper history across seasons:** walk the chain of `previous_league_id` links back through every past season. Count each player's keeps from the picks marked as keepers in each season's draft, and set `priorKeeps` on each roster row in `app.js`. Until this is done, a player on a repeat keep shows and is costed as a 1st keep, which makes it too cheap.
- [ ] **Original acquisition year:** use the season a player was first drafted, or first picked up if undrafted, found across all past seasons. This keeps the year in the Drafted column and the keeper cost tied to his original round and year, not the current season.
- [ ] **Automatic seasons:** work out `keeperSeasons` and `pickSeasons` from the league's current season instead of hard-coding them.
- [ ] **Max-keeps limit:** once a player has used all 4 keeps (counted across seasons), show "—" for every future year.
- [ ] **Speed check:** history loads add a few requests per past season. If the page gets slow after many seasons, save past seasons' keeper history in the browser, like the player list, since it never changes.
