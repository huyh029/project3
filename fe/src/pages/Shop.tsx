import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ArrowLeft, Crown, Sparkles, ShoppingCart } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { motion } from 'motion/react';

interface ShopProps {
  isGuest: boolean;
}

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  type: 'board' | 'piece' | 'effect' | 'sound';
  preview?: string;
}

const shopItems: ShopItem[] = [
  { id: 'classic', name: 'Bàn Cổ Điển', description: 'Bàn cờ truyền thống', price: 0, rarity: 'common', type: 'board' },
  { id: 'wooden', name: 'Bàn Gỗ', description: 'Bàn cờ gỗ sang trọng', price: 500, rarity: 'rare', type: 'board' },
  { id: 'marble', name: 'Bàn Đá Cẩm Thạch', description: 'Bàn cờ đá cẩm thạch cao cấp', price: 1500, rarity: 'epic', type: 'board' },
  { id: 'gold', name: 'Bàn Vàng', description: 'Bàn cờ mạ vàng huyền thoại', price: 5000, rarity: 'legendary', type: 'board' },
  { id: 'classic-piece', name: 'Quân Cổ Điển', description: 'Quân cờ truyền thống', price: 0, rarity: 'common', type: 'piece' },
  { id: 'medieval', name: 'Quân Trung Cổ', description: 'Quân cờ phong cách hiệp sĩ', price: 800, rarity: 'rare', type: 'piece' },
  { id: 'fantasy', name: 'Quân Thần Thoại', description: 'Quân cờ sinh vật thần thoại', price: 2000, rarity: 'epic', type: 'piece' },
  { id: 'glow', name: 'Hiệu Ứng Phát Sáng', description: 'Quân cờ phát sáng khi di chuyển', price: 1000, rarity: 'rare', type: 'effect' },
  { id: 'sparkle', name: 'Hiệu Ứng Lấp Lánh', description: 'Hiệu ứng lấp lánh khi ăn quân', price: 1200, rarity: 'epic', type: 'effect' },
  { id: 'victory-firework', name: 'Hiệu Ứng Pháo Hoa', description: 'Pháo hoa khi chiến thắng', price: 1500, rarity: 'epic', type: 'effect' },
];

const rarityColors = {
  common: 'bg-gray-500',
  rare: 'bg-blue-500',
  epic: 'bg-purple-500',
  legendary: 'bg-yellow-500'
};

const rarityLabels = {
  common: 'Phổ Thông',
  rare: 'Hiếm',
  epic: 'Sử Thi',
  legendary: 'Huyền Thoại'
};

