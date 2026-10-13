"""API behavior: Pick'em, calendars, co-scorer permissions, chat ownership."""
import pytest
from fastapi.testclient import TestClient

import main
from conftest import make_game, token_for


@pytest.fixture
def client():
    with TestClient(main.app) as c:
        yield c


def test_picks_until_kickoff(client, db, league):
    g = make_game(db, league, "AAA", "BBB", status="scheduled", share_code="PICK0001")
    assert client.post("/api/picks/pick0001", json={"team": "home", "voter_key": "voter-one-1"}).json() == {"home": 1, "away": 0, "total": 1}
    # The same browser changing its pick doesn't add a vote
    assert client.post("/api/picks/PICK0001", json={"team": "away", "voter_key": "voter-one-1"}).json() == {"home": 0, "away": 1, "total": 1}
    assert client.post("/api/picks/PICK0001", json={"team": "sideline", "voter_key": "voter-two-2"}).status_code == 400
    g.status, g.quarter = "live", "Q1"
    db.commit()
    assert client.post("/api/picks/PICK0001", json={"team": "home", "voter_key": "voter-three"}).status_code == 400
    assert client.get("/api/picks/PICK0001").json()["total"] == 1


def test_team_calendar(client, db, league):
    from datetime import datetime
    make_game(db, league, "AAA", "BBB", 21, 14, share_code="CAL00001", scheduled_at=datetime(2026, 10, 18, 13, 0))
    r = client.get(f"/api/calendar/team/{league['teams']['AAA'].id}.ics")
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/calendar")
    body = r.text
    assert "BEGIN:VEVENT" in body and "DTSTART;TZID=America/New_York:20261018T130000" in body
    assert "Final BBB 14\\, AAA 21" in body  # commas escaped


def test_coscorer_links_are_owner_only_and_limited_to_their_panels(client, db, league):
    make_game(db, league, "AAA", "BBB", status="live", share_code="COS00001")
    assert client.post("/api/coscorers/COS00001", json={"panels": ["clock"]}).status_code in (401, 403)
    auth_header = {"Authorization": f"Bearer {token_for(league['owner'])}"}
    link = client.post("/api/coscorers/COS00001", json={"panels": ["clock"], "label": "Booth"}, headers=auth_header).json()
    assert link["panels"] == ["clock"]
    action = lambda name: client.post(f"/api/coscore/COS00001/{link['token']}/action", json={"action": name})
    assert action("clock_toggle").status_code == 200
    assert action("flag").status_code == 403           # penalties weren't granted
    assert action("not_an_action").status_code == 403
    assert client.get("/api/coscore/COS00001/wrong-token").status_code == 403
    client.delete(f"/api/coscorers/COS00001/{link['id']}", headers=auth_header)
    assert action("clock_toggle").status_code == 403   # removed links stop working


def test_chat_settings_owner_only(client, db, league):
    make_game(db, league, "AAA", "BBB", status="live", share_code="CHAT0001")
    assert client.post("/api/chat/CHAT0001", json={"enabled": True}).status_code in (401, 403)
    auth_header = {"Authorization": f"Bearer {token_for(league['owner'])}"}
    assert client.post("/api/chat/CHAT0001", json={"enabled": True}, headers=auth_header).json() == {"enabled": True}
    assert client.get("/api/chat/CHAT0001").json() == {"enabled": True}
