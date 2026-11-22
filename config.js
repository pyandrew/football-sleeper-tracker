// League settings for the keeper tracker. Edit this file to change names or rules.
window.TRACKER_CONFIG = {
  leagueId: "1395896091538378752",

  // Sleeper username -> name shown on the page (first names only; the site is public)
  names: {
    previouschamp: "Andrew R",
    asharp: "Andrew S",
    Champ613: "Matthew",
    Tangent444: "Jason",
    GustySmokes: "Jon",
    steevo67: "Steve",
    Lombardi4ever: "Dennis",
    tigerstandbyme: "Michael",
    mfari: "Mark",
    richardsimard87: "Richard"
  },

  // Keeper rules
  undraftedKeeperRound: 8,          // undrafted waiver pickups: 1st keep costs this round
  keepOffsets: [1, 4, 9, 16],       // rounds earlier than the draft round for 1st..4th keep
  keeperSeasons: ["2027", "2028", "2029", "2030"],
  pickSeasons: ["2027", "2028"],    // seasons shown in the draft-pick trade tables
  rounds: 18,

  rulesText: [
    ["Max keepers per team", "20"],
    ["1st keep", "1 round earlier than the player's 2026 draft round"],
    ["2nd keep", "3 more rounds earlier (4 total)"],
    ["3rd keep", "5 more rounds earlier (9 total)"],
    ["4th keep (max)", "7 more rounds earlier (16 total). A player can be kept at most 4 times"],
    ["Undrafted waiver pickup", "1st keep costs an 8th; later keeps assumed to move up the same way (8th, 5th, then not keepable)"],
    ["Dropped, then picked up", "Keeps its original draft-round cost (commissioner clarification, Nov 2026)"],
    ["Traded players", "Keeper cost transfers to the new manager (not reset)"],
    ["Two keepers in the same round", "Second one uses a pick one round higher; the player kept more years goes higher (random if tied)"],
    ["Traded away the needed pick", "Use a pick one round higher"],
    ["Two picks in the same round", "Both can be used for keepers"],
    ["Draft order", "Linear (not snake) after 2026. Lottery among the 6 non-playoff teams; 3rd place picks 7th, 4th picks 8th, runner-up 9th, champion 10th"]
  ]
};
