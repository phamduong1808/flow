import React, { useState, useEffect } from 'react';
import { SectionLabel, PillButton, FieldDropdown, TextInput } from './UI';
import type { MediaItem } from 'flow-sdk';
import type { ModelCapability, VideoResolution, ReferenceGroup, VideoAspectRatio, DialogueEntry } from '../App';
interface WorkspaceProps {
  productImages: MediaItem[];
  characterImages: MediaItem[];
  backgroundImages: MediaItem[];
  dialogueEntries: DialogueEntry[];
  addDialogue: () => void;
  updateDialogueCharacter: (id: string, idx: number) => void;
  updateDialogueText: (id: string, txt: string) => void;
  removeDialogue: (id: string) => void;
  additionalPrompt: string;
  setAdditionalPrompt: (v: string) => void;
  handleSelectGroup: (g: ReferenceGroup) => void;
  removeImage: (g: ReferenceGroup, i: number) => void;
  selectedModel: string;
  setSelectedModel: (v: string) => void;
  selectedDuration: string;
  setSelectedDuration: (v: string) => void;
  selectedRatio: VideoAspectRatio;
  setSelectedRatio: (v: VideoAspectRatio) => void;
  selectedResolution: VideoResolution;
  setSelectedResolution: (v: VideoResolution) => void;
  isGenerating: boolean;
  generateVideo: () => void;
  error: string | null;
  capabilities: ModelCapability;
  selectingGroup: ReferenceGroup | null;
  hasUnchangedSuccessfulInputs: boolean;
}
const MODELS = [
  { value: 'Omni 1.1 Flash', label: 'Omni 1.1 Flash', description: 'Tối ưu cho Facebook Ads, hỗ trợ ảnh tham chiếu và 4–10 giây.' },
  { value: 'Veo 3.1 - Lite', label: 'Veo 3.1 Lite', description: 'Hỗ trợ ảnh tham chiếu, video 8 giây.' },
  { value: 'Veo 3.1 - Fast', label: 'Veo 3.1 Fast', description: 'Tạo nhanh, hỗ trợ ảnh tham chiếu, video 8 giây.' },
  { value: 'Veo 3.1 - Quality', label: 'Veo 3.1 Quality', description: 'Chất lượng điện ảnh cao, không dùng ảnh tham chiếu trực tiếp.' },
];
export const CreativeWorkspace: React.FC<WorkspaceProps> = ({
  productImages, characterImages, backgroundImages,
  dialogueEntries, addDialogue, updateDialogueCharacter, updateDialogueText, removeDialogue,
  additionalPrompt, setAdditionalPrompt,
  handleSelectGroup, removeImage,
  selectedModel, setSelectedModel,
  selectedDuration, setSelectedDuration,
  selectedRatio, setSelectedRatio,
  selectedResolution, setSelectedResolution,
  isGenerating, generateVideo, error,
  capabilities, selectingGroup,
  hasUnchangedSuccessfulInputs
}) => {
  const [confirmRepeatGeneration, setConfirmRepeatGeneration] = useState(false);
  const durationOptions = capabilities.supportedDurations;
  const resolutionOptions = capabilities.supportedResolutions.map((r: VideoResolution) => ({
    value: r,
    label: '720p HD',
    description: 'Nét nhất cho Facebook.'
  }));
  const isModelLocked = isGenerating;
  const hasProduct = productImages.length > 0;
  const hasCharacters = characterImages.length > 0;
  const characterOptions = characterImages.map((img, i) => ({
    value: i.toString(),
    label: `Nhân vật ${i + 1}`,
    description: 'Ảnh nhân vật đã tải',
    thumbnailSrc: `data:${img.mimeType};base64,${img.base64}`
  }));
  // Task #8E: Auto cancel confirmation mode if inputs change
  useEffect(() => {
    if (!hasUnchangedSuccessfulInputs) {
      setConfirmRepeatGeneration(false);
    }
  }, [hasUnchangedSuccessfulInputs]);
  const handleCreateClick = () => {
    if (hasUnchangedSuccessfulInputs && !confirmRepeatGeneration) {
      setConfirmRepeatGeneration(true);
      return;
    }
    
    setConfirmRepeatGeneration(false);
    generateVideo();
  };
  return (
    <div className="flex flex-col min-h-0 lg:h-full border-r border-[#8B5CF6]/15 bg-[#0D0913]">
      <div className="flex-1 lg:overflow-y-auto dark-scrollbar p-6 lg:p-8 space-y-8">
        
        {/* ASSETS SECTION */}
        <div className="space-y-5">
          <div className="flex flex-col gap-3">
            <SectionLabel>ẢNH SẢN PHẨM (CHÍNH)</SectionLabel>
            {productImages.length === 0 ? (
              <PillButton 
                variant="outline" 
                icon={<span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>} 
                onClick={() => handleSelectGroup('product')} 
                disabled={selectingGroup !== null || isGenerating} 
                className="h-[100px] border-dashed border-white/10 hover:bg-white/[0.02]"
              >
                CHỌN ẢNH SẢN PHẨM TỪ THƯ VIỆN FLOW
              </PillButton>
            ) : (
              <div className="flex flex-wrap gap-2">
                {productImages.map((img, i) => (
                  <div key={img.mediaId} className="relative w-[72px] h-[72px] shrink-0 rounded-xl overflow-hidden border border-white/10 group">
                    <img src={`data:${img.mimeType};base64,${img.base64}`} className="w-full h-full object-cover" />
                    {!isGenerating && (
                      <button 
                        onClick={() => removeImage('product', i)} 
                        className="absolute top-1 right-1 z-10 w-6 h-6 bg-black/65 rounded-full flex items-center justify-center transition-all opacity-90 lg:opacity-0 lg:group-hover:opacity-100"
                      >
                        <span className="material-symbols-outlined text-[14px] text-red-400 font-bold">close</span>
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  onClick={() => handleSelectGroup('product')}
                  disabled={selectingGroup !== null || isGenerating}
                  className="w-[72px] h-[72px] shrink-0 rounded-xl border border-dashed border-[#8B5CF6]/30 hover:border-[#8B5CF6]/60 hover:bg-[#8B5CF6]/5 flex items-center justify-center transition-all disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[20px] text-[#A78BFA]">add</span>
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* CHARACTER GROUP */}
            <div className="flex flex-col gap-3">
              <SectionLabel>NHÂN VẬT</SectionLabel>
              {characterImages.length === 0 ? (
                <PillButton 
                  variant="outline" 
                  icon={<span className="material-symbols-outlined text-[20px]">person_add</span>} 
                  onClick={() => handleSelectGroup('character')} 
                  disabled={selectingGroup !== null || isGenerating}
                >
                  Tải Presenter
                </PillButton>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {characterImages.map((img, i) => (
                    <div key={img.mediaId} className="relative w-[72px] h-[72px] shrink-0 rounded-xl overflow-hidden border border-white/10 group">
                      <img src={`data:${img.mimeType};base64,${img.base64}`} className="w-full h-full object-cover" />
                      {!isGenerating && (
                        <button 
                          onClick={() => removeImage('character', i)} 
                          className="absolute top-1 right-1 z-10 w-6 h-6 bg-black/65 rounded-full flex items-center justify-center transition-all opacity-90 lg:opacity-0 lg:group-hover:opacity-100"
                        >
                          <span className="material-symbols-outlined text-[14px] text-red-400 font-bold">close</span>
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    onClick={() => handleSelectGroup('character')}
                    disabled={selectingGroup !== null || isGenerating}
                    className="w-[72px] h-[72px] shrink-0 rounded-xl border border-dashed border-[#8B5CF6]/30 hover:border-[#8B5CF6]/60 hover:bg-[#8B5CF6]/5 flex items-center justify-center transition-all disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#A78BFA]">add</span>
                  </button>
                </div>
              )}
            </div>
            {/* BACKGROUND GROUP */}
            <div className="flex flex-col gap-3">
              <SectionLabel>BỐI CẢNH</SectionLabel>
              {backgroundImages.length === 0 ? (
                <PillButton 
                  variant="outline" 
                  icon={<span className="material-symbols-outlined text-[20px]">landscape</span>} 
                  onClick={() => handleSelectGroup('background')} 
                  disabled={selectingGroup !== null || isGenerating}
                >
                  Tải Background
                </PillButton>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {backgroundImages.map((img, i) => (
                    <div key={img.mediaId} className="relative w-[72px] h-[72px] shrink-0 rounded-xl overflow-hidden border border-white/10 group">
                      <img src={`data:${img.mimeType};base64,${img.base64}`} className="w-full h-full object-cover" />
                      {!isGenerating && (
                        <button 
                          onClick={() => removeImage('background', i)} 
                          className="absolute top-1 right-1 z-10 w-6 h-6 bg-black/65 rounded-full flex items-center justify-center transition-all opacity-90 lg:opacity-0 lg:group-hover:opacity-100"
                        >
                          <span className="material-symbols-outlined text-[14px] text-red-400 font-bold">close</span>
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    onClick={() => handleSelectGroup('background')}
                    disabled={selectingGroup !== null || isGenerating}
                    className="w-[72px] h-[72px] shrink-0 rounded-xl border border-dashed border-[#8B5CF6]/30 hover:border-[#8B5CF6]/60 hover:bg-[#8B5CF6]/5 flex items-center justify-center transition-all disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#A78BFA]">add</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* DIALOGUE SECTION */}
        <div className="space-y-4 pt-6 border-t border-white/5">
          <SectionLabel>LỜI THOẠI</SectionLabel>
          <p className="text-[10px] text-white/30 font-medium px-1">Để trống lời thoại = AI tự tạo lời thoại tiếng Việt.</p>
          
          <div className="grid grid-cols-1 min-[900px]:grid-cols-2 gap-x-4 gap-y-4">
            {dialogueEntries.map((entry, i) => (
              <div key={entry.id} className="relative min-w-0 space-y-2 group">
                {/* Close Overlay X */}
                <button 
                  onClick={() => removeDialogue(entry.id)} 
                  disabled={isGenerating}
                  className="absolute -top-1 -right-1 z-20 w-6 h-6 bg-black/65 rounded-full flex items-center justify-center transition-all opacity-90 min-[900px]:opacity-0 min-[900px]:group-hover:opacity-100 disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-[14px] text-red-400 font-bold">close</span>
                </button>
                <FieldDropdown 
                  label="NGƯỜI NÓI" 
                  value={entry.characterIndex.toString()} 
                  options={characterOptions.length > 0 ? characterOptions : [{ value: '0', label: 'Chưa có nhân vật' }]} 
                  onChange={(val) => updateDialogueCharacter(entry.id, parseInt(val))}
                  disabled={isGenerating || !hasCharacters}
                  className="w-full min-w-0"
                />
                
                <textarea 
                  value={entry.text}
                  onChange={(e) => updateDialogueText(entry.id, e.target.value)}
                  disabled={isGenerating}
                  placeholder="Nhập lời thoại tiếng Việt... Để trống để AI tự tạo."
                  className="w-full h-[58px] bg-white/[0.015] border border-white/[0.06] rounded-xl px-3 py-2.5 text-[12px] font-medium text-white/90 placeholder-white/20 resize-none focus:outline-none focus:border-[#8B5CF6]/40 transition-colors"
                />
              </div>
            ))}
            {/* SMART ADD TILE */}
            <button 
              onClick={addDialogue}
              disabled={isGenerating || !hasCharacters}
              className={`
                rounded-xl border border-dashed border-[#8B5CF6]/30 hover:border-[#8B5CF6]/60 
                hover:bg-[#8B5CF6]/5 flex items-center justify-center transition-all disabled:opacity-40
                min-h-[58px]
                ${dialogueEntries.length % 2 === 0 
                  ? 'min-[900px]:col-span-2' 
                  : 'min-[900px]:min-h-[116px]'
                }
              `}
            >
              <span className="material-symbols-outlined text-[24px] text-[#A78BFA]">add</span>
            </button>
          </div>
          {!hasCharacters && <p className="text-[10px] text-amber-400/60 font-medium px-1 italic">Tải ít nhất 1 ảnh nhân vật để gán lời thoại.</p>}
        </div>
        {/* SETTINGS SECTION */}
        <div className="space-y-5 pt-6 border-t border-white/5">
          <SectionLabel>CẤU HÌNH SẢN XUẤT</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 min-[1200px]:grid-cols-4 gap-3">
            <FieldDropdown
              label="MÔ HÌNH THẾ HỆ MỚI"
              value={selectedModel}
              options={MODELS}
              onChange={setSelectedModel}
              disabled={isModelLocked}
              className="w-full min-w-0"
            />
            <FieldDropdown
              label="THỜI LƯỢNG"
              value={selectedDuration}
              options={durationOptions}
              onChange={setSelectedDuration}
              disabled={isModelLocked}
              className="w-full min-w-0"
            />
            <FieldDropdown
              label="TỶ LỆ KHUNG HÌNH"
              value={selectedRatio}
              options={['9:16', '16:9']}
              onChange={(v) => {
                if (v === '9:16' || v === '16:9') {
                  setSelectedRatio(v);
                }
              }}
              disabled={isModelLocked}
              className="w-full min-w-0"
            />
            <FieldDropdown
              label="CHẤT LƯỢNG"
              value={selectedResolution}
              options={resolutionOptions}
              onChange={(v) => {
                if (v === '720p') {
                  setSelectedResolution(v);
                }
              }}
              disabled={isModelLocked}
              className="w-full min-w-0"
            />
          </div>
        </div>
        {/* CREATIVE DIRECTION SECTION */}
        <div className="space-y-4 pt-6 border-t border-white/5 pb-6">
          <SectionLabel>YÊU CẦU SÁNG TẠO BỔ SUNG</SectionLabel>
          <TextInput value={additionalPrompt} onChange={setAdditionalPrompt} disabled={isGenerating} placeholder="Góc máy, ánh sáng, hành động sản phẩm hoặc concept quảng cáo..." />
        </div>
      </div>
      {/* STICKY CTA */}
      <div className="shrink-0 p-6 bg-[#0D0913]/95 backdrop-blur-xl border-t border-[#8B5CF6]/20 z-10">
        <div className="flex flex-col gap-3 max-w-2xl mx-auto">
          {error && <div className="text-[12px] text-red-400 bg-red-400/5 px-4 py-3 rounded-2xl border border-red-400/10">{error}</div>}
          
          {!isGenerating && (
            <div className="flex flex-col gap-3 w-full">
              {confirmRepeatGeneration ? (
                <div className="flex flex-col gap-3 p-4 bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <p className="text-[11px] font-bold text-center text-[#A78BFA] uppercase tracking-wider">
                    Dữ liệu chưa thay đổi. Bạn muốn tạo thêm video với cùng dữ liệu?
                  </p>
                  <div className="flex gap-2">
                    <PillButton 
                      variant="outline" 
                      onClick={() => setConfirmRepeatGeneration(false)}
                      className="flex-1 border-white/10"
                    >
                      HỦY
                    </PillButton>
                    <PillButton 
                      variant="solid" 
                      onClick={handleCreateClick}
                      className="flex-1"
                    >
                      XÁC NHẬN TẠO TIẾP
                    </PillButton>
                  </div>
                </div>
              ) : (
                <PillButton 
                  variant="solid" 
                  onClick={handleCreateClick} 
                  disabled={selectingGroup !== null || !hasProduct || !hasCharacters} 
                  className="h-[52px] rounded-2xl shadow-[0_0_40px_rgba(139,92,246,0.25)]" 
                  icon={<span className="material-symbols-outlined text-[24px]">movie_edit</span>}
                >
                  BẮT ĐẦU TẠO
                </PillButton>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
