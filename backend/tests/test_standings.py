"""Standings and records: rebuilt from final scores, preseason kept out, past seasons frozen."""
import json
import types
from datetime import datetime

import main
import models
from conftest import make_game


def test_game_phase_from_unit_type_then_season():
    g = types.SimpleNamespace
    assert main.get_game_phase(g(game_unit_type=2), "regular") == "playoffs"
    assert main.get_game_phase(g(game_unit_type=3), "regular") == "preseason"
    assert main.get_game_phase(g(game_unit_type=1), "preseason") == "preseason"
    assert main.get_game_phase(g(game_unit_type=1), "offseason") == "regular"
    assert main.get_game_phase(g(game_unit_type=1), None) == "regular"


def test_team_records_count_current_season_finals_without_preseason(db, league):
    make_game(db, league, "AAA", "BBB", 21, 14)                                # A beats B
    make_game(db, league, "BBB", "AAA", 30, 3, unit_type=3, unit=1)            # preseason: B beats A
    make_game(db, league, "CCC", "AAA", 40, 0, season=league["past"])          # past season: ignored
    make_game(db, league, "AAA", "CCC", 7, 7)                                  # tie
    make_game(db, league, "CCC", "BBB", 0, 0, status="scheduled")              # not final: ignored
    main.recompute_team_records(db, league["league"].id)
    db.commit()
    a, b, c = (db.get(models.Team, league["teams"][x].id) for x in ("AAA", "BBB", "CCC"))
    assert (a.wins, a.losses, a.ties, a.points_for, a.points_against) == (1, 0, 1, 28, 21)
    assert (a.preseason_wins, a.preseason_losses) == (0, 1)
    assert (b.wins, b.losses, b.preseason_wins) == (0, 1, 1)
    assert (a.home_wins, a.home_ties, b.away_losses) == (1, 1, 1)
    assert (c.wins, c.losses, c.ties) == (0, 0, 1)


def test_season_stats_rebuilt_but_finished_seasons_frozen(db, league):
    make_game(db, league, "AAA", "BBB", 10, 3)
    past_game = make_game(db, league, "AAA", "BBB", 10, 3, season=league["past"])
    main.recompute_season_stats(db, league["current"].id)
    main.recompute_season_stats(db, league["past"].id)  # finished: must not change
    db.commit()
    stat = lambda season, team: db.query(models.TeamSeasonStats).filter_by(season_id=league[season].id, team_id=league["teams"][team].id).one()
    assert (stat("current", "AAA").wins, stat("current", "BBB").losses) == (1, 1)
    assert (stat("past", "AAA").wins, stat("past", "BBB").losses) == (0, 0)
    assert past_game.status == "final"


def test_editing_a_final_score_changes_the_records(db, league):
    g = make_game(db, league, "AAA", "BBB", 21, 14)
    main.recompute_team_records(db, league["league"].id)
    g.home_score, g.away_score = 14, 21
    db.commit()
    main.recompute_team_records(db, league["league"].id)
    db.commit()
    assert db.get(models.Team, league["teams"]["AAA"].id).losses == 1
    assert db.get(models.Team, league["teams"]["BBB"].id).wins == 1


def test_league_stats_points_and_tracked_stats(db, league):
    state = {"quickStats": {"home": {"firstDowns": 20, "thirdDownConv": 5, "thirdDownAtt": 10, "turnovers": 1, "penaltyYards": 40},
                            "away": {"firstDowns": 10, "thirdDownConv": 2, "thirdDownAtt": 8, "turnovers": 3, "penaltyYards": 20}},
             "timeOfPossession": {"home": 1900, "away": 1700}}
    make_game(db, league, "AAA", "BBB", 28, 10, display_state=json.dumps(state))
    make_game(db, league, "BBB", "AAA", 17, 20)                       # no quick stats: points only
    make_game(db, league, "AAA", "BBB", 50, 0, unit_type=3)           # preseason: left out
    out = {t["abbreviation"]: t for t in main.league_stats(league["league"].id, None, db)["teams"]}
    a = out["AAA"]
    assert (a["games"], a["points_per_game"], a["points_allowed_per_game"]) == (2, 24.0, 13.5)
    assert (a["tracked_games"], a["first_downs_per_game"], a["third_down_pct"], a["top_per_game_seconds"]) == (1, 20.0, 50.0, 1900)
    assert out["CCC"]["points_per_game"] is None


def test_espn_week_mapping():
    assert main.espn_unit(1, 1) == (3, 0)    # Hall of Fame game is preseason week 0
    assert main.espn_unit(1, 4) == (3, 3)
    assert main.espn_unit(2, 18) == (1, 18)
    assert main.espn_unit(3, 1) == (2, 1)    # Wild Card
    assert main.espn_unit(3, 4) is None      # Pro Bowl
    assert main.espn_unit(3, 5) == (2, 4)    # Super Bowl
