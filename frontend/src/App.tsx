import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Play from "./pages/Play";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import { useAuth } from "./context/AuthContext";
import Leaderboard from "./pages/Leaderboard";
import HowToPlay from "./pages/HowToPlay";

function Protected({ children, admin = false }: { children: JSX.Element; admin?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-center text-ivory/60">Loading…</div>;
  if (!user) { window.location.href = "/admin.php"; return null; }
  if (admin && !user.isAdmin) { window.location.href = "/admin.php"; return null; }
  return children;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/play" element={<Protected><Play /></Protected>} />
        <Route path="/profile" element={<Protected><Profile /></Protected>} />
        <Route path="/admin" element={<Protected admin><Admin /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/how-to-play" element={<HowToPlay />} />
      </Routes>
    </Layout>
  );
}