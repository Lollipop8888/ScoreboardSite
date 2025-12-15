import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from database import Base


def generate_uuid():
    return str(uuid.uuid4())


def generate_share_code():
    return str(uuid.uuid4())[:8].upper()


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    leagues = relationship("League", back_populates="owner", cascade="all, delete-orphan")


class League(Base):
    __tablename__ = "leagues"

    id = Column(String, primary_key=True, default=generate_uuid)
    owner_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(100), nullable=False)
    sport = Column(String(50), nullable=False)
    season = Column(String(50), nullable=False)
    has_groups = Column(Boolean, default=False)  # Whether league uses group structure
    group_label_1 = Column(String(50), default="Conference")  # Primary group label (e.g., "Conference", "Section")
    group_label_2 = Column(String(50), default="Division")  # Secondary group label (e.g., "Division", "Section")
    groups = Column(Text)  # JSON: {"conferences": [{"name": "AFC", "divisions": ["North", "South"]}]}
    is_finished = Column(Boolean, default=False)  # Whether league is finished (locks editing)
    share_code = Column(String(8), unique=True, default=generate_share_code, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="leagues")
    teams = relationship("Team", back_populates="league", cascade="all, delete-orphan")
    games = relationship("Game", back_populates="league", cascade="all, delete-orphan")
    brackets = relationship("Bracket", back_populates="league", cascade="all, delete-orphan")


