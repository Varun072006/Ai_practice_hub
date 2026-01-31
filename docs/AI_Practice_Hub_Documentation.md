# AI Practice Hub - Project Documentation

## 📋 Project Overview

**AI Practice Hub** is a comprehensive full-stack web-based learning platform designed to help students practice programming and problem-solving questions across multiple courses in a structured and interactive manner. It functions as an intelligent educational tool that combines traditional coding practice with AI-powered tutoring and analytics.

---

## 🏗️ System Architecture

The project follows a **3-tier architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Vite)                  │
│              Port: 5173 | Tailwind CSS | Monaco Editor       │
└─────────────────────────────────────────────────────────────┘
                              ↕ REST API
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND (Node.js + Express + TypeScript)     │
│                          Port: 5000                          │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌──────────────────────────────┬──────────────────────────────┐
│     MySQL Database           │       ChromaDB               │
│   (Primary Data Store)       │   (Vector DB for AI)         │
│      Port: 3306              │      Port: 8001              │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| React.js | 18.2.0 | Component-based UI framework |
| Vite | 5.0.8 | Lightning-fast build tool & dev server |
| Tailwind CSS | 3.4.0 | Utility-first CSS framework |
| Monaco Editor | 4.6.0 | VS Code-like code editor component |
| React Router DOM | 6.21.1 | Client-side routing |
| Axios | 1.6.2 | HTTP client for API calls |
| Lucide React | 0.303.0 | Icon library |
| React Hot Toast | 2.6.0 | Toast notifications |
| Google OAuth | 0.12.2 | Google authentication |
| PapaParse | 5.5.3 | CSV parsing for data uploads |

### Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | JavaScript runtime environment |
| Express.js | 4.18.2 | Web application framework |
| TypeScript | 5.3.3 | Type-safe JavaScript |
| MySQL2 | 3.6.5 | MySQL database driver |
| JWT | 9.0.2 | Authentication tokens |
| bcryptjs | 2.4.3 | Password hashing |
| @google/generative-ai | 0.24.1 | Google Gemini AI integration |
| @xenova/transformers | 2.17.2 | ML transformers for NLP |
| ChromaDB | 1.10.5 | Vector database for AI |
| Winston | 3.11.0 | Logging framework |
| Joi | 17.11.0 | Input validation |
| Multer | 2.0.2 | File upload handling |
| Express Rate Limit | 8.2.1 | API rate limiting |
| tsx | 4.7.0 | TypeScript execution |

### DevOps & Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Multi-container orchestration |
| MySQL 8.0 | Relational database |
| ChromaDB | Vector database for AI embeddings |

---

## 📁 Project Structure

```
PRACTICE_HUB/
├── frontend/                    # React + Vite Frontend Application
│   ├── src/
│   │   ├── components/          # Reusable UI Components (11 files)
│   │   │   ├── AIAnalysisCard.jsx      # AI-powered analysis display
│   │   │   ├── CodeEditor.jsx          # Monaco code editor wrapper
│   │   │   ├── GoogleLoginButton.jsx   # OAuth login button
│   │   │   ├── HtmlCssResult.jsx       # HTML/CSS challenge results
│   │   │   ├── Layout.jsx              # Page layout wrapper
│   │   │   ├── McqResult.jsx           # MCQ results display
│   │   │   ├── PreviewFrame.jsx        # HTML/CSS preview iframe
│   │   │   ├── ResultsPanel.jsx        # Test results panel
│   │   │   └── Sidebar.jsx             # Navigation sidebar
│   │   ├── pages/               # Application Pages (22 files)
│   │   │   ├── dashboard.jsx           # Student dashboard
│   │   │   ├── courseLevels.jsx        # Course level selection
│   │   │   ├── LevelOverview.jsx       # Level details & questions
│   │   │   ├── practice.jsx            # Coding practice environment
│   │   │   ├── mcqPractice.jsx         # MCQ practice sessions
│   │   │   ├── HtmlCssChallenge.jsx    # HTML/CSS challenges
│   │   │   ├── results.jsx             # Session results
│   │   │   ├── leaderboard.jsx         # Rankings display
│   │   │   ├── progress.jsx            # Progress tracking
│   │   │   ├── aiCoach.jsx             # AI tutor interface
│   │   │   ├── Profile.jsx             # User profile
│   │   │   ├── login.jsx               # Login page
│   │   │   ├── register.jsx            # Registration page
│   │   │   └── admin/                  # Admin panel (8 files)
│   │   ├── context/             # React Context (3 files)
│   │   ├── services/            # API services (1 file)
│   │   └── utils/               # Utility functions
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── backend/                     # Node.js + Express Backend
│   ├── src/
│   │   ├── controllers/         # Request handlers (16 files)
│   │   │   ├── authController.ts       # Authentication
│   │   │   ├── courseController.ts     # Course management
│   │   │   ├── adminController.ts      # Admin operations
│   │   │   ├── aiTutorController.ts    # AI tutor API
│   │   │   ├── sessionController.ts    # Practice sessions
│   │   │   ├── skillController.ts      # Skill management
│   │   │   └── analyticsController.ts  # Analytics data
│   │   ├── services/            # Business logic (22 files)
│   │   │   ├── authService.ts          # Authentication logic
│   │   │   ├── courseService.ts        # Course operations
│   │   │   ├── aiTutorService.ts       # AI tutor integration
│   │   │   ├── codeExecutionService.ts # Code execution
│   │   │   ├── sessionService.ts       # Session management
│   │   │   ├── questionService.ts      # Question handling
│   │   │   └── learningIntelligenceService.ts # AI learning
│   │   ├── routes/              # API routes (17 files)
│   │   ├── middlewares/         # Express middlewares (4 files)
│   │   ├── types/               # TypeScript types (8 files)
│   │   ├── config/              # Configuration (2 files)
│   │   ├── utils/               # Utilities (6 files)
│   │   ├── schema.sql           # Database schema
│   │   ├── app.ts               # Express app setup
│   │   └── server.ts            # Server entry point
│   ├── scripts/                 # DB scripts (22 files)
│   ├── migrations/              # DB migrations
│   └── package.json
│
├── db/                          # Database Files
│   ├── schema.sql               # PostgreSQL schema
│   ├── schema_mysql.sql         # MySQL schema
│   ├── migrations/              # Migration files (8 files)
│   └── seeds/                   # Seed data (2 files)
│
├── docs/                        # Documentation
├── docker-compose.yml           # Docker orchestration
├── .env                         # Environment variables
└── README.md                    # Project documentation
```

