import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { ArrowLeft, Trophy, Star, Crown, Medal, Award, Users, UserPlus } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { toast } from 'sonner';
import { fetchFriends, sendFriendRequest, FriendRecord } from '../utils/friendApi';

interface ProfileProps {
  isGuest: boolean;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

interface GameHistory {
  id: string;
  opponent: string;
  result: 'win' | 'loss' | 'draw';
  mode: string;
  date: string;
  eloChange: number;
}

export default function Profile({ isGuest }: ProfileProps) {
  const navigate = useNavigate();
  const { user, inventory, token } = useGame();
  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendEmail, setFriendEmail] = useState("");
  const [friendMessage, setFriendMessage] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  const achievements: Achievement[] = [
    { id: 'first-win', name: 'Chiến Thắng Đầu Tiên', description: 'Giành chiến thắng đầu tiên', icon: '🏆', unlocked: (user?.wins || 0) > 0 },
    { id: 'win-10', name: 'Cao Thủ Sơ Cấp', description: 'Thắng 10 trận', icon: '⭐', unlocked: (user?.wins || 0) >= 10 },
    { id: 'win-50', name: 'Cao Thủ Trung Cấp', description: 'Thắng 50 trận', icon: '🌟', unlocked: (user?.wins || 0) >= 50 },
    { id: 'win-100', name: 'Cao Thủ Cao Cấp', description: 'Thắng 100 trận', icon: '💫', unlocked: (user?.wins || 0) >= 100 },
    { id: 'rank-silver', name: 'Bạc Thăng', description: 'Đạt rank Bạc', icon: '🥈', unlocked: false },
    { id: 'rank-gold', name: 'Vàng Quý', description: 'Đạt rank Vàng', icon: '🥇', unlocked: false },
    { id: 'collector', name: 'Nhà Sưu Tập', description: 'Sở hữu 10 skin', icon: '🎨', unlocked: inventory.length >= 10 },
    { id: 'gacha-lucky', name: 'May Mắn', description: 'Quay gacha 50 lần', icon: '🎰', unlocked: false },
  ];

  const gameHistory: GameHistory[] = [
    { id: '1', opponent: 'AI (Khó)', result: 'win', mode: 'AI', date: '2025-11-05', eloChange: 0 },
    { id: '2', opponent: 'Player123', result: 'loss', mode: 'Rank', date: '2025-11-04', eloChange: -15 },
    { id: '3', opponent: 'ChessMaster', result: 'draw', mode: 'Online', date: '2025-11-04', eloChange: 5 },
    { id: '4', opponent: 'Bạn Bè', result: 'win', mode: 'Local', date: '2025-11-03', eloChange: 0 },
  ];