export default function Shop({ isGuest }: ShopProps) {
  const navigate = useNavigate();
  const { user, inventory, setInventory, updateUserStats } = useGame();
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [showGacha, setShowGacha] = useState(false);
  const [gachaResult, setGachaResult] = useState<ShopItem | null>(null);

  const handlePurchase = (item: ShopItem) => {
    if (!user) return;
    
    if (user.gold < item.price) {
      alert('Không đủ vàng!');
      return;
    }

    if (inventory.includes(item.id)) {
      alert('Bạn đã sở hữu vật phẩm này!');
      return;
    }

    updateUserStats({ gold: user.gold - item.price });
    setInventory([...inventory, item.id]);
    localStorage.setItem('inventory', JSON.stringify([...inventory, item.id]));
    setSelectedItem(null);
    alert(`Đã mua ${item.name}!`);
  };

  const handleGacha = (rolls: number) => {
    const cost = rolls === 1 ? 100 : 900;
    
    if (!user || user.gold < cost) {
      alert('Không đủ vàng!');
      return;
    }

    updateUserStats({ gold: user.gold - cost });

    // Simple gacha logic
    const random = Math.random();
    let selectedRarity: 'common' | 'rare' | 'epic' | 'legendary';
    
    if (random < 0.5) selectedRarity = 'common';
    else if (random < 0.8) selectedRarity = 'rare';
    else if (random < 0.95) selectedRarity = 'epic';
    else selectedRarity = 'legendary';

    const availableItems = shopItems.filter(
      item => item.rarity === selectedRarity && !inventory.includes(item.id)
    );

    if (availableItems.length === 0) {
      alert('Không có vật phẩm mới để nhận!');
      return;
    }

    const wonItem = availableItems[Math.floor(Math.random() * availableItems.length)];
    setGachaResult(wonItem);
    setInventory([...inventory, wonItem.id]);
    localStorage.setItem('inventory', JSON.stringify([...inventory, wonItem.id]));
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
                Vui lòng đăng ký tài khoản để sử dụng Shop
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => navigate('/home')} className="text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Về trang chủ
          </Button>
          <div className="flex items-center gap-2 bg-yellow-500/20 px-4 py-2 rounded-full">
            <Crown className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-400 text-xl">{user?.gold || 0}</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl text-white mb-2">🛒 Cửa Hàng</h1>
          <p className="text-gray-300">Trang bị skin và hiệu ứng độc đáo</p>
        </div>

        <Tabs defaultValue="all" className="mb-8">
          <TabsList className="grid w-full grid-cols-5 bg-black/40">
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="board">Bàn Cờ</TabsTrigger>
            <TabsTrigger value="piece">Quân Cờ</TabsTrigger>
            <TabsTrigger value="effect">Hiệu Ứng</TabsTrigger>
            <TabsTrigger value="gacha">Gacha</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {shopItems.map(item => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  owned={inventory.includes(item.id)}
                  onSelect={() => setSelectedItem(item)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="board" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {shopItems.filter(item => item.type === 'board').map(item => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  owned={inventory.includes(item.id)}
                  onSelect={() => setSelectedItem(item)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="piece" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {shopItems.filter(item => item.type === 'piece').map(item => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  owned={inventory.includes(item.id)}
                  onSelect={() => setSelectedItem(item)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="effect" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {shopItems.filter(item => item.type === 'effect').map(item => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  owned={inventory.includes(item.id)}
                  onSelect={() => setSelectedItem(item)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="gacha" className="mt-6">
            <div className="max-w-2xl mx-auto">
              <Card className="bg-gradient-to-br from-purple-600 to-pink-600 border-0 text-white">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <Sparkles className="w-16 h-16" />
                  </div>
                  <CardTitle className="text-3xl">✨ Gacha Huyền Bí</CardTitle>
                  <CardDescription className="text-white/90">
                    Thử vận may của bạn để nhận skin độc quyền!
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2 bg-white/20 hover:bg-white/30 border-white"
                      onClick={() => handleGacha(1)}
                    >
                      <Sparkles className="w-6 h-6" />
                      <span>Quay 1 lần</span>
                      <span className="text-xs">100 Vàng</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2 bg-white/20 hover:bg-white/30 border-white"
                      onClick={() => handleGacha(10)}
                    >
                      <Sparkles className="w-6 h-6" />
                      <span>Quay 10 lần</span>
                      <span className="text-xs">900 Vàng (Giảm 10%)</span>
                    </Button>
                  </div>

                  <div className="bg-black/30 p-4 rounded-lg">
                    <h3 className="mb-2">Tỷ lệ rơi:</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>⚪ Phổ Thông</span>
                        <span>50%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>🔵 Hiếm</span>
                        <span>30%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>🟣 Sử Thi</span>
                        <span>15%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>🟡 Huyền Thoại</span>
                        <span>5%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Item Detail Dialog */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedItem.name}
                <Badge className={rarityColors[selectedItem.rarity]}>
                  {rarityLabels[selectedItem.rarity]}
                </Badge>
              </DialogTitle>
              <DialogDescription>{selectedItem.description}</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center text-6xl mb-4">
                {selectedItem.type === 'board' ? '♟️' : selectedItem.type === 'piece' ? '♔' : '✨'}
              </div>
              <div className="flex items-center justify-between mb-4">
                <span>Giá:</span>
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-yellow-500" />
                  <span className="text-xl">{selectedItem.price}</span>
                </div>
              </div>
              {inventory.includes(selectedItem.id) ? (
                <Button className="w-full" disabled>
                  ✓ Đã sở hữu
                </Button>
              ) : (
                <Button 
                  className="w-full" 
                  onClick={() => handlePurchase(selectedItem)}
                  disabled={!user || user.gold < selectedItem.price}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Mua ngay
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Gacha Result Dialog */}
      {gachaResult && (
        <Dialog open={!!gachaResult} onOpenChange={() => setGachaResult(null)}>
          <DialogContent className="max-w-md">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <DialogHeader>
                <DialogTitle className="text-center text-2xl">
                  🎉 Chúc mừng!
                </DialogTitle>
              </DialogHeader>
              <div className="py-6">
                <div className="text-center mb-4">
                  <Badge className={`${rarityColors[gachaResult.rarity]} text-lg px-4 py-1`}>
                    {rarityLabels[gachaResult.rarity]}
                  </Badge>
                </div>
                <div className="aspect-video bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-8xl mb-4">
                  {gachaResult.type === 'board' ? '♟️' : gachaResult.type === 'piece' ? '♔' : '✨'}
                </div>
                <h3 className="text-2xl text-center mb-2">{gachaResult.name}</h3>
                <p className="text-center text-gray-600">{gachaResult.description}</p>
              </div>
              <Button className="w-full" onClick={() => setGachaResult(null)}>
                Tuyệt vời!
              </Button>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ShopItemCard({ 
  item, 
  owned, 
  onSelect 
}: { 
  item: ShopItem; 
  owned: boolean; 
  onSelect: () => void; 
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Card 
        className={`cursor-pointer ${owned ? 'border-green-500 border-2' : ''}`}
        onClick={onSelect}
      >
        <CardHeader>
          <div className="flex justify-between items-start mb-2">
            <CardTitle className="text-lg">{item.name}</CardTitle>
            <Badge className={rarityColors[item.rarity]}>
              {rarityLabels[item.rarity]}
            </Badge>
          </div>
          <CardDescription className="line-clamp-2">{item.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center text-5xl mb-3">
            {item.type === 'board' ? '♟️' : item.type === 'piece' ? '♔' : '✨'}
          </div>
          {owned ? (
            <Badge variant="outline" className="w-full justify-center border-green-500 text-green-500">
              ✓ Đã sở hữu
            </Badge>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              <span>{item.price}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
