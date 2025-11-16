import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';

interface GameModeSelectorProps {
  onClose: () => void;
  isGuest: boolean;
}

export default function GameModeSelector({ onClose, isGuest }: GameModeSelectorProps) {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<string>('');
  const [difficulty, setDifficulty] = useState('normal');
  const [timeLimit, setTimeLimit] = useState('unlimited');

  const handleStart = () => {
    if (!selectedMode) return;
    
    navigate(`/game/${selectedMode}`, {
      state: { difficulty, timeLimit }
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chọn Chế Độ Chơi</DialogTitle>
          <DialogDescription>
            Lựa chọn cách chơi phù hợp với bạn
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <RadioGroup value={selectedMode} onValueChange={setSelectedMode}>
            <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <RadioGroupItem value="ai" id="ai" />
              <Label htmlFor="ai" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <span>🤖 Chơi với Máy (AI)</span>
                </div>
                <p className="text-sm text-gray-500">Luyện tập với đối thủ máy tính</p>
              </Label>
            </div>

            <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <RadioGroupItem value="local" id="local" />
              <Label htmlFor="local" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <span>👥 2 Người Trên 1 Máy</span>
                </div>
                <p className="text-sm text-gray-500">Chơi cùng bạn bè trên cùng thiết bị</p>
              </Label>
            </div>

            {!isGuest && (
              <>
                <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <RadioGroupItem value="online" id="online" />
                  <Label htmlFor="online" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span>🌐 Chơi Online</span>
                    </div>
                    <p className="text-sm text-gray-500">Đối đầu với người chơi khác trên mạng</p>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <RadioGroupItem value="ranked" id="ranked" />
                  <Label htmlFor="ranked" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span>🏆 Chế độ Rank</span>
                    </div>
                    <p className="text-sm text-gray-500">Thi đấu xếp hạng, tăng ELO</p>
                  </Label>
                </div>
              </>
            )}
          </RadioGroup>

          {selectedMode === 'ai' && (
            <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
              <Label>Độ khó</Label>
              <RadioGroup value={difficulty} onValueChange={setDifficulty} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="easy" id="easy" />
                  <Label htmlFor="easy">Dễ</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="normal" id="normal" />
                  <Label htmlFor="normal">Trung bình</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hard" id="hard" />
                  <Label htmlFor="hard">Khó</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {(selectedMode === 'local' || selectedMode === 'ai') && (
            <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
              <Label>Thời gian mỗi người</Label>
              <RadioGroup value={timeLimit} onValueChange={setTimeLimit} className="flex gap-4 flex-wrap">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1" id="1min" />
                  <Label htmlFor="1min">1 phút</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="3" id="3min" />
                  <Label htmlFor="3min">3 phút</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="5" id="5min" />
                  <Label htmlFor="5min">5 phút</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="10" id="10min" />
                  <Label htmlFor="10min">10 phút</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="unlimited" id="unlimited" />
                  <Label htmlFor="unlimited">Vô hạn</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="flex gap-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Hủy
            </Button>
            <Button 
              onClick={handleStart} 
              disabled={!selectedMode}
              className="flex-1"
            >
              Bắt Đầu Chơi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
