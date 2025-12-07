import json
import math
from datetime import datetime
from typing import List, Dict, Set
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload

import models
import schemas
from database import engine, get_db, Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="ScoreKeeper API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room: str):
        await websocket.accept()
        if room not in self.active_connections:
            self.active_connections[room] = set()
        self.active_connections[room].add(websocket)

    def disconnect(self, websocket: WebSocket, room: str):
        if room in self.active_connections:
            self.active_connections[room].discard(websocket)
            if not self.active_connections[room]:
                del self.active_connections[room]

    async def broadcast(self, room: str, message: dict):
        if room in self.active_connections:
            dead_connections = set()
            for connection in self.active_connections[room]:
                try:
                    await connection.send_json(message)
                except:
                    dead_connections.add(connection)
            for conn in dead_connections:
                self.active_connections[room].discard(conn)


manager = ConnectionManager()


# ============ League Endpoints ============
@app.post("/api/leagues", response_model=schemas.League)
def create_league(league: schemas.LeagueCreate, db: Session = Depends(get_db)):
    db_league = models.League(**league.model_dump())
    db.add(db_league)
    db.commit()
    db.refresh(db_league)
    return db_league


@app.get("/api/leagues", response_model=List[schemas.League])
def get_leagues(db: Session = Depends(get_db)):
    return db.query(models.League).all()


@app.get("/api/leagues/{league_id}", response_model=schemas.LeagueWithTeams)
def get_league(league_id: str, db: Session = Depends(get_db)):
    league = db.query(models.League).options(
        joinedload(models.League.teams)
    ).filter(models.League.id == league_id).first()
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    return league


@app.put("/api/leagues/{league_id}", response_model=schemas.League)
def update_league(league_id: str, league: schemas.LeagueUpdate, db: Session = Depends(get_db)):
    db_league = db.query(models.League).filter(models.League.id == league_id).first()
    if not db_league:
        raise HTTPException(status_code=404, detail="League not found")
    for key, value in league.model_dump(exclude_unset=True).items():
        setattr(db_league, key, value)
    db.commit()
    db.refresh(db_league)
    return db_league


@app.delete("/api/leagues/{league_id}")
def delete_league(league_id: str, db: Session = Depends(get_db)):
    db_league = db.query(models.League).filter(models.League.id == league_id).first()
    if not db_league:
        raise HTTPException(status_code=404, detail="League not found")
    db.delete(db_league)
    db.commit()
    return {"message": "League deleted"}


# ============ Team Endpoints ============
@app.post("/api/teams", response_model=schemas.Team)
def create_team(team: schemas.TeamCreate, db: Session = Depends(get_db)):
    db_team = models.Team(**team.model_dump())
    db.add(db_team)
    db.commit()
    db.refresh(db_team)
    return db_team


@app.get("/api/leagues/{league_id}/teams", response_model=List[schemas.Team])
def get_league_teams(league_id: str, db: Session = Depends(get_db)):
    return db.query(models.Team).filter(models.Team.league_id == league_id).all()


@app.get("/api/leagues/{league_id}/standings", response_model=List[schemas.Team])
def get_league_standings(league_id: str, db: Session = Depends(get_db)):
    teams = db.query(models.Team).filter(models.Team.league_id == league_id).all()
    # Sort by wins (desc), then losses (asc), then point differential
    sorted_teams = sorted(teams, key=lambda t: (
        -t.wins,
        t.losses,
        -(t.points_for - t.points_against)
    ))
    return sorted_teams


@app.put("/api/teams/{team_id}", response_model=schemas.Team)
def update_team(team_id: str, team: schemas.TeamUpdate, db: Session = Depends(get_db)):
    db_team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not db_team:
        raise HTTPException(status_code=404, detail="Team not found")
    for key, value in team.model_dump(exclude_unset=True).items():
        setattr(db_team, key, value)
    db.commit()
    db.refresh(db_team)
    return db_team


@app.delete("/api/teams/{team_id}")
def delete_team(team_id: str, db: Session = Depends(get_db)):
    db_team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not db_team:
        raise HTTPException(status_code=404, detail="Team not found")
    db.delete(db_team)
    db.commit()
    return {"message": "Team deleted"}


