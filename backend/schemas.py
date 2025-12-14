from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr


# User Schemas
class UserBase(BaseModel):
    email: str
    username: str


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class User(UserBase):
    id: str
    is_active: bool
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[str] = None


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


# League Schemas
class LeagueBase(BaseModel):
    name: str
    sport: str
    season: str
    has_groups: bool = False
    group_label_1: Optional[str] = "Conference"  # Primary group label
    group_label_2: Optional[str] = "Division"  # Secondary group label
    groups: Optional[dict] = None  # {"groups": [{"name": "AFC", "subgroups": ["North", "South"]}]}


class LeagueCreate(LeagueBase):
    pass


class LeagueUpdate(BaseModel):
    name: Optional[str] = None
    sport: Optional[str] = None
    season: Optional[str] = None
    has_groups: Optional[bool] = None
    group_label_1: Optional[str] = None
    group_label_2: Optional[str] = None
    groups: Optional[dict] = None
    is_finished: Optional[bool] = None


class League(LeagueBase):
    id: str
    owner_id: Optional[str] = None
    share_code: str
    groups: Optional[str] = None  # Stored as JSON string in DB
    is_finished: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Team Schemas
class TeamBase(BaseModel):
    name: str  # Display name on scoreboard (e.g., "Eagles")
    location: Optional[str] = None  # Location/city (e.g., "Philadelphia")
    abbreviation: Optional[str] = None  # Short abbreviation (e.g., "PHI")
    initials: Optional[str] = None  # Initials for compact display (e.g., "PE")
    group_1: Optional[str] = None  # Primary group (e.g., "AFC", "Section 1")
    group_2: Optional[str] = None  # Secondary group (e.g., "North", "Division A")
    color: Optional[str] = "#3B82F6"
    color2: Optional[str] = None
    color3: Optional[str] = None
    logo_url: Optional[str] = None


class TeamCreate(TeamBase):
    league_id: str


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    abbreviation: Optional[str] = None
    initials: Optional[str] = None
    group_1: Optional[str] = None
    group_2: Optional[str] = None
    color: Optional[str] = None
    color2: Optional[str] = None
    color3: Optional[str] = None
    logo_url: Optional[str] = None
    wins: Optional[int] = None
    losses: Optional[int] = None
    ties: Optional[int] = None
    points_for: Optional[int] = None
    points_against: Optional[int] = None


class Team(TeamBase):
    id: str
    league_id: str
    wins: int
    losses: int
    ties: int
    points_for: int
    points_against: int
    created_at: datetime

    class Config:
        from_attributes = True


class LeagueWithTeams(League):
    teams: List[Team] = []


# Game Schemas
class GameBase(BaseModel):
    home_team_id: str
    away_team_id: str
    scheduled_at: Optional[datetime] = None


class GameCreate(GameBase):
    league_id: str


class GameUpdate(BaseModel):
    home_team_id: Optional[str] = None
    away_team_id: Optional[str] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    status: Optional[str] = None
    quarter: Optional[str] = None
    game_time: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    down: Optional[int] = None
    distance: Optional[int] = None
    ball_on: Optional[int] = None
    possession: Optional[str] = None
    home_timeouts: Optional[int] = None
    away_timeouts: Optional[int] = None
    play_clock: Optional[int] = None
    display_state: Optional[str] = None


class GameWithTeams(BaseModel):
    id: str
    league_id: str
    home_team: Team
    away_team: Team
    home_score: int
    away_score: int
    status: str
    quarter: Optional[str]
    game_time: Optional[str]
    scheduled_at: Optional[datetime]
    share_code: str
    down: Optional[int] = 1
    distance: Optional[int] = 10
    ball_on: Optional[int] = 25
    possession: Optional[str] = None
    home_timeouts: Optional[int] = 3
    away_timeouts: Optional[int] = 3
    play_clock: Optional[int] = 40
    display_state: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Bracket Schemas
class BracketBase(BaseModel):
    name: str
    bracket_type: str = "single_elimination"
    layout: str = "one_sided"  # one_sided or two_sided
    num_teams: int
    round_names: Optional[dict] = None  # Custom round names {"1": "Wild Card", "2": "Divisional"}
    is_playoff: bool = False  # If true, shows playoff picture tab


class BracketCreate(BracketBase):
    league_id: str
    team_ids: List[str] = []


class BracketUpdate(BaseModel):
    name: Optional[str] = None
    layout: Optional[str] = None
    round_names: Optional[dict] = None
    top_bracket_name: Optional[str] = None
    bottom_bracket_name: Optional[str] = None
    is_playoff: Optional[bool] = None
    playoff_picture: Optional[list] = None  # Playoff picture data (array of team entries)
    finals_logo_url: Optional[str] = None  # Optional logo for finals round


class BracketMatchUpdate(BaseModel):
    team1_id: Optional[str] = None
    team2_id: Optional[str] = None
    team1_score: Optional[int] = None
    team2_score: Optional[int] = None
    status: Optional[str] = None
    winner_id: Optional[str] = None
    game_id: Optional[str] = None
    is_bye: Optional[bool] = None
    bye_slot: Optional[int] = None  # 1 or 2 to indicate which slot is BYE