  if (isGuest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-7xl mx-auto">
          <Button variant="outline" onClick={() => navigate('/home')} className="mb-6 text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Về trang chủ
          </Button>
          <Card className="text-center py-12">
            <CardHeader>
              <CardTitle className="text-2xl">🔒 Tính năng bị khóa</CardTitle>
              <CardDescription>
                Vui lòng đăng ký tài khoản để xem hồ sơ
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const totalGames = user.wins + user.losses + user.draws;
  const winRate = totalGames > 0 ? ((user.wins / totalGames) * 100).toFixed(1) : '0';
  const expProgress = (user.exp / (user.level * 100)) * 100;

  useEffect(() => {
    if (isGuest || !token) return;
    setFriendsLoading(true);
    fetchFriends(token)
      .then(setFriends)
      .catch(err => toast.error(err.message || "Không thể tải danh sách bạn bè"))
      .finally(() => setFriendsLoading(false));
  }, [token, isGuest]);

  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendEmail.trim()) {
      toast.error("Hãy nhập email người bạn muốn kết bạn");
      return;
    }
    if (!token) {
      toast.error("Vui lòng đăng nhập để gửi lời mời");
      return;
    }
    setSendingRequest(true);
    try {
      await sendFriendRequest(token, {
        receiverEmail: friendEmail.trim(),
        message: friendMessage.trim() || undefined,
      });
      toast.success("Đã gửi lời mời kết bạn");
      setFriendEmail("");
      setFriendMessage("");
    } catch (err: any) {
      toast.error(err.message || "Không thể gửi lời mời");
    } finally {
      setSendingRequest(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Button variant="outline" onClick={() => navigate('/home')} className="mb-6 text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Về trang chủ
        </Button>

        {/* Profile Header */}
        <Card className="mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 border-0 text-white">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <img 
                src={user.avatar} 
                alt={user.username}
                className="w-32 h-32 rounded-full border-4 border-white shadow-lg"
              />
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl mb-2">{user.username}</h1>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-4">
                  <Badge className="bg-white/20 text-white text-lg px-3 py-1">
                    <Trophy className="w-4 h-4 mr-1" />
                    {user.rank}
                  </Badge>
                  <Badge className="bg-white/20 text-white text-lg px-3 py-1">
                    Level {user.level}
                  </Badge>
                  <Badge className="bg-white/20 text-white text-lg px-3 py-1">
                    ELO: {user.elo}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Kinh nghiệm:</span>
                    <Progress value={expProgress} className="flex-1 max-w-xs" />
                    <span className="text-sm">{user.exp}/{user.level * 100}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <span className="text-xl">{user.gold} Vàng</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Tổng trận</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl">{totalGames}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Thắng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl text-green-500">{user.wins}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Tỷ lệ thắng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl text-blue-500">{winRate}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Hòa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl text-yellow-500">{user.draws}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="history" className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="history">Lịch Sử Trận</TabsTrigger>
            <TabsTrigger value="achievements">Thành Tựu</TabsTrigger>
            <TabsTrigger value="inventory">Kho Đồ</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Lịch Sử Đấu</CardTitle>
                <CardDescription>Các trận đấu gần đây của bạn</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {gameHistory.map(game => (
                    <div 
                      key={game.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                          game.result === 'win' ? 'bg-green-100' :
                          game.result === 'loss' ? 'bg-red-100' : 'bg-yellow-100'
                        }`}>
                          {game.result === 'win' ? '🏆' : game.result === 'loss' ? '❌' : '🤝'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span>vs {game.opponent}</span>
                            <Badge variant="outline">{game.mode}</Badge>
                          </div>
                          <div className="text-sm text-gray-500">{game.date}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        {game.eloChange !== 0 && (
                          <div className={`${game.eloChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {game.eloChange > 0 ? '+' : ''}{game.eloChange} ELO
                          </div>
                        )}
                        <Button variant="ghost" size="sm">Xem lại</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Thành Tựu</CardTitle>
                <CardDescription>
                  Đã mở khóa {achievements.filter(a => a.unlocked).length}/{achievements.length}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.map(achievement => (
                    <div 
                      key={achievement.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 ${
                        achievement.unlocked 
                          ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300' 
                          : 'bg-gray-50 border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="text-4xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3>{achievement.name}</h3>
                          {achievement.unlocked && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                        </div>
                        <p className="text-sm text-gray-600">{achievement.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Kho Đồ</CardTitle>
                <CardDescription>Các skin và vật phẩm bạn đã sở hữu</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {inventory.map((itemId, index) => (
                    <div 
                      key={index}
                      className="aspect-square bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center text-4xl border-2 border-purple-300"
                    >
                      {itemId.includes('board') ? '♟️' : itemId.includes('piece') ? '♔' : '✨'}
                    </div>
                  ))}
                  {inventory.length === 0 && (
                    <div className="col-span-full text-center text-gray-500 py-8">
                      Chưa có vật phẩm nào
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Bạn bè
            </CardTitle>
            <CardDescription>Quản lý danh sách bạn bè và gửi lời mời mới</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {friendsLoading ? (
              <p className="text-gray-500">Đang tải danh sách bạn bè...</p>
            ) : friends.length === 0 ? (
              <p className="text-gray-500">Bạn chưa có bạn bè nào. Hãy gửi lời mời để kết nối!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {friends.map(friend => (
                  <div
                    key={friend._id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-4"
                  >
                    <div className="flex-1">
                      <p className="font-semibold">{friend.name}</p>
                      <p className="text-sm text-gray-500">{friend.email}</p>
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                        <Badge variant="secondary">{friend.rank}</Badge>
                        <span>ELO: {friend.rating}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSendFriendRequest} className="space-y-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                <span className="font-semibold">Gửi lời mời kết bạn</span>
              </div>
              <Input
                placeholder="Email bạn bè"
                value={friendEmail}
                onChange={e => setFriendEmail(e.target.value)}
                disabled={isGuest}
              />
              <Textarea
                placeholder="Lời nhắn (không bắt buộc)"
                value={friendMessage}
                onChange={e => setFriendMessage(e.target.value)}
                disabled={isGuest}
              />
              <Button type="submit" disabled={sendingRequest || isGuest}>
                {sendingRequest ? "Đang gửi..." : "Gửi lời mời"}
              </Button>
              {isGuest && (
                <p className="text-sm text-gray-500">
                  Hãy đăng nhập để sử dụng chức năng kết bạn.
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
