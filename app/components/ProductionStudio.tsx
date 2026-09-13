import React, { useState, useEffect, useRef } from 'react';
import { PillButton } from './UI';
import type { GenerationStage } from '../App';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';
interface StudioProps {
  generationStage: GenerationStage;
  generatedVideo: { url: string; mediaId: string; mimeType: string } | null;
  isGenerating: boolean;
  selectedRatio: string;
  handleDownload: () => void;
  saveState: SaveState;
}
export const ProductionStudio: React.FC<StudioProps> = ({
  generationStage, generatedVideo, isGenerating,
  selectedRatio, handleDownload, saveState
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastSuccessfulElapsedSeconds, setLastSuccessfulElapsedSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastCompletedMediaIdRef = useRef<string | null>(null);
  // Timer logic for live display
  useEffect(() => {
    if (isGenerating) {
      setElapsedSeconds(0);
      startTimeRef.current = Date.now();
      
      timerRef.current = window.setInterval(() => {
        const seconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedSeconds(seconds);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isGenerating]);
  // Capture successful generation duration
  useEffect(() => {
    if (!isGenerating && generationStage === 'complete' && generatedVideo) {
      if (generatedVideo.mediaId !== lastCompletedMediaIdRef.current) {
        // This is a new successful generation
        const finalSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
        if (finalSeconds > 0) {
          setLastSuccessfulElapsedSeconds(finalSeconds);
        }
        lastCompletedMediaIdRef.current = generatedVideo.mediaId;
      }
    }
  }, [isGenerating, generationStage, generatedVideo]);
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  const formatCompletedTime = (totalSeconds: number) => {
    if (totalSeconds <= 0) return '';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins > 0) {
      return `${mins}p${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  };
  return (
    <div className="relative min-h-[500px] lg:h-full flex flex-col items-center justify-center studio-gradient bg-[#07050B] py-10 lg:py-0">
      
      {/* 1. GENERATING STATE */}
      {isGenerating ? (
        <div className="flex flex-col items-center justify-center gap-6 animate-in fade-in duration-500">
          <div className="relative flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-[#8B5CF6]/5 rounded-full border border-[#8B5CF6]/20 flex items-center justify-center shadow-2xl purple-glow relative overflow-hidden">
               <div className="animate-shimmer" />
               <span className="material-symbols-outlined text-[42px] text-[#8B5CF6] animate-spin relative z-10">sync</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[32px] font-black text-white tabular-nums tracking-tighter">
                {formatTime(elapsedSeconds)}
              </span>
              <span className="text-[11px] font-bold text-[#A78BFA] uppercase tracking-[3px] mt-1">
                Đang tạo video...
              </span>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 2. IDLE STATE */}
          {!generatedVideo && generationStage === 'idle' && (
            <div className="flex flex-col items-center max-w-lg text-center px-10 animate-in fade-in zoom-in duration-700">
              <div className="w-20 h-20 bg-[#8B5CF6]/5 rounded-[2.5rem] border border-[#8B5CF6]/15 flex items-center justify-center mb-8 shadow-2xl purple-glow">
                <span className="material-symbols-outlined text-[36px] text-[#8B5CF6]/60">facebook</span>
              </div>
              <h2 className="text-[22px] font-extrabold text-white mb-3 tracking-tight uppercase">Facebook Ad Engine V2</h2>
              <p className="text-[14px] text-white/30 leading-relaxed font-medium">
                Hệ thống AI chuyển đổi ảnh sản phẩm thành video quảng cáo Facebook chuyên nghiệp. Tối ưu cho chuyển đổi.
              </p>
            </div>
          )}
          {/* 3. COMPLETED STATE */}
          {generationStage === 'complete' && generatedVideo && (
            <div className="flex flex-col items-center gap-8 h-full w-full p-6 lg:p-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className={`relative shadow-[0_30px_100px_rgba(0,0,0,0.8)] rounded-[2rem] overflow-hidden border border-[#8B5CF6]/20 bg-black flex-1 purple-glow ${selectedRatio === '9:16' ? 'aspect-[9/16]' : 'w-full max-w-5xl aspect-[16/9]'}`}>
                <video src={generatedVideo.url} className="h-full w-full object-contain" controls autoPlay loop />
              </div>
              
              <div className="flex items-center justify-between gap-4 w-full max-w-md">
                {/* Completed time status */}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Trạng thái</span>
                  <span className="text-[13px] font-bold text-[#A78BFA]">Hoàn thành {formatCompletedTime(lastSuccessfulElapsedSeconds)}</span>
                </div>
                <PillButton 
                  variant="solid" 
                  onClick={handleDownload} 
                  disabled={saveState === 'saving'} 
                  className="h-[48px] rounded-2xl px-8" 
                  icon={<span className="material-symbols-outlined text-[20px]">{saveState === 'saved' ? 'done' : 'download_for_offline'}</span>}
                >
                  {saveState === 'idle' ? 'TẢI VIDEO' : saveState === 'saving' ? 'Đang chuẩn bị...' : saveState === 'saved' ? 'Đã mở tải xuống ✓' : 'Lỗi tải'}
                </PillButton>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
