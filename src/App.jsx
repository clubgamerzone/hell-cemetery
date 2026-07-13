import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import EnemiesPage from './pages/EnemiesPage';
import ItemsPage from './pages/ItemsPage';
import CraftingPage from './pages/CraftingPage';
import FeedbackPage from './pages/FeedbackPage';
import GameDataPage from './pages/GameDataPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route path="/enemies" element={<EnemiesPage />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/crafting" element={<CraftingPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/game-data" element={<GameDataPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          </Routes>
        </main>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}
