import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Auth from './pages/Auth';
import Map from './pages/Map';
import AddTag from './pages/AddTag';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import Friends from './pages/Friends';
import Notification from './components/Notification';

// Protected route component
const ProtectedRoute: React.FC<{ element: React.ReactNode }> = ({ element }) => {
  const auth = useAuth();
  
  if (auth.loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-secondary animate-pulse">Loading...</div>
      </div>
    );
  }
  
  return auth.user ? <>{element}</> : <Navigate to="/auth" />;
};

// Router without auth context
const AppRoutes: React.FC = () => {
  const auth = useAuth();
  
  return (
    <Routes>
      <Route path="/auth" element={auth.user ? <Navigate to="/map" /> : <Auth />} />
      <Route path="/map" element={<ProtectedRoute element={<Map />} />} />
      <Route path="/add-tag" element={<ProtectedRoute element={<AddTag />} />} />
      <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} />
      <Route path="/profile/:userId" element={<ProtectedRoute element={<Profile />} />} />
      <Route path="/messages" element={<ProtectedRoute element={<Messages />} />} />
      <Route path="/messages/:userId" element={<ProtectedRoute element={<Messages />} />} />
      <Route path="/friends" element={<ProtectedRoute element={<Friends />} />} />
      <Route path="*" element={<Navigate to={auth.user ? "/map" : "/auth"} />} />
    </Routes>
  );
};

// Main App with auth provider
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Notification />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;