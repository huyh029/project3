import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { getSocketBaseUrl } from "../utils/apiClient";

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  rank: string;
  level: number;
  exp: number;
  gold: number;
  wins: number;
  losses: number;
  draws: number;
  elo: number;
}

interface GameContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  inventory: any[];
  setInventory: (items: any[]) => void;
  currentSkin: string;
  setCurrentSkin: (skin: string) => void;
  updateUserStats: (stats: Partial<User>) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  socket: Socket | null;
  logout: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [currentSkin, setCurrentSkin] = useState("classic");
  const [token, setToken] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    const storedInventory = localStorage.getItem("inventory");
    if (storedInventory) {
      setInventory(JSON.parse(storedInventory));
    } else {
      setInventory(["classic"]);
    }

    const storedSkin = localStorage.getItem("currentSkin");
    if (storedSkin) {
      setCurrentSkin(storedSkin);
    }

    const storedToken = localStorage.getItem("authToken");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem("authToken", token);
      const socketUrl = getSocketBaseUrl();
      const newSocket = io(socketUrl, {
        transports: ["websocket"],
      });
      newSocket.on("connect", () => {
        newSocket.emit("registerPlayer", token);
      });
      setSocket(newSocket);
      return () => {
        newSocket.disconnect();
      };
    }
    localStorage.removeItem("authToken");
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    return undefined;
  }, [token]);

  const updateUserStats = (stats: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...stats };
      setUser(updatedUser);
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setInventory(["classic"]);
    localStorage.removeItem("currentUser");
    localStorage.removeItem("guestMode");
    localStorage.removeItem("inventory");
  };

  return (
    <GameContext.Provider
      value={{
        user,
        setUser,
        inventory,
        setInventory,
        currentSkin,
        setCurrentSkin,
        updateUserStats,
        token,
        setToken,
        socket,
        logout,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
