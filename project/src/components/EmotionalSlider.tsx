import React, { useState } from 'react';

interface EmotionalSliderProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
}

const EmotionalSlider: React.FC<EmotionalSliderProps> = ({ value, onChange, label }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const emotions = [
    { score: 0, label: 'Very Low', color: '#EF4444', emoji: '😢' },
    { score: 2, label: 'Low', color: '#F97316', emoji: '😔' },
    { score: 4, label: 'Somewhat Low', color: '#F59E0B', emoji: '😕' },
    { score: 5, label: 'Neutral', color: '#84CC16', emoji: '😐' },
    { score: 6, label: 'Somewhat Good', color: '#22C55E', emoji: '🙂' },
    { score: 8, label: 'Good', color: '#06B6D4', emoji: '😊' },
    { score: 10, label: 'Great', color: '#0EA5E9', emoji: '😄' }
  ];

  const getCurrentEmotion = (val: number) => {
    return emotions.reduce((prev, curr) => {
      return Math.abs(curr.score - val) < Math.abs(prev.score - val) ? curr : prev;
    });
  };

  const currentEmotion = getCurrentEmotion(hoverValue ?? value);

  const getGradient = () => {
    return `linear-gradient(to right, 
      ${emotions[0].color} 0%,
      ${emotions[2].color} 30%,
      ${emotions[3].color} 50%,
      ${emotions[4].color} 70%,
      ${emotions[6].color} 100%
    )`;
  };

  const handleSliderChange = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const slider = e.currentTarget;
    const rect = slider.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const percentage = x / rect.width;
    const newValue = Math.min(10, Math.max(0, percentage * 10));
    onChange(parseFloat(newValue.toFixed(1)));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleSliderChange(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      handleSliderChange(e);
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    setHoverValue(Math.min(10, Math.max(0, percentage * 10)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleSliderChange(e);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isDragging) {
      handleSliderChange(e);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  return (
    <div className="w-full bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
      {label && (
        <label className="block text-lg font-medium mb-4 text-center">
          {label}
        </label>
      )}
      
      <div className="flex flex-col items-center space-y-6">
        <div
          key={currentEmotion.emoji}
          className="text-6xl transition-all duration-200 transform"
          style={{ 
            transform: isDragging ? 'scale(1.2)' : 'scale(1)',
            color: currentEmotion.color 
          }}
        >
          {currentEmotion.emoji}
        </div>

        <div
          className="text-lg font-medium text-center transition-colors duration-200"
          style={{ color: currentEmotion.color }}
        >
          {currentEmotion.label}
        </div>

        <div className="w-full space-y-4">
          <div 
            className="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden cursor-pointer"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
          >
            <div 
              className="absolute inset-0 rounded-full"
              style={{ background: getGradient() }}
            />
            <div
              className="absolute top-1/2 w-6 h-6 bg-white rounded-full shadow-lg border-2 -mt-3 -ml-3 transition-transform duration-200"
              style={{ 
                borderColor: currentEmotion.color,
                left: `${(value / 10) * 100}%`,
                transform: isDragging ? 'scale(1.2)' : 'scale(1)',
                backgroundColor: isDragging ? currentEmotion.color : '#fff'
              }}
            />
          </div>

          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 px-2">
            <span>Not well at all</span>
            <span>Feeling great</span>
          </div>

          <div className="text-center text-2xl font-bold" style={{ color: currentEmotion.color }}>
            {value.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmotionalSlider;