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
import { Input } from "../components/ui/input";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Label } from "../components/ui/label";
import { ArrowLeft, Users, Clock, Link as LinkIcon, Loader2 } from "lucide-react";
import { useGame } from "../context/GameContext";
import { apiClient } from "../utils/apiClient";
import { toast } from "sonner";

const timeOptions = ["1", "3", "5", "10", "unlimited"];

export default function OnlineLobby() {
  const navigate = useNavigate();
  const { user, token, socket } = useGame();
  const [timeLimit, setTimeLimit] = useState("5");
  const [room, setRoom] = useState<any | null>(null);
  const [queueEntry, setQueueEntry] = useState<any | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const normalizedTime = useMemo(() => {
    if (timeLimit === "unlimited") return -1;
    return parseInt(timeLimit, 10);
  }, [timeLimit]);

  useEffect(() => {
    if (!socket) return;

    const handleMatchCreated = (payload: { roomId: string; batchId: string }) => {
      if (room && payload.roomId === room.roomId) {
        toast.success("Phòng đầy đủ người chơi, chuyển sang trận đấu!");
        navigate("/game/online", { state: { batchId: payload.batchId } });
      }
    };

    const handleMatchFound = (payload: { batchId: string; type: string }) => {
      if (payload.type !== "online") return;
      toast.success("Đã tìm thấy đối thủ!");
      setQueueEntry(null);
      navigate("/game/online", { state: { batchId: payload.batchId } });
    };

    socket.on("match:created", handleMatchCreated);
    socket.on("match:found", handleMatchFound);

    return () => {
      socket.off("match:created", handleMatchCreated);
      socket.off("match:found", handleMatchFound);
    };
  }, [socket, room, navigate]);

  useEffect(() => {
    return () => {
      if (queueEntry && token) {
        apiClient
          .delete(`/queue/${queueEntry._id}`, token)
          .catch(() => {});
      }
    };
  }, [queueEntry, token]);

  const requireAuth = () => {
    if (!token) {
      toast.error("Vui lòng đăng nhập để sử dụng chức năng này");
      return false;
    }
    return true;
  };

  const createRoom = async () => {
    if (!requireAuth()) return;
    setLoading(true);
    try {
      const response = await apiClient.post<{ room: any }>(
        "/rooms/prep",
        { matchType: "online", timeLimit: normalizedTime },
        token
      );
      setRoom(response.room);
      toast.success(`Đã tạo phòng, mã: ${response.room.roomId}`);
    } catch (error: any) {
      toast.error(error.message || "Không thể tạo phòng");
    } finally {
      setLoading(false);
    }
  };

  const cancelRoom = async () => {
    if (!room || !token) return;
    try {
      await apiClient.post(`/rooms/prep/${room.roomId}/cancel`, {}, token);
      setRoom(null);
    } catch (error: any) {
      toast.error(error.message || "Không thể hủy phòng");
    }
  };

  const joinRoom = async () => {
    if (!requireAuth() || !joinCode.trim()) return;
    setLoading(true);
    try {
      const response = await apiClient.post<{ batch?: any }>(
        `/rooms/prep/${joinCode}/join`,
        {},
        token
      );
      if (response.batch?._id) {
        toast.success("Vào phòng thành công!");
        navigate("/game/online", { state: { batchId: response.batch._id } });
      } else {
        toast.info("Đang chờ chủ phòng bắt đầu");
      }
    } catch (error: any) {
      toast.error(error.message || "Không thể tham gia phòng");
    } finally {
      setLoading(false);
    }
  };

  const startQueue = async () => {
    if (!requireAuth()) return;
    setLoading(true);
    try {
      const response = await apiClient.post<{ entry: any }>(
        "/queue",
        { type: "online", timeLimit: normalizedTime },
        token
      );
      setQueueEntry(response.entry);
      setStatusMessage("Đang tìm đối thủ phù hợp...");
      toast.success("Đã tham gia hàng chờ");
    } catch (error: any) {
      toast.error(error.message || "Không thể vào hàng chờ");
    } finally {
      setLoading(false);
    }
  };

  const cancelQueue = async () => {
    if (!queueEntry || !token) return;
    try {
      await apiClient.delete(`/queue/${queueEntry._id}`, token);
      setQueueEntry(null);
      setStatusMessage(null);
    } catch (error: any) {
      toast.error(error.message || "Không thể hủy hàng chờ");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <Button variant="outline" onClick={() => navigate("/home")} className="text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Về trang chủ
        </Button>

        <Card className="bg-white/5 border-white/10 text-white">
          <CardHeader>
            <CardTitle>Chế độ Online</CardTitle>
            <CardDescription className="text-gray-300">
              Mời bạn bè bằng mã phòng hoặc ghép ngẫu nhiên
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-lg bg-white/10 p-4">
              <div>
                <p className="text-sm text-gray-400">Người chơi</p>
                <p className="text-xl font-semibold">{user?.username || "Khách"}</p>
              </div>
              <Badge className="bg-yellow-500 text-black">
                {user ? `${user.rank} • ${user.elo} ELO` : "Guest"}
              </Badge>
            </div>

            <div>
              <Label className="mb-2 block text-gray-300">Thời gian mỗi lượt</Label>
              <RadioGroup
                value={timeLimit}
                onValueChange={setTimeLimit}
                className="grid grid-cols-2 md:grid-cols-5 gap-2"
              >
                {timeOptions.map((option) => (
                  <Label
                    key={option}
                    htmlFor={`time-${option}`}
                    className={`flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 cursor-pointer ${
                      timeLimit === option ? "bg-white/20" : ""
                    }`}
                  >
                    <RadioGroupItem value={option} id={`time-${option}`} />
                    {option === "unlimited" ? "Không giới hạn" : `${option} phút`}
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-black/30 border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="w-5 h-5" />
                    Phòng chuẩn bị
                  </CardTitle>
                  <CardDescription>
                    Tạo phòng để mời bạn bè tham gia bằng mã gồm 6 chữ số
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {room ? (
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-sm text-gray-400">Mã phòng</p>
                        <p className="text-3xl font-semibold tracking-widest">{room.roomId}</p>
                      </div>
                      <Button variant="secondary" className="w-full" onClick={cancelRoom}>
                        Hủy phòng
                      </Button>
                    </div>
                  ) : (
                    <Button className="w-full" onClick={createRoom} disabled={loading}>
                      Tạo phòng mới
                    </Button>
                  )}

                  <div className="space-y-2">
                    <Label>Tham gia phòng bằng mã</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nhập mã phòng"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                      />
                      <Button onClick={joinRoom} disabled={loading}>
                        Vào
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/30 border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Tìm đối thủ ngẫu nhiên
                  </CardTitle>
                  <CardDescription>Hệ thống sẽ ghép bạn với người chơi bất kỳ</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {queueEntry ? (
                    <div className="space-y-3 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-300">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {statusMessage || "Đang tìm trận..."}
                      </div>
                      <Button variant="secondary" className="w-full" onClick={cancelQueue}>
                        Hủy hàng chờ
                      </Button>
                    </div>
                  ) : (
                    <Button className="w-full" onClick={startQueue} disabled={loading}>
                      Bắt đầu tìm đối thủ
                    </Button>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Clock className="w-4 h-4" />
                    Thời gian ưu tiên: {timeLimit === "unlimited" ? "Không giới hạn" : `${timeLimit} phút`}
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
