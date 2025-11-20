import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { getSocketBaseUrl } from "../utils/apiClient";
import { toast } from "sonner";
import { apiClient } from "../utils/apiClient";
import { mapInventory, mapPlayerToUser } from "../utils/playerAdapter";

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  rank: string;
  rankTier?: string;
  rankDivision?: number;
  rankStars?: number;
  rankEssence?: number;
  level: number;
  exp: number;
  gold: number;
  wins: number;
  losses: number;
  draws: number;
  elo: number;
}

export interface RoomInvite {
  id: string;
  roomId: string;
  hostId: string;
  hostName: string;
  timeLimit: number;
  createdAt: string;
}

interface RoomInvitePayload {
  roomId: string;
  hostId: string;
  hostName: string;
  timeLimit: number;
  createdAt: string;
}

export interface GuestPendingRoom {
  roomId: string;
  hostId: string;
  hostName: string;
  timeLimit: number;
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
  roomInvites: RoomInvite[];
  setRoomInvites: (invites: RoomInvite[]) => void;
  guestPendingRoom: GuestPendingRoom | null;
  setGuestPendingRoom: (room: GuestPendingRoom | null) => void;
  refreshUser: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [currentSkin, setCurrentSkin] = useState("classic");
  const [token, setToken] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomInvites, setRoomInvites] = useState<RoomInvite[]>([]);
  const [guestPendingRoom, setGuestPendingRoom] = useState<GuestPendingRoom | null>(null);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const response = await apiClient.get<{ success: boolean; player: any }>("/players/me", token);
      if (!response?.player) return;
      const mappedUser = mapPlayerToUser(response.player);
      setUser(mappedUser);
      localStorage.setItem("currentUser", JSON.stringify(mappedUser));

      const mappedInventory = mapInventory(response.player);
      setInventory(mappedInventory);
      localStorage.setItem("inventory", JSON.stringify(mappedInventory));
    } catch (err) {
      console.warn("Failed to refresh user profile:", err);
    }
  }, [token]);

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

  useEffect(() => {
    if (!socket) return;
    const handleInvite = (payload: RoomInvitePayload) => {
      const id = `${payload.roomId}-${payload.createdAt}`;
      setRoomInvites(prev => {
        if (prev.some(invite => invite.id === id)) return prev;
        toast.info(`${payload.hostName} mời bạn vào phòng ${payload.roomId}`);
        return [...prev, { ...payload, id }];
      });
    };
    const handleKicked = (payload: { roomId: string; hostId: string }) => {
      setGuestPendingRoom(prev => (prev?.roomId === payload.roomId ? null : prev));
      toast.warning("Chủ phòng đã hủy lời mời của bạn");
    };
    socket.on("room:invite", handleInvite);
    socket.on("room:kicked", handleKicked);
    return () => {
      socket.off("room:invite", handleInvite);
      socket.off("room:kicked", handleKicked);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !token) return;
    const handleMatchFinished = () => {
      refreshUser();
    };
    socket.on("match:finished", handleMatchFinished);
    return () => {
      socket.off("match:finished", handleMatchFinished);
    };
  }, [socket, token, refreshUser]);

  useEffect(() => {
    if (!token) return;
    refreshUser();
  }, [token, refreshUser]);

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
        roomInvites,
        setRoomInvites,
        guestPendingRoom,
        setGuestPendingRoom,
        refreshUser,
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
