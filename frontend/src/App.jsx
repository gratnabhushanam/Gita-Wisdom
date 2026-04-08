import React, { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import './styles/app-shell.css';

const Home = lazy(() => import('./pages/Home'));
const Stories = lazy(() => import('./pages/Stories'));
const Videos = lazy(() => import('./pages/Videos'));
const Sloka = lazy(() => import('./pages/Sloka'));
const About = lazy(() => import('./pages/About'));
const Quiz = lazy(() => import('./pages/Quiz'));
const StudentGuide = lazy(() => import('./pages/StudentGuide'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const RegisterVerifyOtp = lazy(() => import('./pages/RegisterVerifyOtp'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Mentor = lazy(() => import('./pages/Mentor'));
const DailySloka = lazy(() => import('./pages/DailySloka'));
const Reels = lazy(() => import('./pages/Reels'));
const KidsMode = lazy(() => import('./pages/KidsMode'));
const Search = lazy(() => import('./pages/Search'));
const Profile = lazy(() => import('./pages/Profile'));
const Movies = lazy(() => import('./pages/Movies'));
const UploadReel = lazy(() => import('./pages/UploadReel'));

function AppShell() {
  const scenes = [
    {
      className: 'app-background-0',
      image: '/scene-krishna.svg',
      symbolLabel: 'Krishna',
    },
    {
      className: 'app-background-1',
      image: '/scene-ram.svg',
      symbolLabel: 'Ram',
    },
    {
      className: 'app-background-2',
      image: '/scene-hanuman.svg',
      symbolLabel: 'Hanuman',
    },
  ];

  const getSceneIndexForPath = (pathname) => {
      if (pathname === '/daily-sloka') return 0;
    if (pathname === '/home' || pathname === '/profile') {
      return 0;
    }

    if (pathname === '/stories' || pathname === '/chapters' || pathname === '/videos' || pathname === '/movies') {
      return 1;
    }

    if (pathname === '/student' || pathname === '/mentor' || pathname === '/reels' || pathname === '/kids' || pathname === '/upload-reel' || pathname === '/admin') {
      return 2;
    }

    return 0;
  };

  const [bgIndex, setBgIndex] = useState(0);
  const location = useLocation();
  const { user, loading } = useAuth();
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/register/verify-otp' || location.pathname === '/forgot-password';

  useEffect(() => {
    setBgIndex(getSceneIndexForPath(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    if (isAuthRoute) {
      return undefined;
    }

    const interval = setInterval(() => {
      setBgIndex((prevIndex) => (prevIndex + 1) % scenes.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAuthRoute]);

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-spiritual-gold border-t-transparent"></div>
          <p className="text-sm uppercase tracking-[0.2em] text-spiritual-textMuted">Loading...</p>
        </div>
      </div>
    );
  }

  const pageFallback = (
    <div className="flex min-h-[40vh] items-center justify-center text-white">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-spiritual-gold border-t-transparent"></div>
        <p className="text-sm uppercase tracking-[0.2em] text-spiritual-textMuted">Loading page...</p>
      </div>
    </div>
  );

  return (
    <div className="app-shell flex min-h-screen flex-col relative text-white transition-all duration-1000">
      {!isAuthRoute && (
        <>
            <div
                key={scenes[bgIndex].image}
              className={`fixed inset-0 z-0 bg-cover bg-center transition-all duration-1000 app-shell__background ${scenes[bgIndex].className}`}
                style={{ backgroundImage: `url('${scenes[bgIndex].image}')` }}
              aria-label={scenes[bgIndex].symbolLabel}
            />
          <div className="fixed inset-0 z-0 bg-[#06101E]/48 backdrop-blur-[1px]"></div>
          <div className="fixed inset-0 z-0 opacity-20 pointer-events-none bg-gold-glow animate-pulse"></div>
        </>
      )}

      <div className="relative z-10 flex min-h-screen flex-col">
        {!isAuthRoute && <Navbar />}
        <main className="flex-grow">
          <Suspense fallback={pageFallback}>
            <Routes>
              <Route path="/" element={<Navigate to={user ? '/kids' : '/login'} replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/register/verify-otp" element={<RegisterVerifyOtp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/home" element={user ? <Home /> : <Navigate to="/login" replace />} />
              <Route path="/stories" element={user ? <Stories /> : <Navigate to="/login" replace />} />
              <Route path="/chapters" element={user ? <Stories /> : <Navigate to="/login" replace />} />
              <Route path="/videos" element={user ? <Videos /> : <Navigate to="/login" replace />} />
              <Route path="/sloka" element={user ? <Sloka /> : <Navigate to="/login" replace />} />
              <Route path="/about" element={user ? <About /> : <Navigate to="/login" replace />} />
              <Route path="/quiz" element={user ? <Quiz /> : <Navigate to="/login" replace />} />
              <Route path="/student" element={user ? <StudentGuide /> : <Navigate to="/login" replace />} />
              <Route path="/mentor" element={user ? <Mentor /> : <Navigate to="/login" replace />} />
              <Route path="/daily-sloka" element={user ? <DailySloka /> : <Navigate to="/login" replace />} />
              <Route path="/reels" element={user ? <Reels /> : <Navigate to="/login" replace />} />
              <Route path="/kids" element={user ? <KidsMode /> : <Navigate to="/login" replace />} />
              <Route path="/search" element={user ? <Search /> : <Navigate to="/login" replace />} />
              <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" replace />} />
              <Route path="/movies" element={user ? <Movies /> : <Navigate to="/login" replace />} />
              <Route path="/upload-reel" element={user ? <UploadReel /> : <Navigate to="/login" replace />} />
              <Route path="/admin" element={user ? <AdminDashboard /> : <Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to={user ? '/kids' : '/login'} replace />} />
            </Routes>
          </Suspense>
        </main>
        {!isAuthRoute && <Footer />}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppShell />
      </Router>
    </AuthProvider>
  );
}

export default App;
