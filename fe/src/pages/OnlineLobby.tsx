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
import { ArrowLeft, Users, Clock, Link as LinkIcon, Loader2, UserPlus, Copy } from "lucide-react";
import { useGame } from "../context/GameContext";
import { apiClient } from "../utils/apiClient";
import { toast } from "sonner";
import { fetchFriends, FriendRecord } from "../utils/friendApi";

const timeOptions = ["1", "3", "5", "10", "unlimited"];

type IncomingInvite = {
  id: string;
  roomId: string;
  hostName: string;
  timeLimit: number;
  createdAt: string;
};

export default function OnlineLobby() {
  const navigate = useNavigate();
  const { user, token, socket } = useGame();
  const [timeLimit, setTimeLimit] = useState("5");
  const [room, setRoom] = useState<any | null>(null);
  const [queueEntry, setQueueEntry] = useState<any | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendRecord | null>(null);
  const [pendingMatch, setPendingMatch] = useState<{
    batchId?: string;
    roomId?: string;
    opponent?: string;
    source: "room" | "queue";
    requiresConfirm?: boolean;
  } | null>(null);
  const [incomingInvites, setIncomingInvites] = useState<IncomingInvite[]>([]);
  const [guestPendingRoom, setGuestPendingRoom] = useState<{
    roomId: string;
    hostId: string;
    hostName: string;
    timeLimit: number;
  } | null>(null);

  const normalizedTime = useMemo(() => {
    if (timeLimit === "unlimited") return -1;
    return parseInt(timeLimit, 10);
  }, [timeLimit]);

  useEffect(() => {
    if (!token) return;
    setFriendsLoading(true);
    fetchFriends(token)
      .then(setFriends)
      .catch((err) => toast.error(err.message || "Không thể tải danh sách bạn bè"))
      .finally(() => setFriendsLoading(false));
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    const handleMatchCreated = (payload: { roomId: string; batchId: string }) => {
      if (guestPendingRoom && payload.roomId === guestPendingRoom.roomId) {
        setGuestPendingRoom(null);
      }
      if (room && payload.roomId === room.roomId) {
        toast.success("Phòng đã sẵn sàng, bấm bắt đầu để vào trận.");
        setPendingMatch({
          batchId: payload.batchId,
          roomId: payload.roomId,
          opponent: selectedFriend?.name || "Bạn bè",
          source: "room",
          requiresConfirm: false,
        });
      } else {
        setPendingMatch({
          batchId: payload.batchId,
          roomId: payload.roomId,
          opponent: 'Đối thủ',
          source: 'room',
          requiresConfirm: false,
        });
        if (guestPendingRoom && guestPendingRoom.roomId === payload.roomId) {
          setGuestPendingRoom(null);
          navigate('/game/online', { state: { batchId: payload.batchId } });
        }
      }
    };

    const handleMatchFound = (payload: { batchId: string; type: string }) => {
      if (payload.type !== "online") return;
      toast.success("Đã ghép được đối thủ, kiểm tra thông tin trước khi bắt đầu.");
      setQueueEntry(null);
      setPendingMatch({
        batchId: payload.batchId,
        opponent: "Đối thủ ngẫu nhiên",
        source: "queue",
        requiresConfirm: false,
      });
    };

    const handleGuestPending = (payload: {
      roomId: string;
      guestName: string;
      timeLimit: number;
      createdAt: string;
    }) => {
      toast.info(`${payload.guestName} muốn tham gia phòng ${payload.roomId}`);
      setPendingMatch({
        roomId: payload.roomId,
        opponent: payload.guestName,
        source: "room",
        requiresConfirm: true,
      });
    };

    const handleInvite = (payload: {
      roomId: string;
      hostName: string;
      timeLimit: number;
      createdAt: string;
    }) => {
      const id = `${payload.roomId}-${payload.createdAt}`;
      setIncomingInvites((prev) => {
        if (prev.some((invite) => invite.id === id)) {
          return prev;
        }
        toast.info(`${payload.hostName} mời bạn vào phòng ${payload.roomId}`);
        return [
          ...prev,
          {
            id,
            roomId: payload.roomId,
            hostName: payload.hostName,
            timeLimit: payload.timeLimit,
            createdAt: payload.createdAt,
          },
        ];
      });
    };

    socket.on("match:created", handleMatchCreated);
    socket.on("match:found", handleMatchFound);
    socket.on("room:guestPending", handleGuestPending);
    socket.on("room:invite", handleInvite);

    return () => {
      socket.off("match:created", handleMatchCreated);
      socket.off("match:found", handleMatchFound);
      socket.off("room:guestPending", handleGuestPending);
      socket.off("room:invite", handleInvite);
    };
  }, [socket, room, navigate, selectedFriend, guestPendingRoom]);

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
    if (!requireAuth()) return null;
    setLoading(true);
    try {
      const response = await apiClient.post<{ room: any }>(
        "/rooms/prep",
        { matchType: "online", timeLimit: normalizedTime },
        token
      );
      setRoom(response.room);
      toast.success(`Đã tạo phòng, mã: ${response.room.roomId}`);
      return response.room;
    } catch (error: any) {
      toast.error(error.message || "Không thể tạo phòng");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const cancelRoom = async () => {
    if (!room || !token) return;
    try {
      await apiClient.post(`/rooms/prep/${room.roomId}/cancel`, {}, token);
      setRoom(null);
      setSelectedFriend(null);
    } catch (error: any) {
      toast.error(error.message || "Không thể hủy phòng");
    }
  };

  const joinRoomWithCode = async (code: string) => {
    if (!requireAuth() || !code.trim()) return null;
    setLoading(true);
    try {
      const response = await apiClient.post<{ room: any }>(
        `/rooms/prep/${code}/join`,
        {},
        token
      );
      if (response.room) {
        const hostName =
          friends.find((f) => f._id === response.room.hostPlayerId)?.name ||
          "Chủ phòng";
        setGuestPendingRoom({
          roomId: response.room.roomId,
          hostId: response.room.hostPlayerId,
          hostName,
          timeLimit: response.room.timeLimit,
        });
        toast.info("Đã gửi yêu cầu, hãy chờ chủ phòng xác nhận.");
      }
      return response.room || null;
    } catch (error: any) {
      toast.error(error.message || "Không thể tham gia phòng");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!joinCode.trim()) {
      toast.error("Nhập mã phòng trước khi tham gia");
      return;
    }
    await joinRoomWithCode(joinCode.trim());
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

  const handleInviteFriend = async (friend: FriendRecord) => {
    if (!requireAuth()) return;
    let activeRoom = room;
    if (!activeRoom) {
      activeRoom = await createRoom();
      if (!activeRoom) return;
    }
    setSelectedFriend(friend);
    const code = activeRoom.roomId;
    try {
      await apiClient.post(
        `/rooms/prep/${activeRoom.roomId}/invite`,
        { friendId: friend._id },
        token
      );
      toast.success(`Đã gửi lời mời cho ${friend.name}`);
    } catch (err: any) {
      toast.error(err.message || "Không thể gửi lời mời");
      return;
    }
    handleCopyRoomCode(code);
  };

  const handleStartPendingMatch = async () => {
    if (!pendingMatch) return;
    if (pendingMatch.requiresConfirm && pendingMatch.roomId) {
      if (!token) {
        toast.error("Vui lòng đăng nhập");
        return;
      }
      try {
        const response = await apiClient.post(
          `/rooms/prep/${pendingMatch.roomId}/confirm`,
          {},
          token
        );
        setPendingMatch({
          batchId: response.batch?._id,
          roomId: pendingMatch.roomId,
          opponent: pendingMatch.opponent,
          source: pendingMatch.source,
          requiresConfirm: false,
        });
        navigate("/game/online", { state: { batchId: response.batch?._id } });
        setPendingMatch(null);
      } catch (err: any) {
        toast.error(err.message || "Không thể xác nhận phòng");
      }
      return;
    }
    if (pendingMatch.batchId) {
      navigate("/game/online", { state: { batchId: pendingMatch.batchId } });
      setPendingMatch(null);
    }
  };

  const handleDismissPendingMatch = async () => {
    if (pendingMatch?.requiresConfirm && pendingMatch.roomId) {
      try {
        await apiClient.post(
          `/rooms/prep/${pendingMatch.roomId}/kick`,
          {},
          token || undefined
        );
      } catch (err: any) {
        console.warn("Kick guest failed:", err.message);
      }
    }
    setPendingMatch(null);
  };

  const handleCopyRoomCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Đã sao chép mã phòng ${code}`);
    } catch {
      toast.success(`Mã phòng của bạn: ${code}`);
    }
  };

  const handleAcceptInvite = async (invite: IncomingInvite) => {
    const joined = await joinRoomWithCode(invite.roomId);
    if (joined) {
      setIncomingInvites((prev) => prev.filter((item) => item.id !== invite.id));
    }
  };

  const handleDismissInvite = (inviteId: string) => {
    setIncomingInvites((prev) => prev.filter((item) => item.id !== inviteId));
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 text-white hover:bg-white/10"
                          onClick={() => handleCopyRoomCode(room.roomId)}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Sao chép mã
                        </Button>
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

        {pendingMatch && (
          <Card className="bg-green-50 border-green-200 text-slate-900">
            <CardHeader>
              <CardTitle>Phòng sẵn sàng</CardTitle>
              <CardDescription>
                Kiểm tra lại người chơi trước khi bắt đầu để tránh nhầm người.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-lg shadow flex flex-col gap-1">
                  <span className="text-sm text-gray-500">Bạn</span>
                  <span className="text-lg font-semibold">{user?.username || "Bạn"}</span>
                </div>
                <div className="p-4 bg-white rounded-lg shadow flex flex-col gap-1">
                  <span className="text-sm text-gray-500">Đối thủ</span>
                  <span className="text-lg font-semibold">
                    {pendingMatch.opponent || "Đang xác định"}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Nguồn ghép: {pendingMatch.source === "room" ? "Phòng bạn bè" : "Ghép ngẫu nhiên"}
              </p>
              <div className="flex flex-col md:flex-row gap-3">
                <Button className="flex-1" onClick={handleStartPendingMatch}>
                  Bắt đầu trận
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleDismissPendingMatch}>
                  Để sau
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {guestPendingRoom && (
          <Card className="bg-white/5 border-blue-300/30 text-white">
            <CardHeader>
              <CardTitle>Đang chờ chủ phòng xác nhận</CardTitle>
              <CardDescription className="text-gray-300">
                Chủ phòng {guestPendingRoom.hostName} sẽ xác nhận trước khi trận đấu bắt đầu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white/10 rounded-lg">
                  <p className="text-xs text-gray-300">Chủ phòng</p>
                  <p className="text-xl font-semibold">{guestPendingRoom.hostName}</p>
                </div>
                <div className="p-4 bg-white/10 rounded-lg">
                  <p className="text-xs text-gray-300">Bạn</p>
                  <p className="text-xl font-semibold">{user?.username || "Bạn"}</p>
                </div>
              </div>
              <p className="text-sm text-gray-300">
                Thời gian:{" "}
                {guestPendingRoom.timeLimit < 0
                  ? "Không giới hạn"
                  : `${guestPendingRoom.timeLimit} phút`}
              </p>
              <p className="text-sm text-gray-400">
                Nếu chủ phòng từ chối, lời mời sẽ biến mất.
              </p>
            </CardContent>
          </Card>
        )}

        {incomingInvites.length > 0 && (
          <Card className="bg-white/5 border-green-300/30 text-white">
            <CardHeader>
              <CardTitle>Lời mời đang chờ</CardTitle>
              <CardDescription className="text-gray-300">
                Bạn bè đang chờ bạn tham gia phòng của họ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {incomingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-lg border border-white/10 bg-white/5"
                >
                  <div>
                    <p className="font-semibold">{invite.hostName}</p>
                    <p className="text-sm text-gray-300">
                      Mã phòng: <span className="font-mono">{invite.roomId}</span> •{" "}
                      {invite.timeLimit < 0 ? "Không giới hạn" : `${invite.timeLimit} phút`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-500 hover:bg-green-600"
                      onClick={() => handleAcceptInvite(invite)}
                    >
                      Tham gia
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-white border-white/40"
                      onClick={() => handleDismissInvite(invite.id)}
                    >
                      Để sau
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/5 border-white/10 text-white">
          <CardHeader>
            <CardTitle>Bạn bè trực tuyến</CardTitle>
            <CardDescription className="text-gray-300">
              Mời bạn cùng chơi bằng cách gửi mã phòng chuẩn bị
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {friendsLoading ? (
              <p className="text-gray-400">Đang tải danh sách bạn bè...</p>
            ) : !token ? (
              <p className="text-gray-400">Đăng nhập để thấy danh sách bạn bè.</p>
            ) : friends.length === 0 ? (
              <p className="text-gray-400">Chưa có bạn bè nào. Hãy gửi lời mời kết bạn ở trang Hồ sơ.</p>
            ) : (
              <div className="space-y-3">
                {friends.map((friend) => (
                  <div
                    key={friend._id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      selectedFriend?._id === friend._id ? "border-yellow-400 bg-white/10" : "border-white/10"
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{friend.name}</p>
                      <p className="text-xs text-gray-400">{friend.email}</p>
                      <p className="text-xs text-gray-400">
                        {friend.rank} • ELO {friend.rating}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-white border-white/40"
                      onClick={() => handleInviteFriend(friend)}
                      disabled={!token}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Mời
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
