"""Test setup: a throwaway SQLite database. The production database is never used."""
import os
import sys

TEST_DB = os.environ.get("TEST_DB", "/tmp/gridiron_test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["DB_PATH"] = TEST_DB
os.environ.pop("VAPID_PRIVATE_KEY_FILE", None)  # no push notifications from tests
assert "scoreboard.db" not in os.environ["DATABASE_URL"], "tests must not use the production database"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest  # noqa: E402
from database import Base, engine, SessionLocal  # noqa: E402
import models  # noqa: E402
import auth  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def league(db):
    """A league with a current regular season, a finished past season, and three teams."""
    owner = models.User(email="owner@example.com", username="owner", hashed_password="x")
    db.add(owner)
    db.flush()
    lg = models.League(owner_id=owner.id, name="Test League", sport="Football", season="2026", game_unit_label="Week",
                       game_unit_label_2="Playoff Week", game_unit_label_3="Preseason Week")
    db.add(lg)
    db.flush()
    past = models.Season(league_id=lg.id, name="2025-26", is_current=False, is_finished=True, phase="regular")
    current = models.Season(league_id=lg.id, name="2026-27", is_current=True, is_finished=False, phase="regular")
    db.add_all([past, current])
    db.flush()
    teams = {}
    for abbr in ("AAA", "BBB", "CCC"):
        t = models.Team(league_id=lg.id, name=f"Team {abbr}", abbreviation=abbr, wins=0, losses=0, ties=0,
                        points_for=0, points_against=0)
        db.add(t)
        db.flush()
        teams[abbr] = t
        for s in (past, current):
            db.add(models.TeamSeasonStats(team_id=t.id, season_id=s.id, wins=0, losses=0, ties=0, points_for=0, points_against=0))
    db.commit()
    return {"league": lg, "owner": owner, "past": past, "current": current, "teams": teams}


def make_game(db, league, home, away, hs=0, as_=0, status="final", season=None, unit_type=1, unit=1, share_code=None, **extra):
    g = models.Game(league_id=league["league"].id, season_id=(season or league["current"]).id,
                    home_team_id=league["teams"][home].id, away_team_id=league["teams"][away].id,
                    home_score=hs, away_score=as_, status=status, game_unit_type=unit_type, game_unit=unit,
                    share_code=share_code, **extra)
    db.add(g)
    db.commit()
    return g


def token_for(user):
    return auth.create_access_token({"sub": user.id})
