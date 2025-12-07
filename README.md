# ScoreKeeper

A full-stack scoreboard application for tracking leagues, brackets, and live game scores. Built with React (Vite) frontend and FastAPI backend with SQLite database.

## Features

- **League Management**: Create leagues with teams, track wins/losses, and view standings
- **Live Game Scoring**: Score games in real-time with WebSocket updates for viewers
- **Playoff Brackets**: Create single-elimination tournament brackets
- **Shareable Scoreboards**: Quick scoreboards for any game or activity
- **Real-time Updates**: WebSocket-powered live updates across all features
- **Share Links**: Every game, bracket, and scoreboard has a unique share code

## Tech Stack

### Frontend
- React 18 with Vite
- TailwindCSS for styling
- Radix UI primitives (shadcn/ui style)
- React Router for navigation
- Lucide React for icons

### Backend
- FastAPI (Python)
- SQLAlchemy ORM
- SQLite database
- WebSockets for real-time updates

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

The API will be available at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5173`.

## Usage

### Creating a League

1. Go to **Leagues** from the navigation
2. Click **New League** and fill in the details
3. Add teams to your league
4. Create games between teams
5. Score games live with real-time updates

### Creating a Scoreboard

1. Go to **Scoreboards** from the navigation
2. Click **New Scoreboard**
3. Add players with names and colors
4. Use +/- buttons to update scores
5. Share the link with others to watch live

### Creating a Bracket

1. Create a league with teams first
2. Go to the league's **Brackets** tab
3. Click **New Bracket** and select number of teams
4. Click on matches to update scores
5. Winners automatically advance to the next round

### Sharing

Every game, bracket, and scoreboard has a unique share code. Click the **Share** button to copy the link. Viewers will see real-time updates via WebSocket.

## API Endpoints

### Leagues
- `GET /api/leagues` - List all leagues
- `POST /api/leagues` - Create a league
- `GET /api/leagues/{id}` - Get league details
- `GET /api/leagues/{id}/standings` - Get league standings
- `GET /api/leagues/{id}/games` - Get league games
- `GET /api/leagues/{id}/brackets` - Get league brackets

### Teams
- `POST /api/teams` - Create a team
- `PUT /api/teams/{id}` - Update a team
- `DELETE /api/teams/{id}` - Delete a team

### Games
- `POST /api/games` - Create a game
- `GET /api/games/{id}` - Get game details
- `GET /api/games/share/{code}` - Get game by share code
- `PUT /api/games/{id}` - Update game (score, status)

### Brackets
- `POST /api/brackets` - Create a bracket
- `GET /api/brackets/{id}` - Get bracket details
- `GET /api/brackets/share/{code}` - Get bracket by share code
- `PUT /api/brackets/matches/{id}` - Update bracket match

### Scoreboards
- `GET /api/scoreboards` - List public scoreboards
- `POST /api/scoreboards` - Create a scoreboard
- `GET /api/scoreboards/{id}` - Get scoreboard details
- `GET /api/scoreboards/share/{code}` - Get scoreboard by share code
- `POST /api/scoreboards/{id}/players` - Add player
- `PUT /api/scoreboards/players/{id}` - Update player score
- `DELETE /api/scoreboards/players/{id}` - Remove player

### WebSocket Endpoints
- `ws://localhost:8000/ws/game/{share_code}` - Live game updates
- `ws://localhost:8000/ws/bracket/{share_code}` - Live bracket updates
- `ws://localhost:8000/ws/scoreboard/{share_code}` - Live scoreboard updates

## License

MIT