class Team(Base):
    __tablename__ = "teams"

    id = Column(String, primary_key=True, default=generate_uuid)
    league_id = Column(String, ForeignKey("leagues.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)  # Display name on scoreboard (e.g., "Eagles")
    location = Column(String(100))  # Location/city (e.g., "Philadelphia")
    abbreviation = Column(String(10))  # Short abbreviation (e.g., "PHI")
    initials = Column(String(5))  # Initials for compact display (e.g., "PE")
    group_1 = Column(String(50))  # Primary group (e.g., "AFC", "Section 1")
    group_2 = Column(String(50))  # Secondary group (e.g., "North", "Division A")
    color = Column(String(7), default="#3B82F6")  # Primary hex color
    color2 = Column(String(7))  # Secondary hex color (optional)
    color3 = Column(String(7))  # Tertiary hex color (optional)
    logo_url = Column(String(500))
    wins = Column(Integer, default=0)
    losses = Column(Integer, default=0)
    ties = Column(Integer, default=0)
    points_for = Column(Integer, default=0)
    points_against = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    league = relationship("League", back_populates="teams")


class Game(Base):
    __tablename__ = "games"

    id = Column(String, primary_key=True, default=generate_uuid)
    league_id = Column(String, ForeignKey("leagues.id", ondelete="CASCADE"), nullable=False)
    home_team_id = Column(String, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    away_team_id = Column(String, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    home_score = Column(Integer, default=0)
    away_score = Column(Integer, default=0)
    status = Column(String(20), default="scheduled")  # scheduled, live, final
    quarter = Column(String(20))  # Q1, Q2, Halftime, Q3, Q4, OT, Final
    game_time = Column(String(10))  # Time remaining in quarter
    scheduled_at = Column(DateTime)
    started_at = Column(DateTime)
    ended_at = Column(DateTime)
    share_code = Column(String(8), default=generate_share_code, unique=True)
    # Game state fields for live display
    down = Column(Integer, default=1)
    distance = Column(Integer, default=10)
    ball_on = Column(Integer, default=25)
    possession = Column(String(10))  # 'home', 'away', or null
    home_timeouts = Column(Integer, default=3)
    away_timeouts = Column(Integer, default=3)
    play_clock = Column(Integer, default=40)
    # Timer state for persistent clock tracking
    timer_running = Column(Boolean, default=False)  # Whether game clock is running
    timer_started_at = Column(DateTime)  # When timer was started (for calculating elapsed time)
    timer_started_seconds = Column(Integer)  # Game time in seconds when timer was started
    # Display state for overlays/animations
    display_state = Column(Text)  # JSON string for ephemeral display state (flags, big plays, etc.)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    league = relationship("League", back_populates="games")
    home_team = relationship("Team", foreign_keys=[home_team_id])
    away_team = relationship("Team", foreign_keys=[away_team_id])


class Bracket(Base):
    __tablename__ = "brackets"

    id = Column(String, primary_key=True, default=generate_uuid)
    league_id = Column(String, ForeignKey("leagues.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    bracket_type = Column(String(20), default="single_elimination")  # single_elimination, double_elimination
    layout = Column(String(20), default="one_sided")  # one_sided, two_sided
    num_teams = Column(Integer, nullable=False)
    round_names = Column(Text)  # JSON string of custom round names, e.g. {"1": "Wild Card", "2": "Divisional"}
    top_bracket_name = Column(String(100), default="Top Bracket")
    bottom_bracket_name = Column(String(100), default="Bottom Bracket")
    is_playoff = Column(Boolean, default=False)  # If true, shows playoff picture tab
    playoff_picture = Column(Text)  # JSON string of playoff picture data (seeds, records, etc.)
    finals_logo_url = Column(String(500))  # Optional logo for the finals/championship round
    share_code = Column(String(8), default=generate_share_code, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    league = relationship("League", back_populates="brackets")
    matches = relationship("BracketMatch", back_populates="bracket", cascade="all, delete-orphan")


class BracketMatch(Base):
    __tablename__ = "bracket_matches"

    id = Column(String, primary_key=True, default=generate_uuid)
    bracket_id = Column(String, ForeignKey("brackets.id", ondelete="CASCADE"), nullable=False)
    round_number = Column(Integer, nullable=False)
    match_number = Column(Integer, nullable=False)
    team1_id = Column(String, ForeignKey("teams.id", ondelete="SET NULL"))
    team2_id = Column(String, ForeignKey("teams.id", ondelete="SET NULL"))
    team1_score = Column(Integer, default=0)
    team2_score = Column(Integer, default=0)
    winner_id = Column(String, ForeignKey("teams.id", ondelete="SET NULL"))
    status = Column(String(20), default="pending")  # pending, live, completed
    next_match_id = Column(String, ForeignKey("bracket_matches.id", ondelete="SET NULL"))
    game_id = Column(String, ForeignKey("games.id", ondelete="SET NULL"))  # Link to league game
    is_bye = Column(Boolean, default=False)  # True if this match has a BYE slot
    bye_slot = Column(Integer)  # 1 or 2 to indicate which team slot is the BYE
    created_at = Column(DateTime, default=datetime.utcnow)

    bracket = relationship("Bracket", back_populates="matches")
    team1 = relationship("Team", foreign_keys=[team1_id])
    team2 = relationship("Team", foreign_keys=[team2_id])
    winner = relationship("Team", foreign_keys=[winner_id])
    game = relationship("Game", foreign_keys=[game_id])


class StandaloneGame(Base):
    """Standalone football game not tied to a league - stores team info directly"""
    __tablename__ = "standalone_games"

    id = Column(String, primary_key=True, default=generate_uuid)
    owner_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Home team info (embedded, not referencing teams table)
    home_name = Column(String(100), default="Home")  # Display name (e.g., "Eagles")
    home_location = Column(String(100))  # Location/city (e.g., "Philadelphia")
    home_abbreviation = Column(String(10), default="HME")  # Short abbreviation (e.g., "PHI")
    home_initials = Column(String(5))  # Initials for compact display (e.g., "PE")
    home_color = Column(String(7), default="#3B82F6")
    home_color2 = Column(String(7))
    home_color3 = Column(String(7))
    home_logo_url = Column(String(500))
    
    # Away team info (embedded)
    away_name = Column(String(100), default="Away")  # Display name (e.g., "Cowboys")
    away_location = Column(String(100))  # Location/city (e.g., "Dallas")
    away_abbreviation = Column(String(10), default="AWY")  # Short abbreviation (e.g., "DAL")
    away_initials = Column(String(5))  # Initials for compact display (e.g., "DC")
    away_color = Column(String(7), default="#EF4444")
    away_color2 = Column(String(7))
    away_color3 = Column(String(7))
    away_logo_url = Column(String(500))
    
    # Game state (same as regular Game)
    home_score = Column(Integer, default=0)
    away_score = Column(Integer, default=0)
    status = Column(String(20), default="scheduled")  # scheduled, live, final
    quarter = Column(String(20))  # Q1, Q2, Halftime, Q3, Q4, OT, Final
    game_time = Column(String(10))  # Time remaining in quarter
    scheduled_at = Column(DateTime)
    started_at = Column(DateTime)
    ended_at = Column(DateTime)
    share_code = Column(String(8), default=generate_share_code, unique=True)
    down = Column(Integer, default=1)
    distance = Column(Integer, default=10)
    ball_on = Column(Integer, default=25)
    possession = Column(String(10))  # 'home', 'away', or null
    home_timeouts = Column(Integer, default=3)
    away_timeouts = Column(Integer, default=3)
    play_clock = Column(Integer, default=40)
    display_state = Column(Text)  # JSON string for ephemeral display state
    last_heartbeat = Column(DateTime)
    simple_mode = Column(Boolean, default=False)  # Simplified mode: just teams, scores, and timer
    timer_enabled = Column(Boolean, default=True)  # Whether to show timer in simple mode
    timer_seconds = Column(Integer, default=0)  # Timer value in seconds
    timer_running = Column(Boolean, default=False)  # Whether timer is currently running
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", backref="standalone_games")


class Scoreboard(Base):
    __tablename__ = "scoreboards"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    logo_url = Column(String(500))  # Optional logo for display
    share_code = Column(String(8), default=generate_share_code, unique=True)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    players = relationship("ScoreboardPlayer", back_populates="scoreboard", cascade="all, delete-orphan")


class ScoreboardPlayer(Base):
    __tablename__ = "scoreboard_players"

    id = Column(String, primary_key=True, default=generate_uuid)
    scoreboard_id = Column(String, ForeignKey("scoreboards.id"), nullable=False)
    name = Column(String(100), nullable=False)
    score = Column(Integer, default=0)
    color = Column(String(7), default="#3B82F6")
    created_at = Column(DateTime, default=datetime.utcnow)

    scoreboard = relationship("Scoreboard", back_populates="players")
