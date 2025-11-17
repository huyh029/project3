import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Play, Pause, StepBack, StepForward, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import ChessBoard from "../components/ChessBoard";
import { Board, Position, initializeBoard, makeMove } from "../utils/chessLogic";
import { apiClient } from "../utils/apiClient";
import { useGame } from "../context/GameContext";
import { toast } from "sonner";

interface PlayerSummary {
  id?: string;
  name?: string;
  rating?: number;
  rank?: string;
}

interface ReplayMove {
  moveNumber: number;
  color: "white" | "black";
  piece: string;
  from: Position;
  to: Position;
  notation?: string;
}

interface MatchDetail {
  id: string;
  type: string;
  status: string;
  timeLimit: number;
  whitePlayer: PlayerSummary | null;
  blackPlayer: PlayerSummary | null;
  winnerId: string | null;
  finishedReason: string | null;
  createdAt: string;
  moves: ReplayMove[];
}

export default function MatchReplay() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const { token } = useGame();

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [board, setBoard] = useState<Board>(() => initializeBoard());
  const [highlightedSquares, setHighlightedSquares] = useState<Position[]>([]);
  const [autoplay, setAutoplay] = useState(false);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  const totalMoves = match?.moves.length || 0;

  const currentTurn = useMemo<"white" | "black">(() => {
    return currentMoveIndex % 2 === 0 ? "white" : "black";
  }, [currentMoveIndex]);

  const rebuildBoard = (matchData: MatchDetail | null, moveIndex: number) => {
    if (!matchData) {
      setBoard(initializeBoard());
      setHighlightedSquares([]);
      return;
    }
    let nextBoard = initializeBoard();
    let lastFrom: Position | null = null;
    let lastTo: Position | null = null;
    for (let i = 0; i < moveIndex && i < matchData.moves.length; i += 1) {
      const move = matchData.moves[i];
      if (!move.from || !move.to) continue;
      nextBoard = makeMove(nextBoard, move.from, move.to);
      lastFrom = move.from;
      lastTo = move.to;
    }
    setBoard(nextBoard);
    setHighlightedSquares(lastFrom && lastTo ? [lastFrom, lastTo] : []);
  };

  const fetchDetail = useCallback(async () => {
    if (!batchId || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient.get<{ match: MatchDetail }>(
        `/matches/${batchId}/detail`,
        token
      );
      setMatch(response.match);
      setCurrentMoveIndex(0);
      rebuildBoard(response.match, 0);
    } catch (err: any) {
      toast.error(err.message || "Không thể tải dữ liệu trận đấu");
    } finally {
      setLoading(false);
    }
  }, [batchId, token]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    rebuildBoard(match, currentMoveIndex);
  }, [match, currentMoveIndex]);

  useEffect(() => {
    if (!autoplay || !match) return;
    autoplayRef.current = setInterval(() => {
      setCurrentMoveIndex((prev) => {
        if (prev >= totalMoves) {
          setAutoplay(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);
    return () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
        autoplayRef.current = null;
      }
    };
  }, [autoplay, match, totalMoves]);

  const goToMove = (index: number) => {
    if (!match) return;
    const bounded = Math.min(Math.max(index, 0), totalMoves);
    setCurrentMoveIndex(bounded);
  };

  const handlePrev = () => goToMove(currentMoveIndex - 1);
  const handleNext = () => goToMove(currentMoveIndex + 1);

  const toggleAutoplay = () => {
    if (!match) return;
    if (currentMoveIndex >= totalMoves) {
      setCurrentMoveIndex(0);
    }
    setAutoplay((prev) => !prev);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-4">
        <p>Bạn cần đăng nhập để xem lại trận đấu.</p>
        <Button onClick={() => navigate("/")}>Về trang chủ</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 text-white">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} className="text-white border-white/40">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
          <h1 className="text-2xl font-semibold">Xem lại trận đấu</h1>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-300">
            <Loader2 className="w-5 h-5 animate-spin" />
            Đang tải dữ liệu trận đấu...
          </div>
        ) : !match ? (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Không tìm thấy trận đấu</CardTitle>
              <CardDescription className="text-gray-300">
                Mã trận không hợp lệ hoặc bạn không có quyền truy cập.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle>Bàn cờ</CardTitle>
                  <CardDescription className="text-gray-300">
                    Di chuyển qua từng nước để xem lại diễn biến trận đấu.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  <ChessBoard
                    board={board}
                    onMove={() => {}}
                    currentTurn={currentTurn}
                    highlightedSquares={highlightedSquares}
                  />
                  <div className="w-full space-y-3">
                    <div className="flex items-center justify-between text-sm text-gray-300">
                      <span>Nước {currentMoveIndex}/{totalMoves}</span>
                      <span>
                        Lượt hiện tại: {currentTurn === "white" ? "Trắng" : "Đen"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={totalMoves}
                      value={currentMoveIndex}
                      onChange={(e) => goToMove(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex items-center justify-center gap-3">
                      <Button variant="outline" size="sm" onClick={() => goToMove(0)}>
                        Đầu trận
                      </Button>
                      <Button variant="outline" size="sm" onClick={handlePrev} disabled={currentMoveIndex === 0}>
                        <StepBack className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={toggleAutoplay} disabled={totalMoves === 0}>
                        {autoplay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNext}
                        disabled={currentMoveIndex >= totalMoves}
                      >
                        <StepForward className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => goToMove(totalMoves)}>
                        Cuối trận
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle>Thông tin trận đấu</CardTitle>
                    <CardDescription className="text-gray-300">
                      {new Date(match.createdAt).toLocaleString("vi-VN")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Trắng</p>
                        <p className="text-lg font-semibold">{match.whitePlayer?.name || "Ẩn danh"}</p>
                        <p className="text-sm text-gray-400">
                          {match.whitePlayer?.rank} • {match.whitePlayer?.rating} ELO
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 text-right">Đen</p>
                        <p className="text-lg font-semibold text-right">
                          {match.blackPlayer?.name || "Ẩn danh"}
                        </p>
                        <p className="text-sm text-gray-400 text-right">
                          {match.blackPlayer?.rank} • {match.blackPlayer?.rating} ELO
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-300">
                      <p>Chế độ: {match.type === "rank" ? "Rank" : match.type === "online" ? "Online" : match.type}</p>
                      <p>Thời gian: {match.timeLimit < 0 ? "Không giới hạn" : `${match.timeLimit} phút`}</p>
                      <p>
                        Kết quả:{" "}
                        {match.winnerId
                          ? match.whitePlayer?.id === match.winnerId
                            ? "Trắng thắng"
                            : "Đen thắng"
                          : "Hòa"}
                      </p>
                      {match.finishedReason && <p>Lý do kết thúc: {match.finishedReason}</p>}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle>Danh sách nước đi</CardTitle>
                    <CardDescription className="text-gray-300">
                      Bấm vào từng dòng để nhảy tới nước tương ứng.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="max-h-96 overflow-y-auto space-y-2">
                    {match.moves.length === 0 ? (
                      <p className="text-gray-400 text-sm">Chưa ghi nhận nước đi nào.</p>
                    ) : (
                      match.moves.map((move, index) => (
                        <button
                          key={`${move.moveNumber}-${move.color}-${index}`}
                          onClick={() => goToMove(index + 1)}
                          className={`w-full text-left px-3 py-2 rounded border ${
                            currentMoveIndex === index + 1
                              ? "border-yellow-400 bg-white/10"
                              : "border-white/10 hover:bg-white/5"
                          }`}
                        >
                          <div className="flex justify-between text-sm">
                            <span>
                              #{move.moveNumber} • {move.color === "white" ? "Trắng" : "Đen"}
                            </span>
                            <span>
                              {String.fromCharCode(97 + move.from.col)}
                              {8 - move.from.row} → {String.fromCharCode(97 + move.to.col)}
                              {8 - move.to.row}
                            </span>
                          </div>
                          {move.notation && (
                            <p className="text-xs text-gray-400 mt-1">{move.notation}</p>
                          )}
                        </button>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
