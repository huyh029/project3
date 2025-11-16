import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ArrowLeft, Mail, Gift, Bell, Trash2, Crown, UserPlus } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { toast } from 'sonner';
import { fetchFriendRequests, respondFriendRequest, FriendRequestRecord } from '../utils/friendApi';

interface InboxProps {
  isGuest: boolean;
}

interface Message {
  id: string;
  type: 'system' | 'gift' | 'notification' | 'friend';
  title: string;
  content: string;
  date: string;
  read: boolean;
  reward?: {
    gold?: number;
    exp?: number;
    item?: string;
  };
  claimed?: boolean;
  friendRequestId?: string;
  friendStatus?: 'pending' | 'accepted' | 'declined';
  friendSender?: string;
  friendSenderEmail?: string;
}

export default function Inbox({ isGuest }: InboxProps) {
  const navigate = useNavigate();
  const { user, updateUserStats, token } = useGame();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'gift',
      title: '🎁 Quà tặng chào mừng!',
      content: 'Chào mừng bạn đến với Chess Master! Đây là món quà chào mừng từ chúng tôi.',
      date: '2025-11-05',
      read: false,
      reward: { gold: 500, exp: 100 },
      claimed: false,
    },
    {
      id: '2',
      type: 'system',
      title: 'Cập nhật hệ thống',
      content: 'Phiên bản mới đã được cập nhật với nhiều tính năng thú vị! Hãy khám phá ngay.',
      date: '2025-11-04',
      read: false,
    },
    {
      id: '3',
      type: 'notification',
      title: 'Thành tựu mới đã mở khóa!',
      content: 'Chúc mừng! Bạn đã mở khóa thành tựu "Chiến Thắng Đầu Tiên".',
      date: '2025-11-04',
      read: true,
    },
    {
      id: '4',
      type: 'gift',
      title: '🎉 Phần thưởng đăng nhập hàng ngày',
      content: 'Cảm ơn bạn đã đăng nhập hôm nay! Đây là phần thưởng của bạn.',
      date: '2025-11-03',
      read: true,
      reward: { gold: 100 },
      claimed: true,
    },
    {
      id: '5',
      type: 'system',
      title: 'Sự kiện Tết 2025',
      content: 'Tham gia sự kiện Tết 2025 để nhận skin độc quyền và phần thưởng hấp dẫn!',
      date: '2025-11-03',
      read: true,
    },
    {
      id: '6',
      type: 'notification',
      title: 'Lên cấp!',
      content: 'Chúc mừng! Bạn đã lên level 2. Tiếp tục phát huy!',
      date: '2025-11-02',
      read: true,
    },
  ]);
  const [loadingFriendRequests, setLoadingFriendRequests] = useState(false);

  const mapFriendRequestToMessage = (request: FriendRequestRecord): Message => ({
    id: `friend-${request._id}`,
    type: 'friend',
    title: `${request.sender?.name || 'Người chơi'} muốn kết bạn`,
    content: request.message || 'Mình muốn kết bạn với bạn!',
    date: new Date(request.createdAt).toLocaleDateString('vi-VN'),
    read: request.status !== 'pending',
    friendRequestId: request._id,
    friendStatus: request.status,
    friendSender: request.sender?.name || request.sender?.email,
    friendSenderEmail: request.sender?.email,
  });

  useEffect(() => {
    if (isGuest || !token) return;
    setLoadingFriendRequests(true);
    fetchFriendRequests(token, 'inbox')
      .then((requests) => {
        const friendMsgs = requests.map(mapFriendRequestToMessage);
        setMessages((prev) => {
          const others = prev.filter((msg) => msg.type !== 'friend');
          return [...friendMsgs, ...others];
        });
      })
      .catch((err: any) =>
        toast.error(err.message || 'Không thể tải lời mời kết bạn')
      )
      .finally(() => setLoadingFriendRequests(false));
  }, [token, isGuest]);

  const handleMessageClick = (message: Message) => {
    setSelectedMessage(message);
    if (!message.read) {
      setMessages(messages.map(m => 
        m.id === message.id ? { ...m, read: true } : m
      ));
    }
  };

  const handleClaimReward = (message: Message) => {
    if (!message.reward || message.claimed || !user) return;

    const goldReward = message.reward.gold || 0;
    const expReward = message.reward.exp || 0;

    updateUserStats({
      gold: user.gold + goldReward,
      exp: user.exp + expReward,
    });

    setMessages(messages.map(m => 
      m.id === message.id ? { ...m, claimed: true } : m
    ));

    alert(`Đã nhận thưởng: ${goldReward} vàng${expReward ? `, ${expReward} kinh nghiệm` : ''}${message.reward.item ? `, ${message.reward.item}` : ''}!`);
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessages(messages.filter(m => m.id !== messageId));
    setSelectedMessage(null);
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
                Vui lòng đăng ký tài khoản để xem hộp thư
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const unreadCount = messages.filter(m => !m.read).length;
  const systemMessages = messages.filter(m => m.type === 'system');
  const giftMessages = messages.filter(m => m.type === 'gift');
  const notificationMessages = messages.filter(m => m.type === 'notification');

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
            <Mail className="w-10 h-10 text-yellow-400" />
            <h1 className="text-4xl text-white">Hộp Thư</h1>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {unreadCount} mới
              </Badge>
            )}
          </div>
          <p className="text-gray-300">Thông báo và quà tặng của bạn</p>
        </div>

        <Tabs defaultValue="all" className="mb-8">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
            <TabsTrigger value="all">
              📬 Tất cả ({messages.length})
            </TabsTrigger>
            <TabsTrigger value="system">
              🔔 Hệ thống ({systemMessages.length})
            </TabsTrigger>
            <TabsTrigger value="gift">
              🎁 Quà tặng ({giftMessages.length})
            </TabsTrigger>
            <TabsTrigger value="notification">
              📢 Thông báo ({notificationMessages.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <MessageList 
              messages={messages} 
              onMessageClick={handleMessageClick}
              onDelete={handleDeleteMessage}
            />
          </TabsContent>

          <TabsContent value="system" className="mt-6">
            <MessageList 
              messages={systemMessages} 
              onMessageClick={handleMessageClick}
              onDelete={handleDeleteMessage}
            />
          </TabsContent>

          <TabsContent value="gift" className="mt-6">
            <MessageList 
              messages={giftMessages} 
              onMessageClick={handleMessageClick}
              onDelete={handleDeleteMessage}
            />
          </TabsContent>

          <TabsContent value="notification" className="mt-6">
            <MessageList 
              messages={notificationMessages} 
              onMessageClick={handleMessageClick}
              onDelete={handleDeleteMessage}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Message Detail Dialog */}
      {selectedMessage && (
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedMessage.type === 'gift' && <Gift className="w-5 h-5 text-yellow-500" />}
                {selectedMessage.type === 'system' && <Bell className="w-5 h-5 text-blue-500" />}
                {selectedMessage.type === 'notification' && <Mail className="w-5 h-5 text-green-500" />}
                {selectedMessage.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                {selectedMessage.date}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <p className="mb-4 whitespace-pre-wrap">{selectedMessage.content}</p>

              {selectedMessage.reward && (
                <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300">
                  <CardHeader>
                    <CardTitle className="text-sm">Phần thưởng</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                      {selectedMessage.reward.gold && (
                        <div className="flex items-center gap-2">
                          <Crown className="w-5 h-5 text-yellow-500" />
                          <span>+{selectedMessage.reward.gold} Vàng</span>
                        </div>
                      )}
                      {selectedMessage.reward.exp && (
                        <div className="flex items-center gap-2">
                          <span>✨</span>
                          <span>+{selectedMessage.reward.exp} EXP</span>
                        </div>
                      )}
                      {selectedMessage.reward.item && (
                        <Badge>
                          🎁 {selectedMessage.reward.item}
                        </Badge>
                      )}
                    </div>
                    <Button
                      className="w-full"
                      disabled={selectedMessage.claimed}
                      onClick={() => handleClaimReward(selectedMessage)}
                    >
                      {selectedMessage.claimed ? '✓ Đã nhận' : 'Nhận thưởng'}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setSelectedMessage(null)}
              >
                Đóng
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleDeleteMessage(selectedMessage.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Xóa
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function MessageList({ 
  messages, 
  onMessageClick,
  onDelete 
}: { 
  messages: Message[];
  onMessageClick: (message: Message) => void;
  onDelete: (id: string) => void;
}) {
  if (messages.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Không có tin nhắn</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map(message => (
        <Card 
          key={message.id}
          className={`cursor-pointer hover:shadow-lg transition-all ${
            !message.read ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''
          }`}
          onClick={() => onMessageClick(message)}
        >
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                message.type === 'gift' ? 'bg-yellow-100' :
                message.type === 'system' ? 'bg-blue-100' : 'bg-green-100'
              }`}>
                {message.type === 'gift' && <Gift className="w-6 h-6 text-yellow-600" />}
                {message.type === 'system' && <Bell className="w-6 h-6 text-blue-600" />}
                {message.type === 'notification' && <Mail className="w-6 h-6 text-green-600" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <h3 className={!message.read ? '' : 'text-gray-600'}>
                    {message.title}
                  </h3>
                  {!message.read && (
                    <Badge variant="default" className="ml-2 bg-blue-500">Mới</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                  {message.content}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{message.date}</span>
                  {message.reward && !message.claimed && (
                    <Badge className="bg-yellow-500">
                      <Gift className="w-3 h-3 mr-1" />
                      Có quà
                    </Badge>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(message.id);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
