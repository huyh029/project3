import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ArrowLeft, Trophy, Crown, Medal } from "lucide-react";
import { useGame } from "../context/GameContext";
import { apiClient } from "../utils/apiClient";
import { mapPlayerToUser } from "../utils/playerAdapter";
import { toast } from "sonner";

interface LeaderboardPlayer {
  rank: number;
  username: string;
  avatar: string;
  elo: number;
  wins: number;
  tier: string;
  isCurrentUser?: boolean;
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const { user, token } = useGame();
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const response = await apiClient.get<{
          topPlayers: any[];
          me?: { player: any; position: number };
        }>("/leaderboard", token);

        const mappedTop = response.topPlayers.map((player, index) => {
          const mapped = mapPlayerToUser(player);
          return {
            rank: index + 1,
            username: mapped.username,
            avatar: mapped.avatar,
            elo: mapped.elo,
            wins: mapped.wins,
            tier: mapped.rank,
            isCurrentUser: mapped.id === user?.id,
          };
        });
        setGlobalLeaderboard(mappedTop);

        if (response.me?.player) {
          const mapped = mapPlayerToUser(response.me.player);
          setMyRank(response.me.position);
          if (!mappedTop.find((entry) => entry.username === mapped.username)) {
            setGlobalLeaderboard((prev) => [
              ...prev,
              {
                rank: response.me!.position,
                username: mapped.username,
                avatar: mapped.avatar,
                elo: mapped.elo,
                wins: mapped.wins,
                tier: mapped.rank,
                isCurrentUser: true,
              },
            ]);
          }
        }
      } catch (error: any) {
        toast.error(error.message || "Không thể tải bảng xếp hạng");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [token, user]);

  const friendsLeaderboard = useMemo<LeaderboardPlayer[]>(() => {
    if (!user) return [];
    return [
      {
        rank: myRank || 1,
        username: user.username,
        avatar: user.avatar,
        elo: user.elo,
        wins: user.wins,
        tier: user.rank,
        isCurrentUser: true,
      },
    ];
  }, [user, myRank]);

  const topThree = globalLeaderboard
    .filter((entry) => entry.rank <= 3)
    .sort((a, b) => a.rank - b.rank);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-700" />;
    return <span className="w-6 text-center">{rank}</span>;
  };

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      Grandmaster: "bg-purple-500",
      Master: "bg-red-500",
      Diamond: "bg-blue-500",
      Platinum: "bg-cyan-500",
      Gold: "bg-yellow-500",
      Silver: "bg-gray-400",
      Bronze: "bg-amber-700",
    };
    return colors[tier] || "bg-gray-500";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <Button variant="outline" onClick={() => navigate("/home")} className="mb-6 text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Về trang chủ
        </Button>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Trophy className="w-10 h-10 text-yellow-400" />
            <h1 className="text-4xl text-white">Bảng Xếp Hạng</h1>
            <Trophy className="w-10 h-10 text-yellow-400" />
          </div>
          <p className="text-gray-300">Theo dõi các cao thủ cờ vua hàng đầu</p>
        </div>

        {!token && (
          <Card className="mb-6">
            <CardContent>
              <p className="text-center text-gray-600">
                Đăng nhập để xem bảng xếp hạng toàn server theo thời gian thực.
              </p>
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="text-center text-gray-300 mb-4">Đang tải dữ liệu...</div>
        )}

        {myRank && (
          <Card className="mb-6 bg-white/10 border-white/10 text-white">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">Hạng hiện tại</p>
                <p className="text-2xl font-semibold">#{myRank}</p>
              </div>
              <Badge className="text-lg px-4 py-2 bg-yellow-500 text-black">
                {user?.rank}
              </Badge>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="global" className="mb-8">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="global">Toàn server</TabsTrigger>
            <TabsTrigger value="friends">Bạn bè</TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="mt-6">
            {topThree.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {topThree.map((player) => (
                  <Card
                    key={player.rank}
                    className={`text-center ${
                      player.rank === 1 ? "bg-yellow-500/20 border-yellow-400/40" : "bg-white/10"
                    }`}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-center gap-2 mb-4">
                        {getRankIcon(player.rank)}
                        <span className="text-2xl font-semibold">{player.username}</span>
                      </div>
                      <div className="text-4xl font-bold text-white mb-2">
                        {player.elo} ELO
                      </div>
                      <div className="text-sm text-gray-300">{player.wins} trận thắng</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Top Cao Thủ</CardTitle>
                <CardDescription>Top 100 người chơi có ELO cao nhất</CardDescription>
              </CardHeader>
              <CardContent>
                {globalLeaderboard.length === 0 ? (
                  <p className="text-gray-500 text-center">
                    {token ? "Chưa có dữ liệu để hiển thị" : "Hãy đăng nhập để xem bảng xếp hạng."}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {globalLeaderboard.map((player) => (
                      <div
                        key={player.rank}
                        className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                          player.isCurrentUser ? "bg-purple-500/20" : "bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {getRankIcon(player.rank)}
                          <img
                            src={player.avatar}
                            alt={player.username}
                            className="w-12 h-12 rounded-full border border-white/20"
                          />
                          <div>
                            <p className="text-white font-medium">{player.username}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <span>{player.elo} ELO</span>
                              <span>•</span>
                              <span>{player.wins} thắng</span>
                            </div>
                          </div>
                        </div>
                        <Badge className={getTierColor(player.tier)}>{player.tier}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="friends" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Bảng xếp hạng cá nhân</CardTitle>
                <CardDescription>Theo dõi tiến trình của bạn bè</CardDescription>
              </CardHeader>
              <CardContent>
                {friendsLeaderboard.length === 0 ? (
                  <p className="text-center text-gray-500">Đăng nhập để xem hạng của bạn.</p>
                ) : (
                  <div className="space-y-3">
                    {friendsLeaderboard.map((player) => (
                      <div
                        key={player.rank}
                        className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                          player.isCurrentUser ? "bg-green-500/20" : "bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <span className="w-6 text-white">{player.rank}</span>
                          <img
                            src={player.avatar}
                            alt={player.username}
                            className="w-12 h-12 rounded-full border border-white/20"
                          />
                          <div>
                            <p className="text-white font-medium">{player.username}</p>
                            <p className="text-sm text-gray-400">{player.elo} ELO</p>
                          </div>
                        </div>
                        <Badge className={getTierColor(player.tier)}>{player.tier}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