---

## 🌟 Key Features

### Student Features

| Feature | Description |
|---------|-------------|
| Multi-Course Learning | Python, C, Machine Learning, HTML/CSS, Data Science, Deep Learning |
| Level-Based Practice | Progressive difficulty levels within each course |
| Coding Practice | Monaco editor with syntax highlighting & auto-completion |
| MCQ Practice | Multiple choice question sessions |
| HTML/CSS Challenges | Live preview for web development practice |
| Automated Code Evaluation | Test case-based code grading |
| AI Tutor | Google Gemini-powered learning assistance |
| Progress Tracking | Detailed analytics on learning progress |
| Leaderboard | Competitive rankings among students |
| Google OAuth | Easy sign-in with Google accounts |

### Admin Features

| Feature | Description |
|---------|-------------|
| User Management | CRUD operations on users |
| Course Management | Create and manage courses and levels |
| Question Creation | Add coding & MCQ questions |
| Test Case Management | Define test cases for code evaluation |
| CSV Upload | Bulk import questions via CSV |
| Analytics Dashboard | View platform-wide analytics |

---

## 🔐 Authentication & Security

- **JWT-based Authentication** - Secure token-based auth
- **bcrypt Password Hashing** - Secure password storage
- **Google OAuth 2.0** - Social login integration
- **Rate Limiting** - API abuse prevention
- **Input Validation** - Joi-based request validation

---

## 🤖 AI Integration

The project leverages multiple AI technologies:

### 1. Llama 3 (via Ollama) - Primary AI Tutor
- **Model:** `llama3:latest`
- **Server:** Ollama running on `http://localhost:11434`
- Interactive AI Tutor conversations
- Coding assistance and debugging help
- Concept explanations and learning guidance
- Question analysis and feedback

### 2. Google Gemini AI (@google/generative-ai)
- Alternative AI backend
- Learning recommendations
- Question explanations

### 3. Transformers (@xenova/transformers)
- Natural language processing
- Text embeddings for similarity matching

### 4. ChromaDB (Vector Database)
- Stores embeddings for semantic search
- Powers intelligent question recommendations

### Running Ollama for AI Tutor
```bash
# Install Ollama
# Download from: https://ollama.ai

# Pull Llama 3 model
ollama pull llama3

# Start Ollama server
ollama serve
```

---

## 🎮 Course Unlock System

The platform implements a progressive unlock system:

```
Complete 4 Python Levels  →  Unlock Machine Learning
Complete 4 C Levels       →  Unlock Python + Machine Learning
```

---

## 🚀 Running the Application

### Development Mode

```bash
# Start backend + database with Docker
docker-compose up -d

# Start frontend
cd frontend && npm install && npm run dev
```

### Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| MySQL | localhost:3306 |
| ChromaDB | localhost:8001 |

---

## 📊 Database Schema

The application uses **MySQL 8.0** with the following main tables:

- **users** - User accounts (students & admins)
- **courses** - Available courses
- **levels** - Course levels
- **questions** - Practice questions
- **mcq_options** - MCQ answer choices
- **test_cases** - Code test cases
- **sessions** - Practice sessions
- **results** - User results
- **progress** - User progress tracking

---

## 🔧 Environment Variables

### Backend (.env)
```
PORT=5000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=mysql://practicehub:practicehub123@localhost:3306/practice_hub
JWT_SECRET=your-super-secret-jwt-key-change-in-production
LOG_LEVEL=debug
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

---

## 📱 Default Credentials

### Student Login
- Username: `USER`
- Password: `123`

### Admin Login
- Username: `ADMIN`
- Password: `123`

---

## 🔌 API Endpoints Overview

| Category | Base Path | Description |
|----------|-----------|-------------|
| Auth | /api/auth | Login, Register, Google OAuth |
| Courses | /api/courses | Course listing and details |
| Sessions | /api/sessions | Practice session management |
| Questions | /api/questions | Question retrieval |
| Results | /api/results | Result submission and retrieval |
| Progress | /api/progress | User progress tracking |
| AI Tutor | /api/ai-tutor | AI-powered tutoring |
| Admin | /api/admin | Admin operations |
| Analytics | /api/analytics | Platform analytics |
| Skills | /api/skills | Skill management |

---

## 📦 Docker Services

The application uses Docker Compose to orchestrate the following services:

1. **Backend** - Node.js Express server
2. **Frontend** - Vite React development server
3. **MySQL** - Primary database
4. **ChromaDB** - Vector database for AI features

---

## 🏆 Conclusion

AI Practice Hub is a **production-ready, feature-rich learning management system** that combines modern web technologies with AI capabilities to create an engaging educational experience. The platform provides:

- Structured learning paths across multiple programming languages
- AI-powered tutoring and recommendations
- Real-time code execution and evaluation
- Comprehensive progress tracking and analytics
- Admin tools for content management

This makes it an ideal solution for educational institutions, coding bootcamps, and self-learners looking for an interactive programming practice environment.

---

*Document Generated: January 31, 2026*
