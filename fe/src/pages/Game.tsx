import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import ChessBoard from "../components/ChessBoard";
import {
  initializeBoard,
  Board,
  Position,
  makeMove,
  getRandomMove,
  isKingInCheck,
  PieceColor,
} from "../utils/chessLogic";
import { ArrowLeft, Flag, RotateCcw, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { useGame } from "../context/GameContext";
import { apiClient } from "../utils/apiClient";
import { toast } from "sonner";

const formatMoveNotation = (from: Position, to: Position, pieceType: string) =>
  `${pieceType.toUpperCase()} ${String.fromCharCode(97 + from.col)}${8 - from.row} → ${String.fromCharCode(
    97 + to.col
  )}${8 - to.row}`;

export default function Game() {
  const { mode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, socket } = useGame();
  const locationState = (location.state as Record<string, any>) || {};

  const [board, setBoard] = useState<Board>(() => initializeBoard());
  const [currentTurn, setCurrentTurn] = useState<PieceColor>("white");
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<PieceColor | "draw" | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [batchId, setBatchId] = useState<string | null>(locationState.batchId || null);
  const [matchInfo, setMatchInfo] = useState<any | null>(null);
  const [playerColor, setPlayerColor] = useState<PieceColor | undefined>(
    mode === "ai" ? "white" : undefined
  );
  const [difficulty, setDifficulty] = useState<string>(locationState.difficulty || "normal");
  const defaultTime = locationState.timeLimit || (mode === "ranked" ? "10" : "5");
  const normalizedTime = defaultTime === "unlimited" ? -1 : parseInt(defaultTime, 10) || 10;
  const initialClock = normalizedTime > 0 ? normalizedTime * 60 : null;
  const [whiteTime, setWhiteTime] = useState<number | null>(initialClock);
  const [blackTime, setBlackTime] = useState<number | null>(initialClock);
  const isNetworkMatch = useMemo(
    () => Boolean(batchId && (mode === "online" || mode === "ranked")),
    [batchId, mode]
  );
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetBoard = () => {
    setBoard(initializeBoard());
    setCurrentTurn("white");
    setMoveHistory([]);
    setGameOver(false);
    setWinner(null);
    setWhiteTime(initialClock);
    setBlackTime(initialClock);
  };

  const assignPlayerColor = useCallback(
    (batch: any) => {
      if (!user) return;
      if (batch.whitePlayerId && batch.whitePlayerId.toString() === user.id) {
        setPlayerColor("white");
      } else if (batch.blackPlayerId && batch.blackPlayerId.toString() === user.id) {
        setPlayerColor("black");
      } else {
        setPlayerColor(undefined);
      }
    },
    [user]
  );

  const applyHistory = (moves: any[] = []) => {
    let nextBoard = initializeBoard();
    const history: string[] = [];
    moves.forEach((move) => {
      const from = move.from || move.fromPosition;
      const to = move.to || move.toPosition;
      if (!from || !to) return;
      nextBoard = makeMove(nextBoard, from, to);
      history.push(formatMoveNotation(from, to, move.piece || "p"));
    });
    setBoard(nextBoard);
    setMoveHistory(history);
  };

  const fetchMatch = useCallback(
    async (id: string) => {
      if (!token) return;
      try {
        const response = await apiClient.get<{ batch: any }>(`/matches/${id}`, token);
        setMatchInfo(response.batch);
        assignPlayerColor(response.batch);
        applyHistory(response.batch.moves);
        setCurrentTurn(response.batch.currentTurn || "white");
      } catch (error: any) {
        toast.error(error.message || "Không thể tải thông tin trận đấu");
      }
    },
    [token, assignPlayerColor]
  );

  const createBotMatch = async () => {
    if (!token) return;
    try {
      const response = await apiClient.post<{ batch: any }>(
        "/matches/bot",
        { timeLimit: normalizedTime, botLevel: difficulty },
        token
      );
      setBatchId(response.batch._id);
      setMatchInfo(response.batch);
    } catch (error: any) {
      toast.error(error.message || "Không thể tạo trận đấu với máy");
    }
  };

  const createLocalMatch = async () => {
    if (!token) return;
    try {
      const response = await apiClient.post<{ batch: any }>(
        "/matches/local",
        { timeLimit: normalizedTime },
        token
      );
      setBatchId(response.batch._id);
      setMatchInfo(response.batch);
    } catch (error: any) {
      toast.error(error.message || "Không thể tạo trận đấu local");
    }
  };

  useEffect(() => {
    if (!token) return;
    if (mode === "ai") {
      createBotMatch();
    } else if (mode === "local") {
      createLocalMatch();
    } else if ((mode === "online" || mode === "ranked") && !locationState.batchId) {
      toast.error("Không tìm thấy trận đấu. Hãy vào từ lobby.");
      navigate("/home");
    }
  }, [mode, token, difficulty, normalizedTime]);

  useEffect(() => {
    if (batchId && (mode === "online" || mode === "ranked")) {
      fetchMatch(batchId);
    }
  }, [batchId, mode, fetchMatch]);

  useEffect(() => {
    if (!socket || !isNetworkMatch || !batchId) return;
    socket.emit("joinBatch", batchId);
    const handleMove = (payload: { batchId: string; move: any }) => {
      if (payload.batchId !== batchId) return;
      const move = payload.move;
      if (!move?.from || !move?.to) return;
      setBoard((prev) => makeMove(prev, move.from, move.to));
      setMoveHistory((prev) => [...prev, formatMoveNotation(move.from, move.to, move.piece)]);
      setCurrentTurn(move.color === "white" ? "black" : "white");
    };
    socket.on("batch:move", handleMove);
    return () => {
      socket.emit("leaveBatch", batchId);
      socket.off("batch:move", handleMove);
    };
  }, [socket, isNetworkMatch, batchId]);

  useEffect(() => {
    if (gameOver) return;
    if (mode !== "ai") return;
    if (currentTurn === "black") {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = setTimeout(() => {
        makeAIMove();
      }, difficulty === "easy" ? 500 : difficulty === "hard" ? 1500 : 1000);
    }
    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, [currentTurn, mode, difficulty, gameOver]);

  useEffect(() => {
    if (gameOver) return;
    if (initialClock === null) return;

    const interval = setInterval(() => {
      setWhiteTime((prev) => {
        if (currentTurn !== "white" || prev === null) return prev;
        if (prev <= 0) {
          handleGameEnd("black");
          return 0;
        }
        return prev - 1;
      });
      setBlackTime((prev) => {
        if (currentTurn !== "black" || prev === null) return prev;
        if (prev <= 0) {
          handleGameEnd("white");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentTurn, gameOver, initialClock]);

  const sendMoveToServer = async (from: Position, to: Position, piece: any) => {
    if (!batchId || !token) return;
    await apiClient.post(
      "/batch/add-move",
      {
        batchId,
        from,
        to,
        piece: piece.type,
        color: piece.color,
      },
      token
    );
  };

  const applyLocalMove = (from: Position, to: Position, piece: any) => {
    setBoard((prev) => makeMove(prev, from, to));
    setMoveHistory((prev) => [...prev, formatMoveNotation(from, to, piece.type)]);
    setCurrentTurn((prev) => (prev === "white" ? "black" : "white"));
  };

  const handleMove = async (from: Position, to: Position) => {
    if (gameOver) return;
    const piece = board[from.row][from.col];
    if (!piece) return;

    if (isNetworkMatch) {
      if (!token) {
        toast.error("Cần đăng nhập để chơi online");
        return;
      }
      if (playerColor && piece.color !== playerColor) return;
      if (piece.color !== currentTurn) return;
      try {
        await sendMoveToServer(from, to, piece);
      } catch (error: any) {
        toast.error(error.message || "Không thể gửi nước đi");
      }
      return;
    }

    applyLocalMove(from, to, piece);
    if (batchId && token) {
      try {
        await sendMoveToServer(from, to, piece);
      } catch {
        // ignore errors for local matches
      }
    }
  };

  const makeAIMove = () => {
    const move = getRandomMove(board, "black");
    if (!move) {
      if (isKingInCheck(board, "black")) {
        handleGameEnd("white");
      } else {
        handleGameEnd("draw");
      }
      return;
    }
    const piece = board[move.from.row][move.from.col];
    if (!piece) return;
    applyLocalMove(move.from, move.to, piece);
    if (batchId && token) {
      sendMoveToServer(move.from, move.to, piece).catch(() => {});
    }
  };

  const finishMatch = async (result: PieceColor | "draw") => {
    if (!batchId || !token || !matchInfo) return;
    const winnerId =
      result === "draw"
        ? null
        : result === "white"
        ? matchInfo.whitePlayerId
        : matchInfo.blackPlayerId;
    try {
      await apiClient.post(
        `/matches/${batchId}/finish`,
        { winnerId, reason: result === "draw" ? "draw" : "checkmate" },
        token
      );
    } catch {
      // ignore finish errors
    }
  };

  const handleGameEnd = (result: PieceColor | "draw") => {
    if (gameOver) return;
    setGameOver(true);
    setWinner(result);
    finishMatch(result);
  };

  const handleResign = () => {
    handleGameEnd(currentTurn === "white" ? "black" : "white");
  };

  const handleRematch = () => {
    if (mode === "online" || mode === "ranked") {
      navigate("/home");
      return;
    }
    resetBoard();
    if (mode === "ai") {
      createBotMatch();
    } else if (mode === "local") {
      createLocalMatch();
    }
  };

  const formatTime = (value: number | null) => {
    if (value === null) return "∞";
    const minutes = Math.floor(value / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor(value % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  if (!mode) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 text-white">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/home")} className="text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Về trang chủ
          </Button>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-300">Trắng</p>
              <p className="text-2xl">{formatTime(whiteTime)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-300">Đen</p>
              <p className="text-2xl">{formatTime(blackTime)}</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <Card className="bg-white/10 border-white/10">
              <CardHeader>
                <CardTitle>Thông tin trận</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-200">
                <div className="flex justify-between">
                  <span>Chế độ</span>
                  <span>{mode}</span>
                </div>
                <div className="flex justify-between">
                  <span>Thời gian</span>
                  <span>{normalizedTime < 0 ? "Không giới hạn" : `${normalizedTime} phút`}</span>
                </div>
                {playerColor && (
                  <div className="flex justify-between">
                    <span>Màu của bạn</span>
                    <Badge className="bg-yellow-500 text-black">{playerColor}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/10">
              <CardHeader>
                <CardTitle>Điều khiển</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="destructive" className="w-full" onClick={handleResign} disabled={gameOver}>
                  <Flag className="w-4 h-4 mr-2" />
                  Đầu hàng
                </Button>
                <Button variant="outline" className="w-full" onClick={handleRematch}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Chơi lại
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/10">
              <CardHeader>
                <CardTitle>Lịch sử nước đi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto space-y-1 text-sm">
                  {moveHistory.length === 0
                    ? "Chưa có nước đi nào"
                    : moveHistory.map((move, index) => <div key={index}>{index + 1}. {move}</div>)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 flex justify-center">
            <ChessBoard
              board={board}
              onMove={handleMove}
              currentTurn={currentTurn}
              playerColor={playerColor}
            />
          </div>
        </div>
      </div>

      {gameOver && (
        <Dialog open={gameOver} onOpenChange={() => {}}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center text-2xl">
                {winner === "draw"
                  ? "Ván đấu hòa!"
                  : winner === "white"
                  ? "Trắng chiến thắng!"
                  : "Đen chiến thắng!"}
              </DialogTitle>
              <DialogDescription className="text-center">
                Cảm ơn bạn đã chơi Chess Master.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-4 mt-4">
              <Button variant="outline" onClick={() => navigate("/home")} className="flex-1">
                Về trang chủ
              </Button>
              <Button onClick={handleRematch} className="flex-1">
                Chơi lại
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}


