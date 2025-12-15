import json
import math
import os
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Set, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session, joinedload

import models
import schemas
import auth
from database import engine, get_db, Base


# Create uploads directory for team logos
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="ScoreKeeper API", version="1.0.0", lifespan=lifespan)

# Serve uploaded files statically
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

# Heartbeat tracking for live game controllers
# Maps game_id (string UUID) -> last heartbeat timestamp
game_heartbeats: Dict[str, datetime] = {}
HEARTBEAT_TIMEOUT_SECONDS = 10  # If no heartbeat for 10 seconds, trigger tech difficulties


# ============ Auth Endpoints ============
@app.post("/api/auth/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    print(f"Registration attempt for email: {user.email}, username: {user.username}")
    # Check if email already exists
    if auth.get_user_by_email(db, user.email):
        print("Email already registered")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    # Check if username already exists
    if auth.get_user_by_username(db, user.username):
        print("Username already taken")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    print("Creating user...")
    result = auth.create_user(db, user)
    print(f"User created successfully: {result.id}")
    return result


@app.post("/api/auth/login", response_model=schemas.Token)
def login(user_login: schemas.UserLogin, db: Session = Depends(get_db)):
    user = auth.authenticate_user(db, user_login.email, user_login.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/auth/me", response_model=schemas.User)
async def get_current_user_info(
    current_user: models.User = Depends(auth.get_current_user_required)
):
    return current_user


@app.put("/api/auth/me", response_model=schemas.User)
async def update_current_user(
    updates: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user_required)
):
    if updates.username:
        # Check if username is taken by another user
        existing = db.query(models.User).filter(
            models.User.username == updates.username,
            models.User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        current_user.username = updates.username
    if updates.email:
        # Check if email is taken by another user
        existing = db.query(models.User).filter(
            models.User.email == updates.email,
            models.User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already taken")
        current_user.email = updates.email
    db.commit()
    db.refresh(current_user)
    return current_user


@app.put("/api/auth/password")
async def change_password(
    password_data: schemas.PasswordChange,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user_required)
):
    # Verify current password
    if not auth.verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Update password
    current_user.hashed_password = auth.get_password_hash(password_data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


# ============ League Endpoints ============
@app.post("/api/leagues", response_model=schemas.League)
async def create_league(
    league: schemas.LeagueCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user_required)
):
    # Require authentication to create leagues (guests can't save data)
    db_league = models.League(**league.model_dump())
    db_league.owner_id = current_user.id
    db.add(db_league)
    db.commit()
    db.refresh(db_league)
    return db_league


@app.get("/api/leagues", response_model=List[schemas.League])
async def get_leagues(
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    # Return leagues owned by the current user, plus orphaned leagues (no owner)
    if current_user:
        from sqlalchemy import or_
        return db.query(models.League).filter(
            or_(
                models.League.owner_id == current_user.id,
                models.League.owner_id == None  # Include orphaned leagues
            )
        ).all()
    return []


@app.post("/api/leagues/{league_id}/claim")
async def claim_league(
    league_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user_required)
):
    """Claim an orphaned league (one with no owner)"""
    league = db.query(models.League).filter(models.League.id == league_id).first()
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    if league.owner_id is not None:
        raise HTTPException(status_code=400, detail="League already has an owner")
    league.owner_id = current_user.id
    db.commit()
    return {"message": "League claimed successfully"}


@app.get("/api/leagues/my", response_model=List[schemas.League])
async def get_my_leagues(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user_required)
):
    return db.query(models.League).filter(models.League.owner_id == current_user.id).all()


@app.get("/api/users/{username}/leagues", response_model=List[schemas.League])
def get_user_leagues(username: str, db: Session = Depends(get_db)):
    """Get all leagues owned by a specific user (public endpoint)"""
    user = auth.get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return db.query(models.League).filter(models.League.owner_id == user.id).all()


@app.get("/api/leagues/{league_id}", response_model=schemas.LeagueWithTeams)
def get_league(league_id: str, db: Session = Depends(get_db)):
    league = db.query(models.League).options(
        joinedload(models.League.teams)
    ).filter(models.League.id == league_id).first()
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    return league


def check_league_ownership(db: Session, league_id: str, current_user: Optional[models.User]) -> models.League:
    """Helper to check if user owns the league. Returns league if owned, raises 403 if not."""
    db_league = db.query(models.League).filter(models.League.id == league_id).first()
    if not db_league:
        raise HTTPException(status_code=404, detail="League not found")
    # If league has an owner and user is not that owner, deny access
    if db_league.owner_id is not None:
        if current_user is None or db_league.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="You don't have permission to modify this league")
    return db_league


