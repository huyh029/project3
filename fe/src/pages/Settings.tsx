import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Slider } from "../components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Separator } from "../components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  ArrowLeft,
  Volume2,
  Music,
  Globe,
  Image,
  HelpCircle,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import { useGame } from "../context/GameContext";

interface SettingsProps {
  setIsAuthenticated: (value: boolean) => void;
  setIsGuest: (value: boolean) => void;
}

export default function Settings({ setIsAuthenticated, setIsGuest }: SettingsProps) {
  const navigate = useNavigate();
  const { logout } = useGame();
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState([70]);
  const [musicVolume, setMusicVolume] = useState([50]);
  const [language, setLanguage] = useState('vi');
  const [graphicsQuality, setGraphicsQuality] = useState('high');
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
    setIsGuest(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Button variant="outline" onClick={() => navigate('/home')} className="mb-6 text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Về trang chủ
        </Button>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl text-white mb-2">⚙️ Cài Đặt</h1>
          <p className="text-gray-300">Tùy chỉnh trải nghiệm chơi game của bạn</p>
        </div>

        <div className="space-y-6">
          {/* Audio Settings */}
          <Card>
            <CardHeader>
              <CardTitle>🔊 Âm thanh</CardTitle>
              <CardDescription>Điều chỉnh âm lượng và hiệu ứng âm thanh</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5" />
                  <Label htmlFor="sound">Hiệu ứng âm thanh</Label>
                </div>
                <Switch
                  id="sound"
                  checked={soundEnabled}
                  onCheckedChange={setSoundEnabled}
                />
              </div>

              {soundEnabled && (
                <div className="space-y-2 pl-7">
                  <Label>Âm lượng: {soundVolume[0]}%</Label>
                  <Slider
                    value={soundVolume}
                    onValueChange={setSoundVolume}
                    max={100}
                    step={1}
                  />
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music className="w-5 h-5" />
                  <Label htmlFor="music">Nhạc nền</Label>
                </div>
                <Switch
                  id="music"
                  checked={musicEnabled}
                  onCheckedChange={setMusicEnabled}
                />
              </div>

              {musicEnabled && (
                <div className="space-y-2 pl-7">
                  <Label>Âm lượng: {musicVolume[0]}%</Label>
                  <Slider
                    value={musicVolume}
                    onValueChange={setMusicVolume}
                    max={100}
                    step={1}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card>
            <CardHeader>
              <CardTitle>🌍 Ngôn ngữ</CardTitle>
              <CardDescription>Chọn ngôn ngữ hiển thị</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Globe className="w-5 h-5" />
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vi">🇻🇳 Tiếng Việt</SelectItem>
                    <SelectItem value="en">🇺🇸 English</SelectItem>
                    <SelectItem value="zh">🇨🇳 中文</SelectItem>
                    <SelectItem value="ja">🇯🇵 日本語</SelectItem>
                    <SelectItem value="ko">🇰🇷 한국어</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Graphics Settings */}
          <Card>
            <CardHeader>
              <CardTitle>🎨 Giao diện & Đồ họa</CardTitle>
              <CardDescription>Tùy chỉnh chất lượng hiển thị</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Image className="w-5 h-5" />
                <Select value={graphicsQuality} onValueChange={setGraphicsQuality}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Thấp (Tiết kiệm pin)</SelectItem>
                    <SelectItem value="medium">Trung bình</SelectItem>
                    <SelectItem value="high">Cao (Khuyến nghị)</SelectItem>
                    <SelectItem value="ultra">Siêu cao</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Help & Tutorial */}
          <Card>
            <CardHeader>
              <CardTitle>❓ Trợ giúp</CardTitle>
              <CardDescription>Hướng dẫn và hỗ trợ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowTutorial(true)}
              >
                <HelpCircle className="w-5 h-5 mr-2" />
                Hướng dẫn cách chơi
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <HelpCircle className="w-5 h-5 mr-2" />
                Quy tắc cờ vua
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <HelpCircle className="w-5 h-5 mr-2" />
                Liên hệ hỗ trợ
              </Button>
            </CardContent>
          </Card>

          {/* Account */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">🚪 Tài khoản</CardTitle>
              <CardDescription>Quản lý tài khoản của bạn</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={() => setShowConfirmLogout(true)}
              >
                <LogOut className="w-5 h-5 mr-2" />
                Đăng xuất
              </Button>
            </CardContent>
          </Card>

          {/* App Info */}
          <Card>
            <CardContent className="pt-6 text-center text-sm text-gray-500">
              <p>Chess Master v1.0.0</p>
              <p className="mt-1">© 2025 Chess Master. All rights reserved.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showConfirmLogout} onOpenChange={setShowConfirmLogout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              Xác nhận đăng xuất
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-4 mt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowConfirmLogout(false)}
            >
              Hủy
            </Button>
            <Button 
              variant="destructive" 
              className="flex-1"
              onClick={handleLogout}
            >
              Đăng xuất
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tutorial Dialog */}
      <Dialog open={showTutorial} onOpenChange={setShowTutorial}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📚 Hướng dẫn cách chơi</DialogTitle>
            <DialogDescription>
              Tìm hiểu cách sử dụng Chess Master
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <h3 className="mb-2">🎮 Các chế độ chơi</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li><strong>Chơi với Máy:</strong> Luyện tập với AI ở 3 mức độ khó</li>
                <li><strong>2 Người 1 Máy:</strong> Chơi với bạn bè trên cùng thiết bị</li>
                <li><strong>Chơi Online:</strong> Đối đầu với người chơi khác trên mạng</li>
                <li><strong>Chế độ Rank:</strong> Thi đấu xếp hạng, tăng ELO và rank</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="mb-2">♟️ Cách di chuyển quân cờ</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Click vào quân cờ để chọn</li>
                <li>Các ô có thể di chuyển s�� được đánh dấu màu xanh</li>
                <li>Click vào ô muốn di chuyển để thực hiện nước đi</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="mb-2">🏆 Hệ thống Rank & ELO</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Thắng: +25 ELO, +100 vàng, +50 kinh nghiệm</li>
                <li>Thua: -15 ELO, +10 kinh nghiệm</li>
                <li>Hòa: +5 ELO, +25 vàng, +25 kinh nghiệm</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="mb-2">🛒 Cửa hàng</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Mua skin bàn cờ, quân cờ và hiệu ứng đặc biệt</li>
                <li>Quay Gacha để nhận skin độc quyền</li>
                <li>Sử dụng vàng kiếm được từ trận đấu</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="mb-2">🎁 Nhiệm vụ</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Hoàn thành nhiệm vụ hằng ngày và tuần</li>
                <li>Tham gia sự kiện đặc biệt</li>
                <li>Nhận thưởng vàng, kinh nghiệm và vật phẩm</li>
              </ul>
            </div>
          </div>
          <Button onClick={() => setShowTutorial(false)} className="w-full">
            Đã hiểu
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
