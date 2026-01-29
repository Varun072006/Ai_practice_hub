import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NavigationProvider } from './context/NavigationContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/login';
import Register from './pages/register';
import ForgotPassword from './pages/forgotPassword';
import Dashboard from './pages/dashboard';
import CourseLevels from './pages/courseLevels';
import Practice from './pages/practice';
import MCQPractice from './pages/mcqPractice';
import Results from './pages/results';
import Progress from './pages/progress';
import Leaderboard from './pages/leaderboard';
import AICoach from './pages/aiCoach';
import LevelOverview from './pages/LevelOverview';
import HtmlCssChallenge from './pages/HtmlCssChallenge';
import Profile from './pages/Profile';

// Admin Pages
import AdminOverview from './pages/admin/overview';
import AdminCourses from './pages/admin/courses';
import AdminCourseLevels from './pages/admin/courseLevels';
import AdminUsers from './pages/admin/users';
import CreateQuestion from './pages/admin/createQuestion';
import LevelQuestions from './pages/admin/levelQuestions';
import AdminLeaderboard from './pages/admin/leaderboard';
import StudentResults from './pages/admin/results';

const AppRoutes = () => {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:courseId/levels"
        element={
          <ProtectedRoute>
            <CourseLevels />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:courseId/level/:levelId/learn"
        element={
          <ProtectedRoute>
            <LevelOverview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/html-css-practice/:courseId/:levelId"
        element={
          <ProtectedRoute>
            <HtmlCssChallenge />
          </ProtectedRoute>
        }
      />
      <Route
        path="/practice/:courseId/:levelId"
        element={
          <ProtectedRoute>
            <Practice />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mcq-practice/:courseId/:levelId"
        element={
          <ProtectedRoute>
            <MCQPractice />
          </ProtectedRoute>
        }
      />
      <Route
        path="/results/:sessionId"
        element={
          <ProtectedRoute>
            <Results />
          </ProtectedRoute>
        }
      />
      <Route
        path="/progress"
        element={
          <ProtectedRoute>
            <Progress />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <Leaderboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-coach"
        element={
          <ProtectedRoute>
            <AICoach />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/overview"
        element={
          <ProtectedRoute requireAdmin>
            <AdminOverview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requireAdmin>
            <AdminUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/courses"
        element={
          <ProtectedRoute requireAdmin>
            <AdminCourses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/courses/:courseId/levels"
        element={
          <ProtectedRoute requireAdmin>
            <AdminCourseLevels />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/courses/:courseId/levels/:levelId/questions"
        element={
          <ProtectedRoute requireAdmin>
            <LevelQuestions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/results"
        element={
          <ProtectedRoute requireAdmin>
            <StudentResults />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/leaderboard"
        element={
          <ProtectedRoute requireAdmin>
            <AdminLeaderboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/questions/create"
        element={
          <ProtectedRoute requireAdmin>
            <CreateQuestion />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/questions/edit/:questionId"
        element={
          <ProtectedRoute requireAdmin>
            <CreateQuestion />
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={
          loading ? (
            <div className="flex items-center justify-center h-screen">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading...</p>
              </div>
            </div>
          ) : user ? (
            user.role === 'admin' ? (
              <Navigate to="/admin/overview" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <NavigationProvider>
            <AppRoutes />
          </NavigationProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;