class BracketMatch(BaseModel):
    id: str
    bracket_id: str
    round_number: int
    match_number: int
    team1: Optional[Team]
    team2: Optional[Team]
    team1_score: int
    team2_score: int
    winner: Optional[Team]
    status: str
    next_match_id: Optional[str]
    game_id: Optional[str] = None
    is_bye: bool = False
    bye_slot: Optional[int] = None  # 1 or 2 to indicate which slot is BYE

    class Config:
        from_attributes = True


class Bracket(BaseModel):
    id: str
    league_id: str
    name: str
    bracket_type: str
    layout: Optional[str] = "one_sided"
    num_teams: int
    round_names: Optional[str] = None  # Stored as JSON string in DB
    top_bracket_name: Optional[str] = "Top Bracket"
    bottom_bracket_name: Optional[str] = "Bottom Bracket"
    is_playoff: bool = False
    playoff_picture: Optional[str] = None  # Stored as JSON string in DB
    finals_logo_url: Optional[str] = None  # Optional logo for finals round
    share_code: str
    matches: List[BracketMatch] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Scoreboard Schemas
class ScoreboardPlayerBase(BaseModel):
    name: str
    score: int = 0
    color: str = "#3B82F6"


class ScoreboardPlayerCreate(ScoreboardPlayerBase):
    pass


class ScoreboardPlayerUpdate(BaseModel):
    name: Optional[str] = None
    score: Optional[int] = None
    color: Optional[str] = None


class ScoreboardPlayer(ScoreboardPlayerBase):
    id: str
    scoreboard_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class ScoreboardBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = True


class ScoreboardCreate(ScoreboardBase):
    players: List[ScoreboardPlayerCreate] = []


class ScoreboardUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    logo_url: Optional[str] = None


class Scoreboard(ScoreboardBase):
    id: str
    share_code: str
    logo_url: Optional[str] = None
    players: List[ScoreboardPlayer] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Standalone Game Schemas (games not tied to a league)
class StandaloneGameCreate(BaseModel):
    home_name: str = "Home"
    home_location: Optional[str] = None
    home_abbreviation: str = "HME"
    home_initials: Optional[str] = None
    home_color: str = "#3B82F6"
    home_color2: Optional[str] = None
    home_color3: Optional[str] = None
    home_logo_url: Optional[str] = None
    away_name: str = "Away"
    away_location: Optional[str] = None
    away_abbreviation: str = "AWY"
    away_initials: Optional[str] = None
    away_color: str = "#EF4444"
    away_color2: Optional[str] = None
    away_color3: Optional[str] = None
    away_logo_url: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    simple_mode: bool = False
    timer_enabled: bool = True


class StandaloneGameUpdate(BaseModel):
    home_name: Optional[str] = None
    home_location: Optional[str] = None
    home_abbreviation: Optional[str] = None
    home_initials: Optional[str] = None
    home_color: Optional[str] = None
    home_color2: Optional[str] = None
    home_color3: Optional[str] = None
    home_logo_url: Optional[str] = None
    away_name: Optional[str] = None
    away_location: Optional[str] = None
    away_abbreviation: Optional[str] = None
    away_initials: Optional[str] = None
    away_color: Optional[str] = None
    away_color2: Optional[str] = None
    away_color3: Optional[str] = None
    away_logo_url: Optional[str] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    status: Optional[str] = None
    quarter: Optional[str] = None
    game_time: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    down: Optional[int] = None
    distance: Optional[int] = None
    ball_on: Optional[int] = None
    possession: Optional[str] = None
    home_timeouts: Optional[int] = None
    away_timeouts: Optional[int] = None
    play_clock: Optional[int] = None
    display_state: Optional[str] = None
    simple_mode: Optional[bool] = None
    timer_enabled: Optional[bool] = None
    timer_seconds: Optional[int] = None
    timer_running: Optional[bool] = None


class EmbeddedTeam(BaseModel):
    """Team info embedded in standalone game response"""
    id: str  # Will be 'home' or 'away'
    name: str  # Display name (e.g., "Eagles")
    location: Optional[str] = None  # Location/city (e.g., "Philadelphia")
    abbreviation: str  # Short abbreviation (e.g., "PHI")
    initials: Optional[str] = None  # Initials for compact display (e.g., "PE")
    color: str
    color2: Optional[str] = None
    color3: Optional[str] = None
    logo_url: Optional[str] = None


class StandaloneGame(BaseModel):
    id: str
    owner_id: Optional[str] = None
    home_team: EmbeddedTeam
    away_team: EmbeddedTeam
    home_score: int
    away_score: int
    status: str
    quarter: Optional[str] = None
    game_time: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    share_code: str
    down: Optional[int] = 1
    distance: Optional[int] = 10
    ball_on: Optional[int] = 25
    possession: Optional[str] = None
    home_timeouts: Optional[int] = 3
    away_timeouts: Optional[int] = 3
    play_clock: Optional[int] = 40
    display_state: Optional[str] = None
    simple_mode: bool = False
    timer_enabled: bool = True
    timer_seconds: int = 0
    timer_running: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
