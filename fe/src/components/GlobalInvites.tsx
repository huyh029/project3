import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame, RoomInvite } from "../context/GameContext";
import { apiClient } from "../utils/apiClient";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Bell } from "lucide-react";

type InlineProps = {
  inline?: boolean;
};

export function GlobalInviteAlert({ inline = false }: InlineProps) {
  const { roomInvites, setRoomInvites, token, setGuestPendingRoom } = useGame();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!roomInvites.length) return null;
  const invite = roomInvites[0];

  const handleDismiss = () => {
    setRoomInvites(prev => prev.filter(item => item.id !== invite.id));
  };

  const handleAccept = async (target: RoomInvite) => {
    if (!token) {
      toast.error("Vui lòng đăng nhập để tham gia phòng");
      return;
    }
    setProcessingId(target.id);
    try {
      const response = await apiClient.post<{ room: any }>(
        `/rooms/prep/${target.roomId}/join`,
        {},
        token
      );
      if (response.room) {
        setGuestPendingRoom({
          roomId: response.room.roomId,
          hostId: response.room.hostPlayerId,
          hostName: target.hostName,
          timeLimit: response.room.timeLimit,
        });
        toast.info("Đã gửi yêu cầu, chờ chủ phòng xác nhận");
        setRoomInvites(prev => prev.filter(item => item.id !== target.id));
      }
      navigate("/online-lobby");
    } catch (err: any) {
      toast.error(err.message || "Không thể tham gia phòng");
    } finally {
      setProcessingId(null);
    }
  };

  const containerClass = inline
    ? "w-full"
    : "fixed bottom-4 right-4 z-50 max-w-sm w-full";

  const cardClass = inline
    ? "bg-white/5 border-white/15 text-white shadow-none backdrop-blur"
    : "bg-white shadow-lg";

  return (
    <div className={containerClass}>
      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-4 h-4 text-blue-500" />
            {invite.hostName} mời bạn chơi
          </CardTitle>
          <CardDescription>Mã phòng: {invite.roomId}</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() => handleAccept(invite)}
            disabled={processingId === invite.id}
          >
            {processingId === invite.id ? "Đang vào..." : "Tham gia"}
          </Button>
          <Button variant="outline" onClick={handleDismiss}>
            Để sau
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function GlobalGuestPendingBanner({ inline = false }: InlineProps) {
  const { guestPendingRoom, user, token, setGuestPendingRoom } = useGame();
  if (!guestPendingRoom) return null;

  const handleLeave = async () => {
    if (!token) {
      toast.error("Vui lòng đăng nhập");
      return;
    }
    try {
      await apiClient.post(`/rooms/prep/${guestPendingRoom.roomId}/leave`, {}, token);
      setGuestPendingRoom(null);
      toast.info("Đã rời khỏi phòng");
    } catch (err: any) {
      toast.error(err.message || "Không thể rời phòng");
    }
  };

  const containerClass = inline
    ? "w-full"
    : "fixed bottom-4 right-4 z-40 max-w-md w-full";

  const cardClass = inline
    ? "bg-purple-900/30 border-purple-400/30 backdrop-blur text-slate-900"
    : "bg-purple-50 border-purple-200 text-slate-900";

  return (
    <div className={containerClass}>
      <Card className={cardClass}>
        <CardHeader>
          <CardTitle>Đang chờ xác nhận</CardTitle>
          <CardDescription>
            Chủ phòng {guestPendingRoom.hostName} sẽ xác nhận trước khi trận đấu bắt đầu
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-lg shadow flex flex-col gap-1">
              <span className="text-sm text-gray-500">Chủ phòng</span>
              <span className="text-lg font-semibold">{guestPendingRoom.hostName}</span>
            </div>
            <div className="p-4 bg-white rounded-lg shadow flex flex-col gap-1">
              <span className="text-sm text-gray-500">Bạn</span>
              <span className="text-lg font-semibold">{user?.username || "Bạn"}</span>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            <strong>Thời gian:</strong>{" "}
            {guestPendingRoom.timeLimit < 0
              ? "Không giới hạn"
              : `${guestPendingRoom.timeLimit} phút`}
          </p>
          <div className="flex flex-col md:flex-row gap-3">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={handleLeave}
            >
              Rời phòng chờ
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}