# ============ Game Endpoints ============
@app.post("/api/games", response_model=schemas.GameWithTeams)
def create_game(game: schemas.GameCreate, db: Session = Depends(get_db)):
    db_game = models.Game(**game.model_dump())
    db.add(db_game)
    db.commit()
    db.refresh(db_game)
    return db.query(models.Game).options(
        joinedload(models.Game.home_team),
        joinedload(models.Game.away_team)
    ).filter(models.Game.id == db_game.id).first()


@app.get("/api/leagues/{league_id}/games", response_model=List[schemas.GameWithTeams])
def get_league_games(league_id: str, db: Session = Depends(get_db)):
    return db.query(models.Game).options(
        joinedload(models.Game.home_team),
        joinedload(models.Game.away_team)
    ).filter(models.Game.league_id == league_id).all()


@app.get("/api/games/{game_id}", response_model=schemas.GameWithTeams)
def get_game(game_id: str, db: Session = Depends(get_db)):
    game = db.query(models.Game).options(
        joinedload(models.Game.home_team),
        joinedload(models.Game.away_team)
    ).filter(models.Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return game


@app.get("/api/games/share/{share_code}", response_model=schemas.GameWithTeams)
def get_game_by_share_code(share_code: str, db: Session = Depends(get_db)):
    game = db.query(models.Game).options(
        joinedload(models.Game.home_team),
        joinedload(models.Game.away_team)
    ).filter(models.Game.share_code == share_code.upper()).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return game


@app.put("/api/games/{game_id}", response_model=schemas.GameWithTeams)
async def update_game(game_id: str, game_update: schemas.GameUpdate, db: Session = Depends(get_db)):
    db_game = db.query(models.Game).filter(models.Game.id == game_id).first()
    if not db_game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    old_status = db_game.status
    old_home_score = db_game.home_score
    old_away_score = db_game.away_score
    
    for key, value in game_update.model_dump(exclude_unset=True).items():
        setattr(db_game, key, value)
    
    # Handle status changes
    if game_update.status == "live" and old_status != "live":
        db_game.started_at = datetime.utcnow()
    elif game_update.status == "final" and old_status != "final":
        db_game.ended_at = datetime.utcnow()
        # Update team records
        home_team = db.query(models.Team).filter(models.Team.id == db_game.home_team_id).first()
        away_team = db.query(models.Team).filter(models.Team.id == db_game.away_team_id).first()
        if home_team and away_team:
            home_team.points_for += db_game.home_score
            home_team.points_against += db_game.away_score
            away_team.points_for += db_game.away_score
            away_team.points_against += db_game.home_score
            if db_game.home_score > db_game.away_score:
                home_team.wins += 1
                away_team.losses += 1
            elif db_game.away_score > db_game.home_score:
                away_team.wins += 1
                home_team.losses += 1
            else:
                home_team.ties += 1
                away_team.ties += 1
    
    db.commit()
    
    # Broadcast update to WebSocket clients
    game = db.query(models.Game).options(
        joinedload(models.Game.home_team),
        joinedload(models.Game.away_team)
    ).filter(models.Game.id == game_id).first()
    
    await manager.broadcast(f"game:{db_game.share_code}", {
        "type": "game_update",
        "data": {
            "id": game.id,
            "home_score": game.home_score,
            "away_score": game.away_score,
            "status": game.status,
            "quarter": game.quarter,
            "game_time": game.game_time,
            "home_team": {"id": game.home_team.id, "name": game.home_team.name, "color": game.home_team.color},
            "away_team": {"id": game.away_team.id, "name": game.away_team.name, "color": game.away_team.color}
        }
    })
    
    return game


@app.delete("/api/games/{game_id}")
def delete_game(game_id: str, db: Session = Depends(get_db)):
    db_game = db.query(models.Game).filter(models.Game.id == game_id).first()
    if not db_game:
        raise HTTPException(status_code=404, detail="Game not found")
    db.delete(db_game)
    db.commit()
    return {"message": "Game deleted"}


# ============ Bracket Endpoints ============
@app.post("/api/brackets", response_model=schemas.Bracket)
def create_bracket(bracket: schemas.BracketCreate, db: Session = Depends(get_db)):
    # Validate number of teams is power of 2
    num_teams = bracket.num_teams
    if num_teams < 2 or (num_teams & (num_teams - 1)) != 0:
        raise HTTPException(status_code=400, detail="Number of teams must be a power of 2")
    
    db_bracket = models.Bracket(
        league_id=bracket.league_id,
        name=bracket.name,
        bracket_type=bracket.bracket_type,
        num_teams=num_teams
    )
    db.add(db_bracket)
    db.commit()
    db.refresh(db_bracket)
    
    # Create bracket matches
    num_rounds = int(math.log2(num_teams))
    match_number = 0
    matches_by_round = {}
    
    for round_num in range(num_rounds, 0, -1):
        matches_in_round = 2 ** (round_num - 1)
        matches_by_round[round_num] = []
        for i in range(matches_in_round):
            match = models.BracketMatch(
                bracket_id=db_bracket.id,
                round_number=num_rounds - round_num + 1,
                match_number=match_number
            )
            db.add(match)
            db.flush()
            matches_by_round[round_num].append(match)
            match_number += 1
    
    # Link matches to next round
    for round_num in range(num_rounds, 1, -1):
        current_matches = matches_by_round[round_num]
        next_matches = matches_by_round[round_num - 1]
        for i, match in enumerate(current_matches):
            match.next_match_id = next_matches[i // 2].id
    
    # Seed teams into first round
    first_round_matches = matches_by_round[num_rounds]
    team_ids = bracket.team_ids[:num_teams]
    for i, match in enumerate(first_round_matches):
        if i * 2 < len(team_ids):
            match.team1_id = team_ids[i * 2]
        if i * 2 + 1 < len(team_ids):
            match.team2_id = team_ids[i * 2 + 1]
    
    db.commit()
    
    return db.query(models.Bracket).options(
        joinedload(models.Bracket.matches).joinedload(models.BracketMatch.team1),
        joinedload(models.Bracket.matches).joinedload(models.BracketMatch.team2),
        joinedload(models.Bracket.matches).joinedload(models.BracketMatch.winner)
    ).filter(models.Bracket.id == db_bracket.id).first()


@app.get("/api/leagues/{league_id}/brackets", response_model=List[schemas.Bracket])
def get_league_brackets(league_id: str, db: Session = Depends(get_db)):
    return db.query(models.Bracket).options(
        joinedload(models.Bracket.matches).joinedload(models.BracketMatch.team1),
        joinedload(models.Bracket.matches).joinedload(models.BracketMatch.team2),
        joinedload(models.Bracket.matches).joinedload(models.BracketMatch.winner)
    ).filter(models.Bracket.league_id == league_id).all()


@app.get("/api/brackets/{bracket_id}", response_model=schemas.Bracket)
def get_bracket(bracket_id: str, db: Session = Depends(get_db)):
    bracket = db.query(models.Bracket).options(
        joinedload(models.Bracket.matches).joinedload(models.BracketMatch.team1),
        joinedload(models.Bracket.matches).joinedload(models.BracketMatch.team2),
        joinedload(models.Bracket.matches).joinedload(models.BracketMatch.winner)
    ).filter(models.Bracket.id == bracket_id).first()
    if not bracket:
        raise HTTPException(status_code=404, detail="Bracket not found")
    return bracket


@app.get("/api/brackets/share/{share_code}", response_model=schemas.Bracket)
def get_bracket_by_share_code(share_code: str, db: Session = Depends(get_db)):
    bracket = db.query(models.Bracket).options(
        joinedload(models.Bracket.matches).joinedload(models.BracketMatch.team1),
        joinedload(models.Bracket.matches).joinedload(models.BracketMatch.team2),
        joinedload(models.Bracket.matches).joinedload(models.BracketMatch.winner)
    ).filter(models.Bracket.share_code == share_code.upper()).first()
    if not bracket:
        raise HTTPException(status_code=404, detail="Bracket not found")
    return bracket


@app.put("/api/brackets/matches/{match_id}", response_model=schemas.BracketMatch)
async def update_bracket_match(match_id: str, match_update: schemas.BracketMatchUpdate, db: Session = Depends(get_db)):
    db_match = db.query(models.BracketMatch).filter(models.BracketMatch.id == match_id).first()
    if not db_match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    for key, value in match_update.model_dump(exclude_unset=True).items():
        setattr(db_match, key, value)
    
    # If winner is set, advance to next match
    if match_update.winner_id and db_match.next_match_id:
        next_match = db.query(models.BracketMatch).filter(
            models.BracketMatch.id == db_match.next_match_id
        ).first()
        if next_match:
            # Determine if this is team1 or team2 slot
            if next_match.team1_id is None:
                next_match.team1_id = match_update.winner_id
            else:
                next_match.team2_id = match_update.winner_id
    
    db.commit()
    
    # Get bracket for broadcasting
    bracket = db.query(models.Bracket).filter(models.Bracket.id == db_match.bracket_id).first()
    
    match = db.query(models.BracketMatch).options(
        joinedload(models.BracketMatch.team1),
        joinedload(models.BracketMatch.team2),
        joinedload(models.BracketMatch.winner)
    ).filter(models.BracketMatch.id == match_id).first()
    
    # Broadcast update
    await manager.broadcast(f"bracket:{bracket.share_code}", {
        "type": "bracket_update",
        "data": {"match_id": match_id, "bracket_id": bracket.id}
    })
    
    return match


@app.delete("/api/brackets/{bracket_id}")
def delete_bracket(bracket_id: str, db: Session = Depends(get_db)):
    db_bracket = db.query(models.Bracket).filter(models.Bracket.id == bracket_id).first()
    if not db_bracket:
        raise HTTPException(status_code=404, detail="Bracket not found")
    db.delete(db_bracket)
    db.commit()
    return {"message": "Bracket deleted"}


# ============ Scoreboard Endpoints ============
@app.post("/api/scoreboards", response_model=schemas.Scoreboard)
def create_scoreboard(scoreboard: schemas.ScoreboardCreate, db: Session = Depends(get_db)):
    db_scoreboard = models.Scoreboard(
        name=scoreboard.name,
        description=scoreboard.description,
        is_public=scoreboard.is_public
    )
    db.add(db_scoreboard)
    db.commit()
    db.refresh(db_scoreboard)
    
    # Add players
    for player in scoreboard.players:
        db_player = models.ScoreboardPlayer(
            scoreboard_id=db_scoreboard.id,
            **player.model_dump()
        )
        db.add(db_player)
    
    db.commit()
    
    return db.query(models.Scoreboard).options(
        joinedload(models.Scoreboard.players)
    ).filter(models.Scoreboard.id == db_scoreboard.id).first()


@app.get("/api/scoreboards", response_model=List[schemas.Scoreboard])
def get_scoreboards(db: Session = Depends(get_db)):
    return db.query(models.Scoreboard).options(
        joinedload(models.Scoreboard.players)
    ).filter(models.Scoreboard.is_public == True).all()


@app.get("/api/scoreboards/{scoreboard_id}", response_model=schemas.Scoreboard)
def get_scoreboard(scoreboard_id: str, db: Session = Depends(get_db)):
    scoreboard = db.query(models.Scoreboard).options(
        joinedload(models.Scoreboard.players)
    ).filter(models.Scoreboard.id == scoreboard_id).first()
    if not scoreboard:
        raise HTTPException(status_code=404, detail="Scoreboard not found")
    return scoreboard


@app.get("/api/scoreboards/share/{share_code}", response_model=schemas.Scoreboard)
def get_scoreboard_by_share_code(share_code: str, db: Session = Depends(get_db)):
    scoreboard = db.query(models.Scoreboard).options(
        joinedload(models.Scoreboard.players)
    ).filter(models.Scoreboard.share_code == share_code.upper()).first()
    if not scoreboard:
        raise HTTPException(status_code=404, detail="Scoreboard not found")
    return scoreboard


@app.put("/api/scoreboards/{scoreboard_id}", response_model=schemas.Scoreboard)
def update_scoreboard(scoreboard_id: str, scoreboard: schemas.ScoreboardUpdate, db: Session = Depends(get_db)):
    db_scoreboard = db.query(models.Scoreboard).filter(models.Scoreboard.id == scoreboard_id).first()
    if not db_scoreboard:
        raise HTTPException(status_code=404, detail="Scoreboard not found")
    for key, value in scoreboard.model_dump(exclude_unset=True).items():
        setattr(db_scoreboard, key, value)
    db.commit()
    db.refresh(db_scoreboard)
    return db.query(models.Scoreboard).options(
        joinedload(models.Scoreboard.players)
    ).filter(models.Scoreboard.id == scoreboard_id).first()


@app.post("/api/scoreboards/{scoreboard_id}/players", response_model=schemas.ScoreboardPlayer)
async def add_scoreboard_player(scoreboard_id: str, player: schemas.ScoreboardPlayerCreate, db: Session = Depends(get_db)):
    scoreboard = db.query(models.Scoreboard).filter(models.Scoreboard.id == scoreboard_id).first()
    if not scoreboard:
        raise HTTPException(status_code=404, detail="Scoreboard not found")
    
    db_player = models.ScoreboardPlayer(
        scoreboard_id=scoreboard_id,
        **player.model_dump()
    )
    db.add(db_player)
    db.commit()
    db.refresh(db_player)
    
    # Broadcast update
    await manager.broadcast(f"scoreboard:{scoreboard.share_code}", {
        "type": "player_added",
        "data": {"id": db_player.id, "name": db_player.name, "score": db_player.score, "color": db_player.color}
    })
    
    return db_player


@app.put("/api/scoreboards/players/{player_id}", response_model=schemas.ScoreboardPlayer)
async def update_scoreboard_player(player_id: str, player: schemas.ScoreboardPlayerUpdate, db: Session = Depends(get_db)):
    db_player = db.query(models.ScoreboardPlayer).filter(models.ScoreboardPlayer.id == player_id).first()
    if not db_player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    for key, value in player.model_dump(exclude_unset=True).items():
        setattr(db_player, key, value)
    db.commit()
    db.refresh(db_player)
    
    # Get scoreboard for share code
    scoreboard = db.query(models.Scoreboard).filter(models.Scoreboard.id == db_player.scoreboard_id).first()
    
    # Broadcast update
    await manager.broadcast(f"scoreboard:{scoreboard.share_code}", {
        "type": "player_updated",
        "data": {"id": db_player.id, "name": db_player.name, "score": db_player.score, "color": db_player.color}
    })
    
    return db_player


@app.delete("/api/scoreboards/players/{player_id}")
async def delete_scoreboard_player(player_id: str, db: Session = Depends(get_db)):
    db_player = db.query(models.ScoreboardPlayer).filter(models.ScoreboardPlayer.id == player_id).first()
    if not db_player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    scoreboard = db.query(models.Scoreboard).filter(models.Scoreboard.id == db_player.scoreboard_id).first()
    
    db.delete(db_player)
    db.commit()
    
    # Broadcast update
    await manager.broadcast(f"scoreboard:{scoreboard.share_code}", {
        "type": "player_removed",
        "data": {"id": player_id}
    })
    
    return {"message": "Player deleted"}


@app.delete("/api/scoreboards/{scoreboard_id}")
def delete_scoreboard(scoreboard_id: str, db: Session = Depends(get_db)):
    db_scoreboard = db.query(models.Scoreboard).filter(models.Scoreboard.id == scoreboard_id).first()
    if not db_scoreboard:
        raise HTTPException(status_code=404, detail="Scoreboard not found")
    db.delete(db_scoreboard)
    db.commit()
    return {"message": "Scoreboard deleted"}


# ============ WebSocket Endpoints ============
@app.websocket("/ws/game/{share_code}")
async def game_websocket(websocket: WebSocket, share_code: str):
    room = f"game:{share_code.upper()}"
    await manager.connect(websocket, room)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle any client messages if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket, room)


@app.websocket("/ws/bracket/{share_code}")
async def bracket_websocket(websocket: WebSocket, share_code: str):
    room = f"bracket:{share_code.upper()}"
    await manager.connect(websocket, room)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, room)


@app.websocket("/ws/scoreboard/{share_code}")
async def scoreboard_websocket(websocket: WebSocket, share_code: str):
    room = f"scoreboard:{share_code.upper()}"
    await manager.connect(websocket, room)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, room)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
