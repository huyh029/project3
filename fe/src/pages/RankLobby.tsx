import { useEffect, useState } from "react";
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
import { Progress } from "../components/ui/progress";
import { ArrowLeft, Trophy, Crown, Loader2 } from "lucide-react";
import { useGame } from "../context/GameContext";
import { apiClient } from "../utils/apiClient";
import { toast } from "sonner";

export default function RankLobby() {
  const navigate = useNavigate();
  const { user, token, socket } = useGame();
  const [queueEntry, setQueueEntry] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleMatchFound = (payload: { batchId: string; type: string }) => {
      if (payload.type !== "rank") return;
      toast.success("Đã tìm thấy đối thủ rank!");
      setQueueEntry(null);
      setSearching(false);
      navigate("/game/ranked", { state: { batchId: payload.batchId } });
    };

    socket.on("match:found", handleMatchFound);
    return () => {
      socket.off("match:found", handleMatchFound);
    };
  }, [socket, navigate]);

  useEffect(() => {
    return () => {
      if (queueEntry && token) {
        apiClient
          .delete(`/queue/${queueEntry._id}`, token)
          .catch(() => {});
      }
    };
  }, [queueEntry, token]);

  const startRanked = async () => {
    if (!token) {
      toast.error("Vui lòng đăng nhập để đánh rank");
      return;
    }
    setSearching(true);
    try {
      const response = await apiClient.post<{ entry: any }>(
        "/queue",
        { type: "rank", timeLimit: 10 },
        token
      );
      setQueueEntry(response.entry);
      toast.success("Đang tìm đối thủ rank...");
    } catch (error: any) {
      toast.error(error.message || "Không thể vào hàng chờ");
      setSearching(false);
    }
  };

  const cancelQueue = async () => {
    if (!queueEntry || !token) return;
    try {
      await apiClient.delete(`/queue/${queueEntry._id}`, token);
      setQueueEntry(null);
      setSearching(false);
    } catch (error: any) {
      toast.error(error.message || "Không thể hủy hàng chờ");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <p>Vui lòng đăng nhập để vào chế độ rank.</p>
      </div>
    );
  }

  const winRate =
    user.wins + user.losses + user.draws > 0
      ? Math.round((user.wins / (user.wins + user.losses + user.draws)) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button
          variant="outline"
          onClick={() => navigate("/home")}
          className="text-white"
          disabled={searching}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Về trang chủ
        </Button>

        <Card className="bg-gradient-to-br from-purple-600/40 to-indigo-700/40 border-white/10 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-3xl">
              <Trophy className="w-8 h-8 text-yellow-400" />
              Đấu rank
            </CardTitle>
            <CardDescription className="text-gray-200">
              Thời gian mặc định 10 phút mỗi người
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300">Tên người chơi</p>
                <p className="text-2xl font-semibold">{user.username}</p>
              </div>
              <Badge className="bg-yellow-500 text-black text-lg px-4 py-2">
                {user.rank} • {user.elo} ELO
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/30 rounded-lg p-4">
                <p className="text-sm text-gray-400">Winrate</p>
                <p className="text-3xl font-bold">{winRate}%</p>
              </div>
              <div className="bg-black/30 rounded-lg p-4">
                <p className="text-sm text-gray-400">Thắng / Thua</p>
                <p className="text-3xl font-bold">
                  {user.wins}/{user.losses}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-300 mb-2">Tiến độ tới hạng tiếp theo</p>
              <Progress value={(user.elo % 200) / 2} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-400" />
              Hàng chờ rank
            </CardTitle>
            <CardDescription className="text-gray-300">
              Hệ thống sẽ ghép những người có điểm và tỷ lệ thắng tương đương
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {queueEntry ? (
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-gray-200">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang tìm đối thủ phù hợp...
                </div>
                <Button variant="secondary" onClick={cancelQueue} className="w-full">
                  Hủy hàng chờ
                </Button>
              </div>
            ) : (
              <Button className="w-full" onClick={startRanked} disabled={searching}>
                Bắt đầu đánh rank
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
