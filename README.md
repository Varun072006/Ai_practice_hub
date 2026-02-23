# AI Practice Hub

A comprehensive web-based learning platform designed to help students practice programming and problem-solving questions across multiple courses in a structured and interactive manner.

## Project Overview

The AI Practice Hub is a full-stack application that provides:
- Structured practice environment for programming and theoretical questions
- Course-based learning with multiple levels
- Automated code evaluation using test cases
- AI Tutor integration for on-demand learning assistance
- Progress tracking and leaderboard
- Admin panel for question and course management

## Technology Stack

### Frontend
- **React.js** (Vite) - Component-based UI framework
- **Tailwind CSS** - Utility-first CSS framework
- **Monaco Editor** - Code editor component

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type-safe JavaScript
- **MySQL** - Relational database
- **JWT** - Authentication

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration

## Project Structure

```
PRACTICE_HUB/
├── frontend/          # React + Vite frontend
├── backend/           # Node.js + Express backend
├── db/                # Database schema and migrations
├── docs/              # Documentation
└── docker-compose.yml # Docker orchestration
```

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- Git

## Quick Start

### Using Docker (Recommended)

1. Navigate to project directory:
```bash
cd PRACTICE_HUB
```

2. Start backend and database services:
```bash
docker-compose up -d
```

3. Install frontend dependencies and start frontend:
```bash
cd frontend
npm install
npm run dev
```

4. Access the application:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **Database:** localhost:5432

### Quick Start Scripts

**Windows:**
```bash
start.bat
```

**Linux/Mac:**
```bash
./start.sh
```

Then start frontend separately:
```bash
cd frontend && npm install && npm run dev
```

### Local Development

1. Start database:
```bash
docker-compose up -d postgres
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
```

4. Start backend:
```bash
cd backend
npm run dev
```

5. Start frontend:
```bash
cd frontend
npm run dev
```

## Default Credentials

### Student Login
- Username: `USER`
- Password: `123`

### Admin Login
- Username: `ADMIN`
- Password: `123`

## Ports

- Frontend: `5173`
- Backend: `5000`
- Database: `5432`

## Environment Variables

### Backend (.env)
```
PORT=5000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=mysql://practicehub:practicehub123@localhost:3306/practice_hub
JWT_SECRET=your-super-secret-jwt-key-change-in-production
LOG_LEVEL=debug
```

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:5000
```

## Features

### Student Features
- Course selection (Python, C, Machine Learning)
- Level-based practice sessions
- Code editor with syntax highlighting
- Automated test case evaluation
- MCQ practice sessions
- Result analysis with feedback
- AI Tutor assistance (post-session)
- Progress tracking
- Leaderboard

### Admin Features
- User management
- Course and level management
- Question creation (Coding & MCQ)
- Test case management
- Analytics and reporting

## Course Unlock Rules

- Complete 4 Python levels → Unlock Machine Learning
- Complete 4 C levels → Unlock Python + Machine Learning

## API Documentation

API endpoints are available at `/api/docs` when the backend is running.

## Development

### Backend Development
```bash
cd backend
npm run dev      # Development mode with hot reload
npm run build    # Build for production
npm start        # Production mode
```

### Frontend Development
```bash
cd frontend
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
```

## Database Migrations

Database schema is automatically initialized when the PostgreSQL container starts.

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

This project is proprietary software.

## Support

For issues and questions, please contact the development team.