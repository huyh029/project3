import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Crown } from "lucide-react";
import { useGame } from "../context/GameContext";
import { apiClient } from "../utils/apiClient";
import { mapInventory, mapPlayerToUser } from "../utils/playerAdapter";
import { toast } from "sonner";

interface LandingProps {
  setIsAuthenticated: (value: boolean) => void;
  setIsGuest: (value: boolean) => void;
}

export default function Landing({
  setIsAuthenticated,
  setIsGuest,
}: LandingProps) {
  const navigate = useNavigate();
  const { setUser, setInventory, setToken } = useGame();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const persistLogin = (player: any, token: string) => {
    const mapped = mapPlayerToUser(player);
    setUser(mapped);
    setInventory(mapInventory(player));
    setToken(token);
    localStorage.setItem("currentUser", JSON.stringify(mapped));
    localStorage.removeItem("guestMode");
    setIsGuest(false);
    setIsAuthenticated(true);
    navigate("/home");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: { player: any; token: string };
      }>("/auth/login", {
        email: loginEmail,
        password: loginPassword,
      });
      persistLogin(response.data.player, response.data.token);
      toast.success("Đăng nhập thành công");
    } catch (error: any) {
      toast.error(error.message || "Không thể đăng nhập");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: { player: any; token: string };
      }>("/auth/register", {
        name: registerUsername,
        email: registerEmail,
        password: registerPassword,
      });
      persistLogin(response.data.player, response.data.token);
      toast.success("Tạo tài khoản thành công");
    } catch (error: any) {
      toast.error(error.message || "Không thể đăng ký");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestPlay = () => {
    const guestProfile = {
      id: "guest",
      username: "Khách",
      email: "guest@chess.vn",
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=guest`,
      rank: "Unranked",
      level: 1,
      exp: 0,
      gold: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      elo: 0,
    };

    setUser(guestProfile);
    setToken(null);
    localStorage.setItem("guestMode", "true");
    localStorage.setItem("currentUser", JSON.stringify(guestProfile));
    setIsGuest(true);
    setIsAuthenticated(false);
    navigate("/home");
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1640963269654-3fe248c5fba6?auto=format&fit=crop&w=1600&q=80"
          alt="Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/80" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Crown className="w-12 h-12 text-yellow-400" />
            <h1 className="text-5xl text-white">Chess Master</h1>
          </div>
          <p className="text-xl text-gray-300">Trở thành cao thủ cờ vua!</p>
        </div>

        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Chào mừng đến với Chess Master</CardTitle>
            <CardDescription>Đăng nhập hoặc tạo tài khoản mới</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Đăng nhập</TabsTrigger>
                <TabsTrigger value="register">Đăng ký</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="email@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Mật khẩu</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="********"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    Đăng nhập
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-username">Tên người chơi</Label>
                    <Input
                      id="register-username"
                      type="text"
                      placeholder="Tên của bạn"
                      value={registerUsername}
                      onChange={(e) => setRegisterUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="email@example.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Mật khẩu</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="********"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    Đăng ký
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 pt-6 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGuestPlay}
                disabled={loading}
              >
                Chơi nhanh không cần tài khoản
              </Button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Chế độ khách chỉ mở khóa một số tính năng cơ bản
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
