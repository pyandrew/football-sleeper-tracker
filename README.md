# League of Ordinary Gentlemen · Keeper Tracker

A one-page site that reads the league live from Sleeper's public API every time it's opened:
standings, recent moves, every roster with 2027–2030 keeper costs, and draft-pick trades.

- `index.html`: the page
- `app.js`: loads Sleeper data and works out keeper costs
- `rules.html`: the full league rules, plus commissioner clarifications
- `config.js`: league ID, the names shown for each manager, and the keeper rules. Edit this to change names or rules.

Hosted with GitHub Pages (Settings → Pages → Deploy from a branch → `main`, `/ (root)`).

## Next season checklist (2027)

Do these once the commissioner renews the league on Sleeper for 2027:

- [ ] **New league ID:** copy it from the new league's Sleeper URL into `leagueId` in `config.js`. Sleeper links the new league back to this one (`previous_league_id`), but not forwards, so the site keeps showing the 2026 league until this is changed.
- [ ] **Keeper years:** move `keeperSeasons` in `config.js` forward a year (2028–2031) and `pickSeasons` to 2028–2029.
- [ ] **Past keepers:** connect last season's keepers so each player's keep number and cost are right. Read the previous league's draft (`previous_league_id`) for picks marked as keepers, and set `priorKeeps` on each roster row in `app.js`. Until this is done, a player on his 2nd keep shows and is costed as a 1st keep, which makes it too cheap.
- [ ] **Undrafted pickup year:** players picked up undrafted in 2026 and kept should still show 2026 in the Drafted column, not the new season. Use the earliest pickup found across past seasons.
- [ ] **Check by hand:** compare a few keeper costs (one kept player, one new draft pick, one undrafted pickup) against the league rules before telling the league.
- [ ] **Bump the cache version** (`?v=`) on the two script tags in `index.html` so everyone's browser loads the update.

Branch note: `preview` is a scratch branch used to test changes against live data before they go to `main`. It's overwritten each time and is never merged.
