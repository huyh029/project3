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
  PieceType,
  ChessPiece,
  getAllValidMoves,
} from "../utils/chessLogic";
import { ArrowLeft, Flag, RotateCcw, Clock, Eye, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { useGame } from "../context/GameContext";
import { apiClient } from "../utils/apiClient";
import { toast } from "sonner";

const promotionOptions: PieceType[] = ["queen", "rook", "bishop", "knight"];

const promotionLabels: Record<PieceType, string> = {
  queen: "Hậu",
  rook: "Xe",
  bishop: "Tượng",
  knight: "Mã",
  king: "Vua",
  pawn: "Tốt",
};

type LivePlayerSummary = {
  id?: string | null;
  name?: string | null;
  rating?: number | null;
  rank?: string | null;
};

type LiveMatchSummary = {
  id: string;
  type: "online" | "rank" | string;
  status: string;
  timeLimit: number;
  createdAt: string;
  lastMoveAt?: string;
  roomId?: string | null;
  whitePlayer: LivePlayerSummary | null;
  blackPlayer: LivePlayerSummary | null;
};

const formatMoveNotation = (
  from: Position,
  to: Position,
  pieceType: string,
  promotionType?: PieceType
) => {
  const base = `${pieceType.toUpperCase()} ${String.fromCharCode(97 + from.col)}${
    8 - from.row
  } → ${String.fromCharCode(97 + to.col)}${8 - to.row}`;
  if (promotionType && promotionType !== "pawn" && promotionType !== "king") {
    return `${base} = ${promotionType.toUpperCase()}`;
  }
  return base;
};

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
  const exitRoute = useMemo(() => (mode === "ranked" ? "/rank-lobby" : "/home"), [mode]);
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [promotionRequest, setPromotionRequest] = useState<{
    from: Position;
    to: Position;
    piece: ChessPiece;
    capturedKing: boolean;
  } | null>(null);
  const [liveMatchesOpen, setLiveMatchesOpen] = useState(false);
  const [liveMatches, setLiveMatches] = useState<LiveMatchSummary[]>([]);
  const [liveMatchesLoading, setLiveMatchesLoading] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  const derivedPlayerColor = useMemo(() => {
    if (playerColor) return playerColor;
    if (!matchInfo || !user?.id) return undefined;
    const normalizeId = (value: any) => {
      if (!value) return null;
      if (typeof value === "string") return value;
      if (typeof value === "number") return value.toString();
      if (typeof value === "object") {
        if (typeof value._id === "string") return value._id;
        if (value._id?.toString) return value._id.toString();
        if (value.id?.toString) return value.id.toString();
        if (typeof value.toString === "function") return value.toString();
      }
      return null;
    };
    const userId = normalizeId(user?.id);
    const whiteId = normalizeId(matchInfo.whitePlayerId);
    if (userId && whiteId && userId === whiteId) return "white";
    const blackId = normalizeId(matchInfo.blackPlayerId);
    if (userId && blackId && userId === blackId) return "black";
    return undefined;
  }, [playerColor, matchInfo, user]);

  const resetBoard = () => {
    setBoard(initializeBoard());
    setCurrentTurn("white");
    setMoveHistory([]);
    setGameOver(false);
    setWinner(null);
    setWhiteTime(initialClock);
    setBlackTime(initialClock);
    setPromotionRequest(null);
  };

  const isPromotionMove = (piece: ChessPiece, to: Position) => {
    if (piece.type !== "pawn") return false;
    return (piece.color === "white" && to.row === 0) || (piece.color === "black" && to.row === 7);
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
  };

  const fetchLiveMatches = useCallback(async () => {
    if (!token) return;
    setLiveMatchesLoading(true);
    try {
      const response = await apiClient.get<{ matches: LiveMatchSummary[] }>(
        "/matches/live",
        token
      );
      setLiveMatches(response.matches || []);
    } catch (error: any) {
      toast.error(error.message || "Khong the tai danh sach tran dau dang dien ra");
    } finally {
      setLiveMatchesLoading(false);
    }
  }, [token]);

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

    if (!token) {

      setLiveMatches([]);

      return;

    }

    fetchLiveMatches();

  }, [token, fetchLiveMatches]);

  useEffect(() => {
    if (batchId && (mode === "online" || mode === "ranked")) {
      fetchMatch(batchId);
    }
  }, [batchId, mode, fetchMatch]);

  useEffect(() => {
    if (!socket || !isNetworkMatch || !batchId) return;
    const handleFinished = (payload: { batchId: string; winnerId?: string | null }) => {
      if (payload.batchId !== batchId) return;
      const normalize = (id?: string | null) => (id ? id.toString() : null);
      const winnerId = normalize(payload.winnerId);
      const winnerColor =
        !winnerId
          ? "draw"
          : matchInfo?.whitePlayerId && normalize(matchInfo.whitePlayerId) === winnerId
          ? "white"
          : matchInfo?.blackPlayerId && normalize(matchInfo.blackPlayerId) === winnerId
          ? "black"
          : null;
      setWinner(winnerColor || "draw");
      setGameOver(true);
      toast.info("Trận đấu đã kết thúc");
      setTimeout(() => {
        navigate("/home", { replace: true, state: { finishedBatchId: batchId } });
      }, 1500);
    };
    socket.on("match:finished", handleFinished);
    return () => {
      socket.off("match:finished", handleFinished);
    };
  }, [socket, isNetworkMatch, batchId, matchInfo, navigate]);

  useEffect(() => {
    if (!socket) return;
    const handleLiveUpsert = (payload: { match?: LiveMatchSummary }) => {
      if (!payload?.match) return;
      setLiveMatches((prev) => {
        const existingIndex = prev.findIndex((item) => item.id === payload.match!.id);
        if (existingIndex >= 0) {
          const clone = [...prev];
          clone[existingIndex] = payload.match!;
          return clone;
        }
        return [payload.match!, ...prev].slice(0, 30);
      });
    };
    const handleLiveRemove = (payload: { batchId?: string }) => {
      if (!payload?.batchId) return;
      setLiveMatches((prev) => prev.filter((item) => item.id !== payload.batchId));
    };
    socket.on("live:match-upsert", handleLiveUpsert);
    socket.on("live:match-remove", handleLiveRemove);
    return () => {
      socket.off("live:match-upsert", handleLiveUpsert);
      socket.off("live:match-remove", handleLiveRemove);
    };
  }, [socket]);

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

  const sendMoveToServer = async (
    from: Position,
    to: Position,
    piece: ChessPiece,
    promotion?: PieceType
  ) => {
    if (!batchId || !token) return;
    await apiClient.post(
      "/batch/add-move",
      {
        batchId,
        from,
        to,
        piece: piece.type,
        color: piece.color,
        promotion,
      },
      token
    );
  };

  const processMove = async (
    from: Position,
    to: Position,
    piece: ChessPiece,
    promotion?: PieceType
  ) => {
    if (isNetworkMatch) {
      await sendMoveToServer(from, to, piece, promotion);
      return null;
    }
    const result = applyLocalMove(board, from, to, piece, promotion);
    if (batchId && token) {
      try {
        await sendMoveToServer(from, to, piece, promotion);
      } catch {
        // ignore local sync errors
      }
    }
    return result;
  };

  const applyLocalMove = (
    currentBoard: Board,
    from: Position,
    to: Position,
    piece: ChessPiece,
    promotion?: PieceType
  ) => {
    const nextBoard = makeMove(currentBoard, from, to, promotion);
    const nextTurn: PieceColor = piece.color === "white" ? "black" : "white";
    setBoard(nextBoard);
    setMoveHistory((prev) => [
      ...prev,
      formatMoveNotation(from, to, piece.type, promotion),
    ]);
    setCurrentTurn(nextTurn);
    return { nextBoard, nextTurn };
  };

  const finishMatch = useCallback(
    async (result: PieceColor | "draw", reasonOverride?: string) => {
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
          { winnerId, reason: reasonOverride || (result === "draw" ? "draw" : "checkmate") },
          token
        );
      } catch {
        // ignore finish errors
      }
    },
    [batchId, token, matchInfo]
  );

  const handleGameEnd = useCallback(
    (result: PieceColor | "draw", options?: { reason?: string }) => {
      setGameOver((prev) => {
        if (prev) return prev;
        setWinner(result);
        finishMatch(result, options?.reason);
        return true;
      });
    },
    [finishMatch]
  );

  const evaluateBoardState = useCallback(
    (boardState: Board, nextTurn: PieceColor) => {
      if (gameOver) return;
      const legalMoves = getAllValidMoves(boardState, nextTurn);
      if (legalMoves.length === 0) {
        if (isKingInCheck(boardState, nextTurn)) {
          handleGameEnd(nextTurn === "white" ? "black" : "white");
        } else {
          handleGameEnd("draw");
        }
      }
    },
    [gameOver, handleGameEnd]
  );

  const handleMove = async (from: Position, to: Position) => {
    if (gameOver || promotionRequest) return;
    const piece = board[from.row][from.col];
    if (!piece) return;
    const target = board[to.row][to.col];
    const capturedKing = target?.type === "king";

    if (isNetworkMatch) {
      if (!token) {
        toast.error("Cần đăng nhập để chơi online");
        return;
      }
      if (playerColor && piece.color !== playerColor) return;
      if (piece.color !== currentTurn) return;
    }

    if (isPromotionMove(piece, to)) {
      setPromotionRequest({ from, to, piece, capturedKing });
      return;
    }

    try {
      const result = await processMove(from, to, piece);
      if (!result) return;
      if (capturedKing) {
        handleGameEnd(piece.color);
      } else {
        evaluateBoardState(result.nextBoard, result.nextTurn);
      }
    } catch (error: any) {
      toast.error(error.message || "Không thể gửi nước đi");
    }
  };

  function makeAIMove() {
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
    const target = board[move.to.row][move.to.col];
    const promotion = isPromotionMove(piece, move.to) ? ("queen" as PieceType) : undefined;
    const result = applyLocalMove(board, move.from, move.to, piece, promotion);
    if (target?.type === "king") {
      handleGameEnd("black");
      return;
    }
    evaluateBoardState(result.nextBoard, result.nextTurn);
    if (batchId && token) {
      sendMoveToServer(move.from, move.to, piece, promotion).catch(() => {});
    }
  }

  const handlePromotionSelect = async (choice: PieceType) => {
    if (!promotionRequest) return;
    const request = promotionRequest;
    setPromotionRequest(null);
    try {
      const result = await processMove(request.from, request.to, request.piece, choice);
      if (!result) return;
      if (request.capturedKing) {
        handleGameEnd(request.piece.color);
      } else {
        evaluateBoardState(result.nextBoard, result.nextTurn);
      }
    } catch (error: any) {
      toast.error(error.message || "Không thể gửi nước đi");
      setPromotionRequest(request);
    }
  };

  const handlePromotionCancel = () => {
    setPromotionRequest(null);
  };

  useEffect(() => {
    if (!socket || !isNetworkMatch || !batchId) return;
    socket.emit("joinBatch", batchId);
    const handleIncomingMove = (payload: { batchId: string; move: any }) => {
      if (payload.batchId !== batchId) return;
      const move = payload.move;
      if (!move?.from || !move?.to) return;
      const nextTurn: PieceColor = move.color === "white" ? "black" : "white";
      setBoard((prev) => {
        const nextBoard = makeMove(prev, move.from, move.to, move.promotion);
        if (move.captured === "king") {
          handleGameEnd(move.color);
        } else {
          evaluateBoardState(nextBoard, nextTurn);
        }
        return nextBoard;
      });
      setMoveHistory((prev) => [
        ...prev,
        formatMoveNotation(move.from, move.to, move.piece, move.promotion),
      ]);
      setCurrentTurn(nextTurn);
    };
    socket.on("batch:move", handleIncomingMove);
    return () => {
      socket.emit("leaveBatch", batchId);
      socket.off("batch:move", handleIncomingMove);
    };
  }, [socket, isNetworkMatch, batchId, handleGameEnd, evaluateBoardState]);

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
  }, [currentTurn, gameOver, initialClock, handleGameEnd]);

  const shouldConfirmLeave = isNetworkMatch && !gameOver;

  const handleNavigateHome = () => {
    if (shouldConfirmLeave) {
      setLeaveConfirmOpen(true);
      return;
    }
    navigate("/home");
  };

  const handleConfirmLeave = () => {
    if (shouldConfirmLeave) {
      const opponentColor: PieceColor =
        derivedPlayerColor === "white"
          ? "black"
          : derivedPlayerColor === "black"
          ? "white"
          : currentTurn === "white"
          ? "black"
          : "white";
      handleGameEnd(opponentColor, { reason: "forfeit" });
    }
    setLeaveConfirmOpen(false);
    navigate("/home", {
      replace: true,
      state: batchId ? { finishedBatchId: batchId } : undefined,
    });
  };

  const handleResign = () => {
    handleGameEnd(currentTurn === "white" ? "black" : "white", { reason: "resign" });
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

  const handleOpenLiveMatches = () => {
    if (!token) {
      toast.error("Vui long dang nhap de xem truc tiep");
      return;
    }
    setLiveMatchesOpen(true);
    fetchLiveMatches();
  };

  const handleWatchLiveMatch = (match: LiveMatchSummary) => {
    setLiveMatchesOpen(false);
    navigate(`/spectate/${match.id}`);
  };

  const formatLiveTimeLimit = (value: number) => {
    return value < 0 ? "Khong gioi han" : `${value} phut`;
  };

  const formatLiveTimestamp = (value?: string) => {
    if (!value) return "Dang cap nhat";
    try {
      return new Date(value).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return value;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 ">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleNavigateHome} className="text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Về trang chủ
            </Button>
          </div>
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

      <AlertDialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
        <AlertDialogContent className="bg-slate-900 text-white border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Thoat tran dang dien ra?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Tran online/rank van dang dien ra. Neu roi phong ngay bay gio he thong se tinh day la mot tran thua.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tiep tuc choi</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-500 text-white"
              onClick={handleConfirmLeave}
            >
              Roi tran va chap nhan thua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={liveMatchesOpen}
        onOpenChange={(open) => {
          setLiveMatchesOpen(open);
          if (open) {
            fetchLiveMatches();
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Trận đấu trực tiếp</DialogTitle>
            <DialogDescription>
              Chọn một trận để xem ngay lập tức.
            </DialogDescription>
          </DialogHeader>
          {liveMatchesLoading ? (
            <div className="flex items-center gap-2 text-gray-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang tải danh sách trận đấu...
            </div>
          ) : liveMatches.length === 0 ? (
            <p className="text-gray-400 text-sm">Chưa có trận đấu nào đang diễn ra.</p>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {liveMatches.map((match) => {
                const whiteName = match.whitePlayer?.name || "Trắng chưa rõ";
                const blackName = match.blackPlayer?.name || "Đen chưa rõ";
                const matchTypeLabel = match.type === "rank" ? "Rank" : "Online";
                const startTime = formatLiveTimestamp(match.createdAt);
                const updateTime = formatLiveTimestamp(match.lastMoveAt || match.createdAt);
                return (
                  <div
                    key={match.id}
                    className="p-4 rounded-lg border border-white/10 bg-white/5 space-y-3 text-white"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm text-gray-300">
                          {matchTypeLabel} • {formatLiveTimeLimit(match.timeLimit)}
                        </p>
                        <p className="text-xl font-semibold">
                          {whiteName} vs {blackName}
                        </p>
                        <p className="text-xs text-gray-400">
                          Bắt đầu: {startTime} • Cập nhật: {updateTime}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => handleWatchLiveMatch(match)}>
                        Xem ngay
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="p-3 rounded bg-black/40">
                        <p className="text-xs text-gray-400 uppercase">Trắng</p>
                        <p className="font-semibold">{whiteName}</p>
                        {match.whitePlayer?.rating !== undefined && match.whitePlayer?.rating !== null ? (
                          <p className="text-xs text-gray-400">
                            {match.whitePlayer?.rank || "—"} • {match.whitePlayer?.rating} ELO
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500">Chưa có thông tin</p>
                        )}
                      </div>
                      <div className="p-3 rounded bg-black/40">
                        <p className="text-xs text-gray-400 uppercase">Đen</p>
                        <p className="font-semibold">{blackName}</p>
                        {match.blackPlayer?.rating !== undefined && match.blackPlayer?.rating !== null ? (
                          <p className="text-xs text-gray-400">
                            {match.blackPlayer?.rank || "—"} • {match.blackPlayer?.rating} ELO
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500">Chưa có thông tin</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(promotionRequest)} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Phong quân</DialogTitle>
            <DialogDescription>
              Chọn quân bạn muốn đổi khi tốt lên hàng cuối.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {promotionOptions.map((option) => (
              <Button
                key={option}
                onClick={() => handlePromotionSelect(option)}
                className="w-full"
              >
                {promotionLabels[option]}
              </Button>
            ))}
          </div>
          <Button variant="outline" className="w-full" onClick={handlePromotionCancel}>
            Hủy
          </Button>
        </DialogContent>
      </Dialog>

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