@app.get("/api/leagues/share/{share_code}", response_model=schemas.LeagueWithTeams)
def get_league_by_share_code(share_code: str, db: Session = Depends(get_db)):
    """Get a league by its share code (public endpoint)"""
    league = db.query(models.League).options(
        joinedload(models.League.teams)
    ).filter(models.League.share_code == share_code.upper()).first()
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    return league


@app.put("/api/leagues/{league_id}", response_model=schemas.League)
async def update_league(
    league_id: str, 
    league: schemas.LeagueUpdate, 
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    db_league = check_league_ownership(db, league_id, current_user)
    for key, value in league.model_dump(exclude_unset=True).items():
        # Convert groups dict to JSON string
        if key == 'groups' and value is not None:
            value = json.dumps(value)
        setattr(db_league, key, value)
    db.commit()
    db.refresh(db_league)
    return db_league


@app.delete("/api/leagues/{league_id}", status_code=204)
async def delete_league(
    league_id: str, 
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    db_league = check_league_ownership(db, league_id, current_user)
    
    try:
        # Get bracket IDs first
        bracket_ids = [b.id for b in db.query(models.Bracket).filter(models.Bracket.league_id == league_id).all()]
        
        # Delete bracket matches
        if bracket_ids:
            db.query(models.BracketMatch).filter(models.BracketMatch.bracket_id.in_(bracket_ids)).delete(synchronize_session=False)
        
        # Delete brackets
        db.query(models.Bracket).filter(models.Bracket.league_id == league_id).delete(synchronize_session=False)
        
        # Delete games
        db.query(models.Game).filter(models.Game.league_id == league_id).delete(synchronize_session=False)
        
        # Delete teams
        db.query(models.Team).filter(models.Team.league_id == league_id).delete(synchronize_session=False)
        
        # Delete the league
        db.query(models.League).filter(models.League.id == league_id).delete(synchronize_session=False)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
    return None


# ============ Team Endpoints ============
@app.post("/api/teams", response_model=schemas.Team)
async def create_team(
    team: schemas.TeamCreate, 
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    # Check user owns the league this team belongs to
    check_league_ownership(db, team.league_id, current_user)
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
async def update_team(
    team_id: str, 
    team: schemas.TeamUpdate, 
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    db_team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not db_team:
        raise HTTPException(status_code=404, detail="Team not found")
    # Check user owns the league this team belongs to
    check_league_ownership(db, db_team.league_id, current_user)
    for key, value in team.model_dump(exclude_unset=True).items():
        setattr(db_team, key, value)
    db.commit()
    db.refresh(db_team)
    return db_team


@app.delete("/api/teams/{team_id}", status_code=204)
async def delete_team(
    team_id: str, 
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    db_team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not db_team:
        raise HTTPException(status_code=404, detail="Team not found")
    # Check user owns the league this team belongs to
    check_league_ownership(db, db_team.league_id, current_user)
    
    # Delete games involving this team
    db.query(models.Game).filter(
        (models.Game.home_team_id == team_id) | (models.Game.away_team_id == team_id)
    ).delete(synchronize_session=False)
    
    # Clear team references in bracket matches (set to NULL)
    db.query(models.BracketMatch).filter(models.BracketMatch.team1_id == team_id).update({"team1_id": None})
    db.query(models.BracketMatch).filter(models.BracketMatch.team2_id == team_id).update({"team2_id": None})
    db.query(models.BracketMatch).filter(models.BracketMatch.winner_id == team_id).update({"winner_id": None})
    
    db.delete(db_team)
    db.commit()
    return None


@app.post("/api/teams/{team_id}/logo")
async def upload_team_logo(
    team_id: str, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    db_team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not db_team:
        raise HTTPException(status_code=404, detail="Team not found")
    # Check user owns the league this team belongs to
    check_league_ownership(db, db_team.league_id, current_user)
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG")
    
    # Generate unique filename
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"{team_id}_{uuid.uuid4().hex[:8]}.{file_ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    # Delete old logo if exists
    if db_team.logo_url:
        old_filename = db_team.logo_url.split("/")[-1]
        old_filepath = os.path.join(UPLOAD_DIR, old_filename)
        if os.path.exists(old_filepath):
            os.remove(old_filepath)
    
    # Save new file
    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Update team with logo URL
    db_team.logo_url = f"/uploads/{filename}"
    db.commit()
    db.refresh(db_team)
    
    return {"logo_url": db_team.logo_url}


@app.delete("/api/teams/{team_id}/logo", status_code=204)
async def delete_team_logo(
    team_id: str, 
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    db_team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not db_team:
        raise HTTPException(status_code=404, detail="Team not found")
    # Check user owns the league this team belongs to
    check_league_ownership(db, db_team.league_id, current_user)
    
    if db_team.logo_url:
        filename = db_team.logo_url.split("/")[-1]
        filepath = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
        db_team.logo_url = None
        db.commit()
    
    return None


# ============ Game Endpoints ============
@app.post("/api/games", response_model=schemas.GameWithTeams)
async def create_game(
    game: schemas.GameCreate, 
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    # Check user owns the league this game belongs to
    check_league_ownership(db, game.league_id, current_user)
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


def calculate_live_game_time(game):
    """Calculate the current game time if timer is running"""
    if game.timer_running and game.timer_started_at and game.timer_started_seconds is not None:
        now = datetime.utcnow()
        elapsed_seconds = int((now - game.timer_started_at).total_seconds())
        current_seconds = max(0, game.timer_started_seconds - elapsed_seconds)
        mins = current_seconds // 60
        secs = current_seconds % 60
        game.game_time = f"{mins}:{secs:02d}"
        
        # If time ran out, stop the timer
        if current_seconds <= 0:
            game.timer_running = False
    return game


@app.get("/api/games/{game_id}", response_model=schemas.GameWithTeams)
def get_game(game_id: str, db: Session = Depends(get_db)):
    game = db.query(models.Game).options(
        joinedload(models.Game.home_team),
        joinedload(models.Game.away_team)
    ).filter(models.Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    # Calculate live game time if timer is running
    calculate_live_game_time(game)
    return game


@app.get("/api/games/share/{share_code}", response_model=schemas.GameWithTeams)
def get_game_by_share_code(share_code: str, db: Session = Depends(get_db)):
    game = db.query(models.Game).options(
        joinedload(models.Game.home_team),
        joinedload(models.Game.away_team)
    ).filter(models.Game.share_code == share_code.upper()).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    # Calculate live game time if timer is running
    calculate_live_game_time(game)
    return game


@app.put("/api/games/{game_id}", response_model=schemas.GameWithTeams)
async def update_game(
    game_id: str, 
    game_update: schemas.GameUpdate, 
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    db_game = db.query(models.Game).filter(models.Game.id == game_id).first()
    if not db_game:
        raise HTTPException(status_code=404, detail="Game not found")
    # Check user owns the league this game belongs to
    check_league_ownership(db, db_game.league_id, current_user)
    
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
            "down": game.down,
            "distance": game.distance,
            "ball_on": game.ball_on,
            "possession": game.possession,
            "home_timeouts": game.home_timeouts,
            "away_timeouts": game.away_timeouts,
            "play_clock": game.play_clock,
            "display_state": game.display_state,
            "home_team": {"id": game.home_team.id, "name": game.home_team.name, "abbreviation": game.home_team.abbreviation, "color": game.home_team.color, "color2": game.home_team.color2, "logo_url": game.home_team.logo_url},
            "away_team": {"id": game.away_team.id, "name": game.away_team.name, "abbreviation": game.away_team.abbreviation, "color": game.away_team.color, "color2": game.away_team.color2, "logo_url": game.away_team.logo_url}
        }
    })
    
    return game


@app.delete("/api/games/{game_id}", status_code=204)
async def delete_game(
    game_id: str, 
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    db_game = db.query(models.Game).filter(models.Game.id == game_id).first()
    if not db_game:
        raise HTTPException(status_code=404, detail="Game not found")
    # Check user owns the league this game belongs to
    check_league_ownership(db, db_game.league_id, current_user)
    db.delete(db_game)
    db.commit()
    return None


# ============ Heartbeat Endpoints ============
@app.post("/api/games/{game_id}/heartbeat")
async def game_heartbeat(game_id: str, db: Session = Depends(get_db)):
    """Client sends heartbeat to indicate controller is still active"""
    db_game = db.query(models.Game).filter(models.Game.id == game_id).first()
    if not db_game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game_heartbeats[game_id] = datetime.utcnow()
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.get("/api/games/{game_id}/heartbeat/check")
async def check_heartbeat(game_id: str, db: Session = Depends(get_db)):
    """Check if controller is still active (for display clients)"""
    db_game = db.query(models.Game).options(
        joinedload(models.Game.home_team),
        joinedload(models.Game.away_team)
    ).filter(models.Game.id == game_id).first()
    if not db_game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    last_heartbeat = game_heartbeats.get(game_id)
    
    if last_heartbeat is None:
        # No heartbeat ever received - controller not active
        return {"active": False, "last_heartbeat": None}
    
    elapsed = (datetime.utcnow() - last_heartbeat).total_seconds()
    is_active = elapsed < HEARTBEAT_TIMEOUT_SECONDS
    
    # If controller went inactive and game is live, trigger tech difficulties
    if not is_active and db_game.status == "live":
        # Update display_state to show technical difficulties
        try:
            current_state = json.loads(db_game.display_state) if db_game.display_state else {}
        except:
            current_state = {}
        current_state["gameStatus"] = "technical"
        db_game.display_state = json.dumps(current_state)
        db.commit()
        
        # Broadcast the tech difficulties status
        await manager.broadcast(f"game:{db_game.share_code}", {
            "type": "game_update",
            "data": {
                "id": db_game.id,
                "home_score": db_game.home_score,
                "away_score": db_game.away_score,
                "status": db_game.status,
                "quarter": db_game.quarter,
                "game_time": db_game.game_time,
                "down": db_game.down,
                "distance": db_game.distance,
                "ball_on": db_game.ball_on,
                "possession": db_game.possession,
                "home_timeouts": db_game.home_timeouts,
                "away_timeouts": db_game.away_timeouts,
                "play_clock": db_game.play_clock,
                "display_state": db_game.display_state,
                "home_team": {"id": db_game.home_team.id, "name": db_game.home_team.name, "abbreviation": db_game.home_team.abbreviation, "color": db_game.home_team.color, "color2": db_game.home_team.color2, "logo_url": db_game.home_team.logo_url},
                "away_team": {"id": db_game.away_team.id, "name": db_game.away_team.name, "abbreviation": db_game.away_team.abbreviation, "color": db_game.away_team.color, "color2": db_game.away_team.color2, "logo_url": db_game.away_team.logo_url}
            }
        })
    
    return {
        "active": is_active, 
        "last_heartbeat": last_heartbeat.isoformat() if last_heartbeat else None,
        "elapsed_seconds": elapsed
    }


@app.delete("/api/games/{game_id}/heartbeat")
async def stop_heartbeat(game_id: str):
    """Stop heartbeat tracking when controller disconnects gracefully"""
    if game_id in game_heartbeats:
        del game_heartbeats[game_id]
    return {"status": "ok"}


# ============ Bracket Endpoints ============
@app.post("/api/brackets", response_model=schemas.Bracket)
async def create_bracket(
    bracket: schemas.BracketCreate, 
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    # Check user owns the league this bracket belongs to
    check_league_ownership(db, bracket.league_id, current_user)
    # Validate number of teams is even and at least 2
    num_teams = bracket.num_teams
    if num_teams < 2 or num_teams % 2 != 0:
        raise HTTPException(status_code=400, detail="Number of teams must be an even number (2 or more)")
    
    # Calculate bracket size (next power of 2 >= num_teams)
    bracket_size = 1
    while bracket_size < num_teams:
        bracket_size *= 2
    
    # Number of byes needed
    num_byes = bracket_size - num_teams
    
    db_bracket = models.Bracket(
        league_id=bracket.league_id,
        name=bracket.name,
        bracket_type=bracket.bracket_type,
        layout=bracket.layout,
        num_teams=num_teams,
        round_names=json.dumps(bracket.round_names) if bracket.round_names else None,
        is_playoff=bracket.is_playoff
    )
    db.add(db_bracket)
    db.commit()
    db.refresh(db_bracket)
    
    # Create bracket matches based on bracket_size (power of 2)
    num_rounds = int(math.log2(bracket_size))
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
    
    # Seed teams into first round with byes
    # team_ids format: list of team IDs or None for byes
    # If team_ids not provided or empty, leave slots empty for manual assignment
    first_round_matches = matches_by_round[num_rounds]
    team_ids = bracket.team_ids if bracket.team_ids else []
    
    # Create seeding with byes distributed
    # Byes go to top seeds (first positions)
    seeded_slots = []
    for i in range(bracket_size):
        if i < len(team_ids):
            seeded_slots.append(team_ids[i])
        else:
            seeded_slots.append(None)  # Empty slot or bye
    
    # Assign teams to first round matches
    for i, match in enumerate(first_round_matches):
        slot1 = seeded_slots[i * 2] if i * 2 < len(seeded_slots) else None
        slot2 = seeded_slots[i * 2 + 1] if i * 2 + 1 < len(seeded_slots) else None
        
        # Handle "BYE" and "TBD" strings as None
        if slot1 in ("BYE", "TBD", ""):
            slot1 = None
        if slot2 in ("BYE", "TBD", ""):
            slot2 = None
            
        match.team1_id = slot1
        match.team2_id = slot2
        
        # If one team has a bye (opponent is None), auto-advance them
        if slot1 and not slot2:
            match.winner_id = slot1
            match.team1_score = 0
            match.team2_score = 0
            # Advance to next match
            if match.next_match_id:
                next_match = db.query(models.BracketMatch).filter(
                    models.BracketMatch.id == match.next_match_id
                ).first()
                if next_match:
                    # Determine if this is team1 or team2 in next match
                    current_match_index = first_round_matches.index(match)
                    if current_match_index % 2 == 0:
                        next_match.team1_id = slot1
                    else:
                        next_match.team2_id = slot1
        elif slot2 and not slot1:
            match.winner_id = slot2
            match.team1_score = 0
            match.team2_score = 0
            # Advance to next match
            if match.next_match_id:
                next_match = db.query(models.BracketMatch).filter(
                    models.BracketMatch.id == match.next_match_id
                ).first()
                if next_match:
                    current_match_index = first_round_matches.index(match)
                    if current_match_index % 2 == 0:
                        next_match.team1_id = slot2
                    else:
                        next_match.team2_id = slot2
    
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
async def update_bracket_match(
    match_id: str, 
    match_update: schemas.BracketMatchUpdate, 
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    db_match = db.query(models.BracketMatch).filter(models.BracketMatch.id == match_id).first()
    if not db_match:
        raise HTTPException(status_code=404, detail="Match not found")
    # Get bracket to check league ownership
    bracket = db.query(models.Bracket).filter(models.Bracket.id == db_match.bracket_id).first()
    if bracket:
        check_league_ownership(db, bracket.league_id, current_user)
    
    for key, value in match_update.model_dump(exclude_unset=True).items():
        # Convert empty strings to None for ID fields
        if key in ('team1_id', 'team2_id', 'winner_id', 'game_id') and value == '':
            value = None
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


@app.get("/api/games/{game_id}/bracket-match")
def get_bracket_match_by_game(game_id: str, db: Session = Depends(get_db)):
    """Find bracket match linked to this game"""
    match = db.query(models.BracketMatch).options(
        joinedload(models.BracketMatch.team1),
        joinedload(models.BracketMatch.team2),
        joinedload(models.BracketMatch.winner),
        joinedload(models.BracketMatch.bracket)
    ).filter(models.BracketMatch.game_id == game_id).first()
    
    if not match:
        return None
    
    return {
        "id": match.id,
        "bracket_id": match.bracket_id,
        "bracket_name": match.bracket.name if match.bracket else None,
        "round_number": match.round_number,
        "team1": {"id": match.team1.id, "name": match.team1.name} if match.team1 else None,
        "team2": {"id": match.team2.id, "name": match.team2.name} if match.team2 else None,
        "team1_score": match.team1_score,
        "team2_score": match.team2_score,
        "status": match.status,
    }


@app.put("/api/brackets/{bracket_id}", response_model=schemas.Bracket)
async def update_bracket(
    bracket_id: str, 
    bracket_update: schemas.BracketUpdate, 
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    db_bracket = db.query(models.Bracket).filter(models.Bracket.id == bracket_id).first()
    if not db_bracket:
        raise HTTPException(status_code=404, detail="Bracket not found")
    # Check user owns the league this bracket belongs to
    check_league_ownership(db, db_bracket.league_id, current_user)
    
    for key, value in bracket_update.model_dump(exclude_unset=True).items():
        # Convert round_names dict to JSON string
        if key == 'round_names' and value is not None:
            value = json.dumps(value)
        # Convert playoff_picture list/dict to JSON string
        if key == 'playoff_picture' and value is not None:
            if isinstance(value, (list, dict)):
                value = json.dumps(value)
        setattr(db_bracket, key, value)
    
    db.commit()
    
    return db.query(models.Bracket).options(
        joinedload(models.Bracket.matches).joinedload(models.BracketMatch.team1),
        joinedload(models.Bracket.matches).joinedload(models.BracketMatch.team2),
        joinedload(models.Bracket.matches).joinedload(models.BracketMatch.winner)
    ).filter(models.Bracket.id == bracket_id).first()


@app.delete("/api/brackets/{bracket_id}", status_code=204)
async def delete_bracket(
    bracket_id: str, 
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    db_bracket = db.query(models.Bracket).filter(models.Bracket.id == bracket_id).first()
    if not db_bracket:
        raise HTTPException(status_code=404, detail="Bracket not found")
    # Check user owns the league this bracket belongs to
    check_league_ownership(db, db_bracket.league_id, current_user)
    # Delete bracket matches first
    db.query(models.BracketMatch).filter(models.BracketMatch.bracket_id == bracket_id).delete()
    db.delete(db_bracket)
    db.commit()
    return None


@app.post("/api/brackets/{bracket_id}/finals-logo")
async def upload_bracket_finals_logo(
    bracket_id: str, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    db_bracket = db.query(models.Bracket).filter(models.Bracket.id == bracket_id).first()
    if not db_bracket:
        raise HTTPException(status_code=404, detail="Bracket not found")
    # Check user owns the league this bracket belongs to
    check_league_ownership(db, db_bracket.league_id, current_user)
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG")
    
    # Generate unique filename
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"finals_{bracket_id}_{uuid.uuid4().hex[:8]}.{file_ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    # Delete old logo if exists
    if db_bracket.finals_logo_url:
        old_filename = db_bracket.finals_logo_url.split("/")[-1]
        old_filepath = os.path.join(UPLOAD_DIR, old_filename)
        if os.path.exists(old_filepath):
            os.remove(old_filepath)
    
    # Save new file
    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Update bracket with logo URL
    logo_url = f"/uploads/{filename}"
    db_bracket.finals_logo_url = logo_url
    db.commit()
    db.refresh(db_bracket)
    
    print(f"Saved finals_logo_url: {db_bracket.finals_logo_url}")
    
    return {"finals_logo_url": logo_url}


@app.delete("/api/brackets/{bracket_id}/finals-logo", status_code=204)
async def delete_bracket_finals_logo(
    bracket_id: str, 
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    db_bracket = db.query(models.Bracket).filter(models.Bracket.id == bracket_id).first()
    if not db_bracket:
        raise HTTPException(status_code=404, detail="Bracket not found")
    # Check user owns the league this bracket belongs to
    check_league_ownership(db, db_bracket.league_id, current_user)
    
    if db_bracket.finals_logo_url:
        filename = db_bracket.finals_logo_url.split("/")[-1]
        filepath = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
        db_bracket.finals_logo_url = None
        db.commit()
    
    return None


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


@app.delete("/api/scoreboards/players/{player_id}", status_code=204)
async def delete_scoreboard_player(player_id: str, db: Session = Depends(get_db)):
    db_player = db.query(models.ScoreboardPlayer).filter(models.ScoreboardPlayer.id == player_id).first()
    if not db_player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    scoreboard = db.query(models.Scoreboard).filter(models.Scoreboard.id == db_player.scoreboard_id).first()
    
    db.delete(db_player)
    db.commit()
    
    # Broadcast update
    if scoreboard:
        await manager.broadcast(f"scoreboard:{scoreboard.share_code}", {
            "type": "player_removed",
            "data": {"id": player_id}
        })
    
    return None


@app.delete("/api/scoreboards/{scoreboard_id}", status_code=204)
def delete_scoreboard(scoreboard_id: str, db: Session = Depends(get_db)):
    db_scoreboard = db.query(models.Scoreboard).filter(models.Scoreboard.id == scoreboard_id).first()
    if not db_scoreboard:
        raise HTTPException(status_code=404, detail="Scoreboard not found")
    # Delete players first
    db.query(models.ScoreboardPlayer).filter(models.ScoreboardPlayer.scoreboard_id == scoreboard_id).delete()
    db.delete(db_scoreboard)
    db.commit()
    return None


@app.post("/api/scoreboards/{scoreboard_id}/logo")
async def upload_scoreboard_logo(
    scoreboard_id: str, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    db_scoreboard = db.query(models.Scoreboard).filter(models.Scoreboard.id == scoreboard_id).first()
    if not db_scoreboard:
        raise HTTPException(status_code=404, detail="Scoreboard not found")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG")
    
    # Generate unique filename
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"scoreboard_{scoreboard_id}_{uuid.uuid4().hex[:8]}.{file_ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    # Delete old logo if exists
    if db_scoreboard.logo_url:
        old_filename = db_scoreboard.logo_url.split("/")[-1]
        old_filepath = os.path.join(UPLOAD_DIR, old_filename)
        if os.path.exists(old_filepath):
            os.remove(old_filepath)
    
    # Save new file
    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Update scoreboard with logo URL
    logo_url = f"/uploads/{filename}"
    db_scoreboard.logo_url = logo_url
    db.commit()
    
    return {"logo_url": logo_url}


@app.delete("/api/scoreboards/{scoreboard_id}/logo", status_code=204)
async def delete_scoreboard_logo(
    scoreboard_id: str, 
    db: Session = Depends(get_db)
):
    db_scoreboard = db.query(models.Scoreboard).filter(models.Scoreboard.id == scoreboard_id).first()
    if not db_scoreboard:
        raise HTTPException(status_code=404, detail="Scoreboard not found")
    
    if db_scoreboard.logo_url:
        filename = db_scoreboard.logo_url.split("/")[-1]
        filepath = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
        db_scoreboard.logo_url = None
        db.commit()
    
    return None


# ============ Standalone Games ============
def standalone_game_to_response(game: models.StandaloneGame) -> dict:
    """Convert a StandaloneGame model to response format with embedded teams"""
    return {
        "id": game.id,
        "owner_id": game.owner_id,
        "home_team": {
            "id": "home",
            "name": game.home_name,
            "location": game.home_location,
            "abbreviation": game.home_abbreviation,
            "initials": game.home_initials,
            "color": game.home_color,
            "color2": game.home_color2,
            "color3": game.home_color3,
            "logo_url": game.home_logo_url,
        },
        "away_team": {
            "id": "away",
            "name": game.away_name,
            "location": game.away_location,
            "abbreviation": game.away_abbreviation,
            "initials": game.away_initials,
            "color": game.away_color,
            "color2": game.away_color2,
            "color3": game.away_color3,
            "logo_url": game.away_logo_url,
        },
        "home_score": game.home_score,
        "away_score": game.away_score,
        "status": game.status,
        "quarter": game.quarter,
        "game_time": game.game_time,
        "scheduled_at": game.scheduled_at,
        "share_code": game.share_code,
        "down": game.down,
        "distance": game.distance,
        "ball_on": game.ball_on,
        "possession": game.possession,
        "home_timeouts": game.home_timeouts,
        "away_timeouts": game.away_timeouts,
        "play_clock": game.play_clock,
        "display_state": game.display_state,
        "simple_mode": game.simple_mode,
        "timer_enabled": game.timer_enabled,
        "timer_seconds": game.timer_seconds,
        "timer_running": game.timer_running,
        "created_at": game.created_at,
        "updated_at": game.updated_at,
    }


@app.post("/api/standalone-games", response_model=schemas.StandaloneGame)
async def create_standalone_game(
    game: schemas.StandaloneGameCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    db_game = models.StandaloneGame(
        owner_id=current_user.id if current_user else None,
        home_name=game.home_name,
        home_abbreviation=game.home_abbreviation,
        home_color=game.home_color,
        home_color2=game.home_color2,
        home_color3=game.home_color3,
        home_logo_url=game.home_logo_url,
        away_name=game.away_name,
        away_abbreviation=game.away_abbreviation,
        away_color=game.away_color,
        away_color2=game.away_color2,
        away_color3=game.away_color3,
        away_logo_url=game.away_logo_url,
        scheduled_at=game.scheduled_at,
        simple_mode=game.simple_mode,
        timer_enabled=game.timer_enabled,
    )
    db.add(db_game)
    db.commit()
    db.refresh(db_game)
    return standalone_game_to_response(db_game)


@app.get("/api/standalone-games", response_model=List[schemas.StandaloneGame])
async def get_standalone_games(
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    if current_user:
        games = db.query(models.StandaloneGame).filter(
            models.StandaloneGame.owner_id == current_user.id
        ).order_by(models.StandaloneGame.created_at.desc()).all()
    else:
        games = []
    return [standalone_game_to_response(g) for g in games]


@app.get("/api/standalone-games/share/{share_code}", response_model=schemas.StandaloneGame)
def get_standalone_game_by_share_code(share_code: str, db: Session = Depends(get_db)):
    db_game = db.query(models.StandaloneGame).filter(
        models.StandaloneGame.share_code == share_code.upper()
    ).first()
    if not db_game:
        raise HTTPException(status_code=404, detail="Game not found")
    return standalone_game_to_response(db_game)


@app.get("/api/standalone-games/{game_id}", response_model=schemas.StandaloneGame)
def get_standalone_game(game_id: str, db: Session = Depends(get_db)):
    db_game = db.query(models.StandaloneGame).filter(models.StandaloneGame.id == game_id).first()
    if not db_game:
        raise HTTPException(status_code=404, detail="Game not found")
    return standalone_game_to_response(db_game)


@app.put("/api/standalone-games/{game_id}", response_model=schemas.StandaloneGame)
async def update_standalone_game(
    game_id: str,
    game: schemas.StandaloneGameUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    db_game = db.query(models.StandaloneGame).filter(models.StandaloneGame.id == game_id).first()
    if not db_game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Check ownership if game has an owner
    if db_game.owner_id and current_user and db_game.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this game")
    
    for key, value in game.model_dump(exclude_unset=True).items():
        setattr(db_game, key, value)
    
    db_game.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_game)
    
    # Broadcast update via WebSocket
    response_data = standalone_game_to_response(db_game)
    await manager.broadcast(f"game:{db_game.share_code}", {
        "type": "game_update",
        "data": response_data
    })
    
    return response_data


@app.post("/api/standalone-games/{game_id}/heartbeat")
async def standalone_game_heartbeat(game_id: str, db: Session = Depends(get_db)):
    db_game = db.query(models.StandaloneGame).filter(models.StandaloneGame.id == game_id).first()
    if not db_game:
        raise HTTPException(status_code=404, detail="Game not found")
    db_game.last_heartbeat = datetime.utcnow()
    db.commit()
    return {"status": "ok"}


@app.get("/api/standalone-games/{game_id}/heartbeat")
async def check_standalone_game_heartbeat(game_id: str, db: Session = Depends(get_db)):
    db_game = db.query(models.StandaloneGame).filter(models.StandaloneGame.id == game_id).first()
    if not db_game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if db_game.last_heartbeat:
        time_since = datetime.utcnow() - db_game.last_heartbeat
        if time_since.total_seconds() > 10 and db_game.status == 'live':
            # Controller crashed - set tech difficulties
            display_state = json.loads(db_game.display_state) if db_game.display_state else {}
            display_state['gameStatus'] = 'tech-difficulties'
            db_game.display_state = json.dumps(display_state)
            db.commit()
            
            response_data = standalone_game_to_response(db_game)
            await manager.broadcast(f"game:{db_game.share_code}", {
                "type": "game_update",
                "data": response_data
            })
    
    return {"status": "ok", "last_heartbeat": db_game.last_heartbeat}


@app.post("/api/standalone-games/{game_id}/logo/{team}")
async def upload_standalone_game_logo(
    game_id: str,
    team: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    """Upload logo for home or away team in a standalone game"""
    if team not in ['home', 'away']:
        raise HTTPException(status_code=400, detail="Team must be 'home' or 'away'")
    
    db_game = db.query(models.StandaloneGame).filter(models.StandaloneGame.id == game_id).first()
    if not db_game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Check ownership if game has an owner
    if db_game.owner_id and current_user and db_game.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this game")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG")
    
    # Generate unique filename
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"standalone_{game_id}_{team}_{uuid.uuid4().hex[:8]}.{file_ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    # Delete old logo if exists
    old_logo_url = db_game.home_logo_url if team == 'home' else db_game.away_logo_url
    if old_logo_url:
        old_filename = old_logo_url.split("/")[-1]
        old_filepath = os.path.join(UPLOAD_DIR, old_filename)
        if os.path.exists(old_filepath):
            os.remove(old_filepath)
    
    # Save new file
    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Update game with logo URL
    logo_url = f"/uploads/{filename}"
    if team == 'home':
        db_game.home_logo_url = logo_url
    else:
        db_game.away_logo_url = logo_url
    
    db_game.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_game)
    
    # Broadcast update via WebSocket
    response_data = standalone_game_to_response(db_game)
    await manager.broadcast(f"game:{db_game.share_code}", {
        "type": "game_update",
        "data": response_data
    })
    
    return {"logo_url": logo_url}


@app.delete("/api/standalone-games/{game_id}", status_code=204)
async def delete_standalone_game(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    db_game = db.query(models.StandaloneGame).filter(models.StandaloneGame.id == game_id).first()
    if not db_game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Check ownership if game has an owner
    if db_game.owner_id and current_user and db_game.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this game")
    
    db.delete(db_game)
    db.commit()
    return None


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
