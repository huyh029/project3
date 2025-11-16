import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Bot, 
  Users, 
  Globe, 
  Trophy, 
  ShoppingBag, 
  User, 
  Award, 
  Gift, 
  Settings, 
  Mail,
  Crown
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import GameModeSelector from '../components/GameModeSelector';
import { useState } from 'react';

interface HomeProps {
  isGuest: boolean;
}

export default function Home({ isGuest }: HomeProps) {
  const navigate = useNavigate();
  const { user } = useGame();
  const [showGameModes, setShowGameModes] = useState(false);

  const menuItems = [
    { 
      icon: ShoppingBag, 
      label: 'Shop', 
      path: '/shop', 
      color: 'bg-purple-500',
      disabled: false
    },
    { 
      icon: User, 
      label: 'Hồ Sơ', 
      path: '/profile', 
      color: 'bg-blue-500',
      disabled: false
    },
    { 
      icon: Award, 
      label: 'Bảng Xếp Hạng', 
      path: '/leaderboard', 
      color: 'bg-yellow-500',
      disabled: false
    },
    { 
      icon: Gift, 
      label: 'Nhiệm Vụ', 
      path: '/quests', 
      color: 'bg-green-500',
      disabled: isGuest
    },
    { 
      icon: Settings, 
      label: 'Cài Đặt', 
      path: '/settings', 
      color: 'bg-gray-500',
      disabled: false
    },
    { 
      icon: Mail, 
      label: 'Hộp Thư', 
      path: '/inbox', 
      color: 'bg-red-500',
      disabled: isGuest
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-8 h-8 text-yellow-400" />
            <h1 className="text-2xl text-white">Chess Master</h1>
          </div>
          
          {user && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-white">{user.username}</div>
                <div className="text-xs text-gray-400">
                  {isGuest ? 'Chế độ Khách' : `${user.rank} • Level ${user.level}`}
                </div>
              </div>
              <img 
                src={user.avatar} 
                alt={user.username}
                className="w-12 h-12 rounded-full border-2 border-yellow-400"
              />
              {!isGuest && (
                <div className="flex items-center gap-2 bg-yellow-500/20 px-3 py-1 rounded-full">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400">{user.gold}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h2 className="text-3xl text-white mb-2">
            Xin chào, {user?.username}!
          </h2>
          <p className="text-gray-300">
            {isGuest ? 'Đăng ký tài khoản để mở khóa đầy đủ tính năng' : 'Sẵn sàng chinh phục bàn cờ?'}
          </p>
        </div>

        {/* Play Game Section */}
        <Card className="mb-8 bg-gradient-to-r from-indigo-500 to-purple-600 border-0">
          <CardHeader>
            <CardTitle className="text-white">🎮 Chơi Game</CardTitle>
            <CardDescription className="text-gray-200">
              Chọn chế độ chơi yêu thích của bạn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                variant="default"
                className="h-24 bg-white/20 hover:bg-white/30 border-2 border-white/40 flex flex-col gap-2"
                onClick={() => navigate('/game/ai')}
              >
                <Bot className="w-8 h-8" />
                <span>Chơi với Máy</span>
              </Button>

              <Button
                variant="default"
                className="h-24 bg-white/20 hover:bg-white/30 border-2 border-white/40 flex flex-col gap-2"
                onClick={() => navigate('/game/local')}
              >
                <Users className="w-8 h-8" />
                <span>2 Người 1 Máy</span>
              </Button>

              <Button
                variant="default"
                className="h-24 bg-white/20 hover:bg-white/30 border-2 border-white/40 flex flex-col gap-2 relative"
                onClick={() => isGuest ? alert('Vui lòng đăng ký để chơi online!') : navigate('/online-lobby')}
                disabled={isGuest}
              >
                <Globe className="w-8 h-8" />
                <span>Chơi Online</span>
                {isGuest && (
                  <Badge className="absolute top-2 right-2 text-xs">Locked</Badge>
                )}
              </Button>

              <Button
                variant="default"
                className="h-24 bg-white/20 hover:bg-white/30 border-2 border-white/40 flex flex-col gap-2 relative"
                onClick={() => isGuest ? alert('Vui lòng đăng ký để chơi Rank!') : navigate('/rank-lobby')}
                disabled={isGuest}
              >
                <Trophy className="w-8 h-8" />
                <span>Chế độ Rank</span>
                {isGuest && (
                  <Badge className="absolute top-2 right-2 text-xs">Locked</Badge>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Menu Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {menuItems.map((item) => (
            <Card 
              key={item.path}
              className={`cursor-pointer hover:scale-105 transition-transform ${
                item.disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={() => !item.disabled && navigate(item.path)}
            >
              <CardContent className="p-6 flex flex-col items-center justify-center gap-3 relative">
                <div className={`${item.color} w-12 h-12 rounded-full flex items-center justify-center`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-center">{item.label}</span>
                {item.disabled && (
                  <Badge className="absolute top-2 right-2 text-xs">Locked</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Section */}
        {!isGuest && user && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Thống Kê Nhanh</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl text-green-500">{user.wins}</div>
                  <div className="text-sm text-gray-500">Thắng</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl text-red-500">{user.losses}</div>
                  <div className="text-sm text-gray-500">Thua</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl text-yellow-500">{user.draws}</div>
                  <div className="text-sm text-gray-500">Hòa</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl text-blue-500">{user.elo}</div>
                  <div className="text-sm text-gray-500">ELO</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl text-purple-500">{user.exp}/{user.level * 100}</div>
                  <div className="text-sm text-gray-500">Kinh Nghiệm</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {showGameModes && (
        <GameModeSelector onClose={() => setShowGameModes(false)} isGuest={isGuest} />
      )}
    </div>
  );
}
