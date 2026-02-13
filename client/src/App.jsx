import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, AdminRoute, GuestRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Giocatori from './pages/Giocatori';
import GiocatoreDetail from './pages/GiocatoreDetail';
import News from './pages/News';
import Infortunati from './pages/Infortunati';
import Featured from './pages/Featured';
import Admin from './pages/Admin';
import Profile from './pages/Profile';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/giocatori" element={<ProtectedRoute><Giocatori /></ProtectedRoute>} />
          <Route path="/giocatori/:id" element={<ProtectedRoute><GiocatoreDetail /></ProtectedRoute>} />
          <Route path="/news" element={<ProtectedRoute><News /></ProtectedRoute>} />
          <Route path="/mvp" element={<ProtectedRoute><Featured type="mvp" /></ProtectedRoute>} />
          <Route path="/potm" element={<ProtectedRoute><Featured type="potm" /></ProtectedRoute>} />
          <Route path="/infortunati" element={<ProtectedRoute><Infortunati /></ProtectedRoute>} />
          <Route path="/profilo" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/register" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
