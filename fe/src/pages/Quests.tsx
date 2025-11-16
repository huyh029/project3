import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ArrowLeft, Gift, Crown, Star, Trophy, CheckCircle } from 'lucide-react';
import { useGame } from '../context/GameContext';

interface QuestsProps {
  isGuest: boolean;
}

interface Quest {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: {
    gold?: number;
    exp?: number;
    item?: string;
  };
  type: 'daily' | 'weekly' | 'event';
  completed: boolean;
  claimed: boolean;
}

export default function Quests({ isGuest }: QuestsProps) {
  const navigate = useNavigate();
  const { user, updateUserStats } = useGame();

  const [quests, setQuests] = useState<Quest[]>([
    {
      id: 'daily-1',
      title: 'Thắng 3 trận',
      description: 'Giành chiến thắng trong 3 trận đấu bất kỳ',
      progress: 1,
      target: 3,
      reward: { gold: 100, exp: 50 },
      type: 'daily',
      completed: false,
      claimed: false,
    },
    {
      id: 'daily-2',
      title: 'Chơi 5 trận',
      description: 'Tham gia 5 trận đấu',
      progress: 3,
      target: 5,
      reward: { gold: 50, exp: 30 },
      type: 'daily',
      completed: false,
      claimed: false,
    },
    {
      id: 'daily-3',
      title: 'Đăng nhập hàng ngày',
      description: 'Đăng nhập vào game',
      progress: 1,
      target: 1,
      reward: { gold: 50 },
      type: 'daily',
      completed: true,
      claimed: false,
    },
    {
      id: 'weekly-1',
      title: 'Thắng 20 trận',
      description: 'Giành chiến thắng trong 20 trận đấu trong tuần',
      progress: 5,
      target: 20,
      reward: { gold: 500, exp: 200 },
      type: 'weekly',
      completed: false,
      claimed: false,
    },
    {
      id: 'weekly-2',
      title: 'Chơi Rank 10 trận',
      description: 'Tham gia 10 trận đấu xếp hạng',
      progress: 2,
      target: 10,
      reward: { gold: 300, exp: 150 },
      type: 'weekly',
      completed: false,
      claimed: false,
    },
    {
      id: 'weekly-3',
      title: 'Mua 3 skin mới',
      description: 'Mua 3 skin từ cửa hàng',
      progress: 0,
      target: 3,
      reward: { gold: 200, item: 'Gacha Ticket' },
      type: 'weekly',
      completed: false,
      claimed: false,
    },
    {
      id: 'event-1',
      title: '🎉 Sự kiện Tết 2025',
      description: 'Thắng 10 trận trong sự kiện Tết',
      progress: 3,
      target: 10,
      reward: { gold: 1000, exp: 500, item: 'Skin Đặc Biệt' },
      type: 'event',
      completed: false,
      claimed: false,
    },
  ]);

  const handleClaimReward = (quest: Quest) => {
    if (!quest.completed || quest.claimed || !user) return;

    let goldReward = quest.reward.gold || 0;
    let expReward = quest.reward.exp || 0;

    updateUserStats({
      gold: user.gold + goldReward,
      exp: user.exp + expReward,
    });

    setQuests(quests.map(q => 
      q.id === quest.id ? { ...q, claimed: true } : q
    ));

    alert(`Đã nhận thưởng: ${goldReward} vàng, ${expReward} kinh nghiệm${quest.reward.item ? `, ${quest.reward.item}` : ''}!`);
  };

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
                Vui lòng đăng ký tài khoản để nhận nhiệm vụ
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const dailyQuests = quests.filter(q => q.type === 'daily');
  const weeklyQuests = quests.filter(q => q.type === 'weekly');
  const eventQuests = quests.filter(q => q.type === 'event');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Button variant="outline" onClick={() => navigate('/home')} className="mb-6 text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Về trang chủ
        </Button>

        {/* Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Gift className="w-10 h-10 text-yellow-400" />
            <h1 className="text-4xl text-white">Nhiệm Vụ & Sự Kiện</h1>
          </div>
          <p className="text-gray-300">Hoàn thành nhiệm vụ để nhận thưởng hấp dẫn</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Nhiệm vụ hằng ngày</p>
                  <p className="text-2xl">{dailyQuests.filter(q => q.completed).length}/{dailyQuests.length}</p>
                </div>
                <Star className="w-12 h-12 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Nhiệm vụ tuần</p>
                  <p className="text-2xl">{weeklyQuests.filter(q => q.completed).length}/{weeklyQuests.length}</p>
                </div>
                <Trophy className="w-12 h-12 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-red-600 text-white border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Sự kiện đặc biệt</p>
                  <p className="text-2xl">{eventQuests.filter(q => q.completed).length}/{eventQuests.length}</p>
                </div>
                <Gift className="w-12 h-12 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="daily" className="mb-8">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto">
            <TabsTrigger value="daily">📅 Hằng Ngày</TabsTrigger>
            <TabsTrigger value="weekly">📆 Hằng Tuần</TabsTrigger>
            <TabsTrigger value="event">🎉 Sự Kiện</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-6">
            <div className="space-y-4">
              {dailyQuests.map(quest => (
                <QuestCard 
                  key={quest.id} 
                  quest={quest} 
                  onClaim={() => handleClaimReward(quest)} 
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="weekly" className="mt-6">
            <div className="space-y-4">
              {weeklyQuests.map(quest => (
                <QuestCard 
                  key={quest.id} 
                  quest={quest} 
                  onClaim={() => handleClaimReward(quest)} 
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="event" className="mt-6">
            <div className="space-y-4">
              {eventQuests.map(quest => (
                <QuestCard 
                  key={quest.id} 
                  quest={quest} 
                  onClaim={() => handleClaimReward(quest)} 
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function QuestCard({ quest, onClaim }: { quest: Quest; onClaim: () => void }) {
  const progressPercent = (quest.progress / quest.target) * 100;

  return (
    <Card className={quest.completed ? 'border-2 border-green-500' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            quest.claimed ? 'bg-gray-300' : quest.completed ? 'bg-green-500' : 'bg-blue-500'
          }`}>
            {quest.claimed ? (
              <CheckCircle className="w-6 h-6 text-white" />
            ) : quest.completed ? (
              <Gift className="w-6 h-6 text-white" />
            ) : (
              <span className="text-white">{quest.progress}/{quest.target}</span>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="mb-1">{quest.title}</h3>
                <p className="text-sm text-gray-500">{quest.description}</p>
              </div>
              {quest.type === 'event' && (
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500">Sự kiện</Badge>
              )}
            </div>

            {!quest.completed && (
              <div className="mb-3">
                <Progress value={progressPercent} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">
                  {quest.progress}/{quest.target} - {progressPercent.toFixed(0)}%
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {quest.reward.gold && (
                  <div className="flex items-center gap-1">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm">+{quest.reward.gold}</span>
                  </div>
                )}
                {quest.reward.exp && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">+{quest.reward.exp} EXP</span>
                  </div>
                )}
                {quest.reward.item && (
                  <Badge variant="outline">
                    🎁 {quest.reward.item}
                  </Badge>
                )}
              </div>

              <Button
                size="sm"
                disabled={!quest.completed || quest.claimed}
                onClick={onClaim}
                className={quest.completed && !quest.claimed ? 'bg-green-500 hover:bg-green-600' : ''}
              >
                {quest.claimed ? '✓ Đã nhận' : quest.completed ? 'Nhận thưởng' : 'Chưa hoàn thành'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
