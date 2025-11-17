import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import ChessBoard from "../components/ChessBoard";
import {
  initializeBoard,
  Board,
  Position,
  PieceColor,
  PieceType,
  makeMove,
} from "../utils/chessLogic";
import { useGame } from "../context/GameContext";
import { apiClient } from "../utils/apiClient";
import { toast } from "sonner";

const formatMoveNotation = (
  from: Position,
  to: Position,
  pieceType: string,
  promotionType?: PieceType
) => {
  const base = `${pieceType.toUpperCase()} ${String.fromCharCode(97 + from.col)}${
    8 - from.row
  } -> ${String.fromCharCode(97 + to.col)}${8 - to.row}`;
  if (promotionType && promotionType !== "pawn" && promotionType !== "king") {
    return `${base} = ${promotionType.toUpperCase()}`;
  }
  return base;
};

export default function LiveSpectate() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { token, socket } = useGame();

  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<Board>(() => initializeBoard());
  const [currentTurn, setCurrentTurn] = useState<PieceColor>("white");
  const [match, setMatch] = useState<any | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("playing");
  const finishHandledRef = useRef(false);

  const timeLimitLabel = useMemo(() => {
    if (!match) return "";
    return match.timeLimit < 0 ? "Không giới hạn" : `${match.timeLimit} phút`;
  }, [match]);

  const applyHistory = useCallback((moves: any[] = []) => {
    let nextBoard = initializeBoard();
    const history: string[] = [];
    moves.forEach((move) => {
      const from = move.from || move.fromPosition;
      const to = move.to || move.toPosition;
      if (!from || !to) return;
      const reachedEnd =
        typeof to.row === "number" && (to.row === 0 || to.row === 7);
      const promotionType =
        move.promotion ||
        ((move.piece === "pawn" || move.piece === "p") && reachedEnd
          ? ("queen" as PieceType)
          : undefined);
      nextBoard = makeMove(nextBoard, from, to, promotionType);
      history.push(formatMoveNotation(from, to, move.piece || "p", promotionType));
    });
    setBoard(nextBoard);
    setMoveHistory(history);
  }, []);

  const fetchDetail = useCallback(async () => {
    if (!token || !batchId) return;
    setLoading(true);
    try {
      const response = await apiClient.get<{ match: any }>(
        `/matches/${batchId}/detail`,
        token
      );
      setMatch(response.match);
      setStatus(response.match.status || "playing");
      setCurrentTurn(response.match.currentTurn || "white");
      applyHistory(response.match.moves);
    } catch (error: any) {
      toast.error(error.message || "Không thể tải thông tin trận đấu");
    } finally {
      setLoading(false);
    }
  }, [token, batchId, applyHistory]);

  useEffect(() => {
    if (!token) return;
    fetchDetail();
  }, [token, fetchDetail]);

  useEffect(() => {
    if (!socket || !batchId) return;
    socket.emit("joinBatch", batchId);

    const handleIncomingMove = (payload: { batchId: string; move: any }) => {
      if (payload.batchId !== batchId) return;
      const { move } = payload;
      if (!move?.from || !move?.to) return;
      setBoard((prev) => makeMove(prev, move.from, move.to, move.promotion));
      setMoveHistory((prev) => [
        ...prev,
        formatMoveNotation(move.from, move.to, move.piece, move.promotion),
      ]);
      setCurrentTurn(move.color === "white" ? ("black" as PieceColor) : ("white" as PieceColor));
    };

    const handleFinished = (payload: { batchId: string; winnerId?: string | null }) => {
      if (payload.batchId !== batchId) return;
      setStatus("finished");
      fetchDetail();
    };

    socket.on("batch:move", handleIncomingMove);
    socket.on("match:finished", handleFinished);
    return () => {
      socket.emit("leaveBatch", batchId);
      socket.off("batch:move", handleIncomingMove);
      socket.off("match:finished", handleFinished);
    };
  }, [socket, batchId, fetchDetail]);

  useEffect(() => {
    if (status !== "finished") {
      finishHandledRef.current = false;
      return;
    }
    if (!finishHandledRef.current) {
      toast.info("Trận đấu đã kết thúc, quay lại trang chủ.");
      finishHandledRef.current = true;
    }
    const timeout = setTimeout(() => {
      navigate("/home");
    }, 2000);
    return () => clearTimeout(timeout);
  }, [status, navigate]);

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-4 p-4 text-center">
        <p>Bạn cần đăng nhập để xem trận đấu trực tiếp.</p>
        <Button onClick={() => navigate("/")}>Về trang chủ</Button>
      </div>
    );
  }

  if (!batchId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/home")} className="text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Về trang chủ
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-200">
            <Loader2 className="w-5 h-5 animate-spin" />
            Đang tải thông tin trận đấu...
          </div>
        ) : !match ? (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Không tìm thấy trận đấu</CardTitle>
              <CardDescription className="text-gray-300">
                Trận đấu đã kết thúc hoặc bạn không có quyền truy cập.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/home")}>Quay về Home</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="bg-white/5 border-white/10 lg:col-span-1">
              <CardHeader>
                <CardTitle>Trạng thái trận đấu</CardTitle>
                <CardDescription className="text-gray-300">
                  {status === "finished" ? "Đã kết thúc" : "Đang diễn ra"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-200">
                <div className="flex justify-between">
                  <span>Chế độ</span>
                  <span>{match.type === "rank" ? "Rank" : "Online"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Thời gian</span>
                  <span>{timeLimitLabel}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span>Trắng</span>
                    <Badge className="bg-white/80 text-black">
                      {match.whitePlayer?.name || "Chưa rõ"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Đen</span>
                    <Badge className="bg-black/70 border-white/40 text-white">
                      {match.blackPlayer?.name || "Chưa rõ"}
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Lượt hiện tại</span>
                  <span className="capitalize">{currentTurn}</span>
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 flex flex-col gap-4 items-center">
              <ChessBoard
                board={board}
                onMove={() => {}}
                currentTurn={currentTurn}
                highlightedSquares={[]}
              />
              <Card className="w-full bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle>Lịch sử nước đi</CardTitle>
                </CardHeader>
                <CardContent className="max-h-64 overflow-y-auto text-sm space-y-1">
                  {moveHistory.length === 0
                    ? "Chưa có nước đi nào."
                    : moveHistory.map((move, index) => <div key={index}>{index + 1}. {move}</div>)}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
