import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Game from "./pages/Game";
import Profile from "./pages/Profile";
import Shop from "./pages/Shop";
import Leaderboard from "./pages/Leaderboard";
import Settings from "./pages/Settings";
import Quests from "./pages/Quests";
import Inbox from "./pages/Inbox";
import OnlineLobby from "./pages/OnlineLobby";
import RankLobby from "./pages/RankLobby";
import { useGame } from "./context/GameContext";

export default function App() {
  const { token } = useGame();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(Boolean(token));
  const [isGuest, setIsGuest] = useState<boolean>(
    localStorage.getItem("guestMode") === "true"
  );

  useEffect(() => {
    setIsAuthenticated(Boolean(token));
  }, [token]);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated || isGuest ? (
              <Navigate to="/home" />
            ) : (
              <Landing
                setIsAuthenticated={setIsAuthenticated}
                setIsGuest={setIsGuest}
              />
            )
          }
        />
        <Route
          path="/home"
          element={
            isAuthenticated || isGuest ? (
              <Home isGuest={isGuest} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route path="/game/:mode" element={<Game />} />
        <Route path="/online-lobby" element={<OnlineLobby />} />
        <Route path="/rank-lobby" element={<RankLobby />} />
        <Route path="/profile" element={<Profile isGuest={isGuest} />} />
        <Route path="/shop" element={<Shop isGuest={isGuest} />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route
          path="/settings"
          element={
            <Settings
              setIsAuthenticated={setIsAuthenticated}
              setIsGuest={setIsGuest}
            />
          }
        />
        <Route path="/quests" element={<Quests isGuest={isGuest} />} />
        <Route path="/inbox" element={<Inbox isGuest={isGuest} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
