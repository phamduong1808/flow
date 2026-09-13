import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Flow } from 'flow-sdk';
import type { MediaItem } from 'flow-sdk';
import { CreativeWorkspace } from './components/CreativeWorkspace';
import { ProductionStudio } from './components/ProductionStudio';
// --- Configuration & Types ---
export type GenerationStage = 'idle' | 'analyzing' | 'directing' | 'references' | 'rendering' | 'complete';
export type VideoResolution = '720p';
export type ReferenceGroup = 'product' | 'character' | 'background';
export type VideoAspectRatio = '9:16' | '16:9';
// --- Task #10B-1: Reference Entity Foundation Types ---
export type ReferenceAssetType = 'image' | 'video';
export interface ReferenceAsset {
  mediaId: string;
  type: ReferenceAssetType;
  mimeType: string;
  base64: string;
  name: string;
}
export interface ReferenceEntity {
  id: string;
  name: string;
  assets: ReferenceAsset[];
}
// --- Task #10B-2: Domain Entity Types ---
export interface ProductEntity extends ReferenceEntity {}
export interface CharacterEntity extends ReferenceEntity {}
export interface EnvironmentEntity extends ReferenceEntity {}
// --- Task #10B-3: Continuity Context Types ---
export interface ContinuitySceneState {
  activeCharacterIds: string[];
  currentSpeakerId?: string;
  productHolderCharacterId?: string;
  productState?: string;
  environmentId?: string;
  cameraState?: string;
  actionState?: string;
  narrativeState?: string;
}
export interface ContinuityContext {
  previousSegmentId?: string;
  previousVideoMediaId?: string;
  previousFinalFrameMediaId?: string;
  sceneState?: ContinuitySceneState;
}
// --- Task #10B-4: Long-form Project / Segment Foundation Types ---
export type SegmentStatus =
  | 'pending'
  | 'generating'
  | 'complete'
  | 'failed';
export interface GenerationProfile {
  modelDisplayName: string;
  segmentDurationSeconds: number;
  aspectRatio: VideoAspectRatio;
  resolution: VideoResolution;
}
export interface VideoSegment {
  id: string;
  index: number;
  startSecond: number;
  endSecond: number;
  durationSeconds: number;
  status: SegmentStatus;
  mediaId?: string;
  mimeType?: string;
  previousSegmentId?: string;
  continuity?: ContinuityContext;
}
export interface VideoProject {
  id: string;
  targetDurationSeconds: number;
  generationProfile: GenerationProfile;
  segments: VideoSegment[];
}
// --- Task #10B-5: Generation Reference Payload Foundation ---
export interface GenerationReferencePayload {
  referenceImageMediaIds: string[];
  sourceVideoMediaId?: string;
  firstFrameImageMediaId?: string;
  lastFrameImageMediaId?: string;
}
export interface DialogueEntry {
  id: string;
  characterIndex: number;
  text: string;
}
export interface ModelCapability {
  supportsReferences: boolean;
  maxReferences: number;
  supportedDurations: string[];
  supportedResolutions: VideoResolution[];
}
export const MODEL_CAPABILITIES: Record<string, ModelCapability> = {
  'Omni 1.1 Flash': {
    supportsReferences: true,
    maxReferences: 7,
    supportedDurations: ['4 giây', '6 giây', '8 giây', '10 giây'],
    supportedResolutions: ['720p'],
  },
  'Veo 3.1 - Lite': {
    supportsReferences: true,
    maxReferences: 3,
    supportedDurations: ['8 giây'],
    supportedResolutions: ['720p'],
  },
  'Veo 3.1 - Fast': {
    supportsReferences: true,
    maxReferences: 3,
    supportedDurations: ['8 giây'],
    supportedResolutions: ['720p'],
  },
  'Veo 3.1 - Quality': {
    supportsReferences: false,
    maxReferences: 0,
    supportedDurations: ['4 giây', '6 giây', '8 giây'],
    supportedResolutions: ['720p'],
  },
};
// --- Task #10D-1: Image MediaItem to ReferenceAsset Adapter ---
const imageMediaItemToReferenceAsset = (item: MediaItem): ReferenceAsset => ({
  mediaId: item.mediaId,
  type: 'image',
  mimeType: item.mimeType,
  base64: item.base64,
  name: item.name
});
// --- Task #10C-2: Pure Allocator Function (Updated for Task #10D-2) ---
const allocateGenerationReferences = (
  productEntity: ProductEntity,
  characterImages: MediaItem[],
  environmentEntity: EnvironmentEntity | null,
  activeSpeakerIndexes: number[]
): GenerationReferencePayload => {
  const referenceImageMediaIds: string[] = [];
  // SLOT 1: Primary Product (Task #10D-1: Use Entity Assets)
  referenceImageMediaIds.push(productEntity.assets[0].mediaId);
  // SLOT 2..N: Active Presenters (Preserve Order)
  activeSpeakerIndexes.forEach((charIdx) => {
    referenceImageMediaIds.push(characterImages[charIdx].mediaId);
  });
  // SLOT CUỐI: Background if exists (Task #10D-2: Use Entity Assets)
  if (environmentEntity) {
    referenceImageMediaIds.push(environmentEntity.assets[0].mediaId);
  }
  return {
    referenceImageMediaIds
  };
};
export default function App() {
  // --- State for Reference Groups ---
  const [productImages, setProductImages] = useState<MediaItem[]>([]);
  const [characterImages, setCharacterImages] = useState<MediaItem[]>([]);
  const [backgroundImages, setBackgroundImages] = useState<MediaItem[]>([]);
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  // --- Dialogue State ---
  const dialogueIdRef = useRef(2);
  const [dialogueEntries, setDialogueEntries] = useState<DialogueEntry[]>([
    { id: 'dialogue-1', characterIndex: 0, text: '' }
  ]);
  // --- UI & Generation State ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<GenerationStage>('idle');
  const [generatedVideo, setGeneratedVideo] = useState<{ url: string, mediaId: string, mimeType: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [selectingGroup, setSelectingGroup] = useState<ReferenceGroup | null>(null);
  
  // --- Settings ---
  const [selectedModel, setSelectedModel] = useState('Omni 1.1 Flash');
  const [selectedDuration, setSelectedDuration] = useState('10 giây');
  const [selectedRatio, setSelectedRatio] = useState<VideoAspectRatio>('9:16');
  const [selectedResolution, setSelectedResolution] = useState<VideoResolution>('720p');
  // --- Task #8E/8F: Tracking Unchanged Inputs ---
  const [lastSuccessfulGenerationSignature, setLastSuccessfulGenerationSignature] = useState<string | null>(null);
  const currentGenerationSignature = useMemo(() => {
    return JSON.stringify({
      productMediaIds: productImages.map(item => item.mediaId),
      characterMediaIds: characterImages.map(item => item.mediaId),
      backgroundMediaIds: backgroundImages.map(item => item.mediaId),
      dialogue: dialogueEntries.map(entry => ({
        characterIndex: entry.characterIndex,
        text: entry.text
      })),
      additionalPrompt,
      selectedModel,
      selectedDuration,
      selectedRatio,
      selectedResolution
    });
  }, [
    productImages, characterImages, backgroundImages, 
    dialogueEntries, additionalPrompt, selectedModel, 
    selectedDuration, selectedRatio, selectedResolution
  ]);
  const hasUnchangedSuccessfulInputs = lastSuccessfulGenerationSignature !== null && 
    lastSuccessfulGenerationSignature === currentGenerationSignature;
  const capabilities = MODEL_CAPABILITIES[selectedModel] || MODEL_CAPABILITIES['Omni 1.1 Flash'];
  const currentVideoUrlRef = useRef<string | null>(null);
  const downloadInFlightRef = useRef(false);
  const generationInFlightRef = useRef(false);
  // --- Model Capability Synchronization ---
  useEffect(() => {
    if (!capabilities.supportedDurations.includes(selectedDuration)) {
      setSelectedDuration(
        capabilities.supportedDurations[capabilities.supportedDurations.length - 1]
      );
    }
  }, [selectedModel, capabilities.supportedDurations, selectedDuration]);
  useEffect(() => {
    if (!capabilities.supportedResolutions.includes(selectedResolution)) {
      setSelectedResolution(capabilities.supportedResolutions[0]);
    }
  }, [selectedModel, capabilities.supportedResolutions, selectedResolution]);
  // --- Theme & Cleanup ---
  useEffect(() => {
    const id = 'fb-ad-engine-v2-theme';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = `
        :root {
          --bg-root: #07050B;
          --bg-panel: #0D0913;
          --bg-surface: #120C1B;
          --purple-primary: #8B5CF6;
          --purple-bright: #A78BFA;
          --border-soft: rgba(167, 139, 250, 0.14);
        }
        .dark-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(139, 92, 246, 0.2) transparent; }
        .dark-scrollbar::-webkit-scrollbar { width: 4px; }
        .dark-scrollbar::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.2); border-radius: 10px; }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-shimmer { position: absolute; inset: 0; animation: shimmer 2.5s infinite; background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.08), transparent); }
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; background: var(--bg-root); color: white; font-family: 'Google Sans Text', sans-serif; overflow-x: hidden; }
        .purple-glow { filter: drop-shadow(0 0 15px rgba(139, 92, 246, 0.15)); }
        .studio-gradient { background: radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.05) 0%, transparent 80%); }
        @keyframes dropdown-enter { from { opacity: 0; transform: scale(0.95) translateY(-5px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-dropdown { animation: dropdown-enter 0.15s ease-out forwards; }
      `;
      document.head.appendChild(style);
    }
    return () => {
      if (currentVideoUrlRef.current) {
        URL.revokeObjectURL(currentVideoUrlRef.current);
        currentVideoUrlRef.current = null;
      }
    };
  }, []);
  const revokeOldUrl = () => {
    if (currentVideoUrlRef.current) {
      URL.revokeObjectURL(currentVideoUrlRef.current);
      currentVideoUrlRef.current = null;
    }
  };
  // --- Dialogue Handlers ---
  const addDialogue = () => {
    if (isGenerating || characterImages.length === 0) return;
    const usedIndexes = new Set(dialogueEntries.map(e => e.characterIndex));
    let defaultIndex = 0;
    for (let i = 0; i < characterImages.length; i++) {
      if (!usedIndexes.has(i)) {
        defaultIndex = i;
        break;
      }
    }
    const newEntry: DialogueEntry = {
      id: `dialogue-${dialogueIdRef.current++}`,
      characterIndex: defaultIndex,
      text: ''
    };
    setDialogueEntries(prev => [...prev, newEntry]);
  };
  const updateDialogueCharacter = (id: string, characterIndex: number) => {
    if (!Number.isInteger(characterIndex) || characterIndex < 0 || characterIndex >= characterImages.length) {
      return;
    }
    setDialogueEntries(prev => prev.map(e => e.id === id ? { ...e, characterIndex } : e));
  };
  const updateDialogueText = (id: string, text: string) => {
    setDialogueEntries(prev => prev.map(e => e.id === id ? { ...e, text } : e));
  };
  const handleSelectGroup = async (group: ReferenceGroup) => {
    if (selectingGroup || isGenerating) return;
    setSelectingGroup(group);
    try {
      const selected = await Flow.media.selectMultiple({ filter: 'image' });
      if (selected.length > 0) {
        const filterNew = (prev: MediaItem[]) => {
          const existingIds = new Set(prev.map(p => p.mediaId));
          return [...prev, ...selected.filter(s => !existingIds.has(s.mediaId))];
        };
        if (group === 'product') setProductImages(filterNew);
        if (group === 'character') setCharacterImages(filterNew);
        if (group === 'background') setBackgroundImages(filterNew);
        setError(null);
      }
    } catch (err) { console.error(err); }
    finally { setSelectingGroup(null); }
  };
  const removeImage = (group: ReferenceGroup, index: number) => {
    if (isGenerating) return;
    if (group === 'product') setProductImages(prev => prev.filter((_, i) => i !== index));
    if (group === 'background') setBackgroundImages(prev => prev.filter((_, i) => i !== index));
    
    if (group === 'character') {
      setCharacterImages(prev => {
        const newList = prev.filter((_, i) => i !== index);
        setDialogueEntries(entries => entries.map(e => {
          if (newList.length === 0) return { ...e, characterIndex: 0 };
          if (e.characterIndex === index) return { ...e, characterIndex: 0 };
          if (e.characterIndex > index) return { ...e, characterIndex: e.characterIndex - 1 };
          return e;
        }));
        return newList;
      });
    }
  };
  const removeDialogue = (id: string) => {
    setDialogueEntries(prev => {
      if (prev.length <= 1) {
        return prev.map(e => e.id === id ? { ...e, text: '', characterIndex: 0 } : e);
      }
      return prev.filter(e => e.id !== id);
    });
  };
  const generateVideo = async () => {
    if (generationInFlightRef.current || selectingGroup !== null) return;
    if (productImages.length === 0) {
      setError("Cần ít nhất 1 ảnh sản phẩm.");
      return;
    }
    if (characterImages.length > 0) {
      const invalidDialogueEntry = dialogueEntries.find(entry => 
        !Number.isInteger(entry.characterIndex) || 
        entry.characterIndex < 0 || 
        entry.characterIndex >= characterImages.length
      );
      if (invalidDialogueEntry) {
        setError("Có lượt thoại đang gán tới nhân vật không còn tồn tại. Vui lòng chọn lại nhân vật.");
        return;
      }
    }
    const activeSpeakerIndexes: number[] = [];
    dialogueEntries.forEach(entry => {
      const idx = entry.characterIndex;
      if (Number.isInteger(idx) && idx >= 0 && idx < characterImages.length) {
        if (!activeSpeakerIndexes.includes(idx)) {
          activeSpeakerIndexes.push(idx);
        }
      }
    });
    if (activeSpeakerIndexes.length > 0 && characterImages.length === 0) {
      setError("Cần ít nhất 1 ảnh nhân vật để sử dụng lời thoại.");
      return;
    }
    if (characterImages.length === 0) {
      setError("Cần ít nhất 1 ảnh nhân vật.");
      return;
    }
    const requiredReferenceCount = 1 + activeSpeakerIndexes.length + (backgroundImages.length > 0 ? 1 : 0);
    if (requiredReferenceCount > capabilities.maxReferences) {
      setError(`Mô hình ${selectedModel} chỉ hỗ trợ tối đa ${capabilities.maxReferences} ảnh tham chiếu. Hãy giảm số nhân vật hoặc bỏ bối cảnh.`);
      return;
    }
    if (!capabilities.supportsReferences && activeSpeakerIndexes.length > 0) {
      setError(`Mô hình ${selectedModel} không hỗ trợ ảnh tham chiếu cho chế độ nhiều nhân vật.`);
      return;
    }
    // --- Task #10D-1: Create Product Entity Projection ---
    const currentProductEntity: ProductEntity = {
      id: 'product-primary',
      name: 'Primary Product',
      assets: productImages.map(imageMediaItemToReferenceAsset)
    };
    // --- Task #10D-2: Create Environment Entity Projection ---
    const currentEnvironmentEntity: EnvironmentEntity | null =
      backgroundImages.length > 0
        ? {
            id: 'environment-primary',
            name: 'Primary Environment',
            assets: backgroundImages.map(imageMediaItemToReferenceAsset)
          }
        : null;
    const generationInputSignature = currentGenerationSignature;
    generationInFlightRef.current = true;
    const hadPreviousVideo = generatedVideo !== null;
    setIsGenerating(true);
    setError(null);
    
    try {
      setGenerationStage('references');
      
      // --- TASK #10C-2: Use Reference Allocator (Updated for Task #10D-2) ---
      const generationReferencePayload = allocateGenerationReferences(
        currentProductEntity,
        characterImages,
        currentEnvironmentEntity,
        activeSpeakerIndexes
      );
      const videoReferenceIds = generationReferencePayload.referenceImageMediaIds;
      
      const presenterMap = new Map<number, number>(); 
      activeSpeakerIndexes.forEach((charIdx, i) => {
        presenterMap.set(charIdx, i + 1);
      });
      
      const hasBackground = backgroundImages.length > 0;
      const backgroundRefSlot = hasBackground ? videoReferenceIds.length : null;
      // TASK #9A-R2: KHÔI PHỤC PAYLOAD CHUẨN (Hệ quả từ R1)
      const productReferenceSlots = [1];
      let presenterIdentityBlocks = "";
      activeSpeakerIndexes.forEach((charIdx, i) => {
        const presenterNum = i + 1;
        const refSlot = presenterNum + 1;
        presenterIdentityBlocks += `
PRESENTER ${presenterNum} = REFERENCE ${refSlot}.
Use the EXACT same person from Reference ${refSlot}.
Preserve: recognizable face identity, face shape and proportions, eyes, nose, lips, jawline, skin tone and age appearance, hairline, hairstyle and hair color.
Do not: replace with another person, create merely a similar-looking person, beautify into a generic model, face-swap, blend with another presenter, change identity while speaking, allow identity drift between shots.
Presenter ${presenterNum} must remain the same person throughout the video.
Keep natural facial motion and Vietnamese lip-sync without changing facial identity.
`.trim() + "\n";
      });
      let dialogueSequence = "DIALOGUE SEQUENCE:\n";
      dialogueEntries.forEach((entry, i) => {
        const presenterNum = presenterMap.get(entry.characterIndex);
        if (presenterNum === undefined) throw new Error(`Dialogue speaker mapping missing for entry ${entry.id}`);
        const turnText = entry.text.trim();
        dialogueSequence += `TURN ${i + 1} — PRESENTER ${presenterNum}:\n${turnText ? `Speak naturally in Vietnamese: "${turnText}"` : `AUTO DIALOGUE: Create one short natural Vietnamese commercial sentence for this presenter.`}\n`;
      });
      // TASK #9B-R1: ROLLBACK TO R6 (Remove PRODUCT INSTANCE CONSERVATION & FINAL SHOT SAFETY)
      const videoPrompt = `
Create a premium Vietnamese Facebook commercial video.
REFERENCE 1 = PRODUCT IDENTITY — HIGHEST PRIORITY.
Use the EXACT physical product from Reference 1.
Preserve: product category, silhouette, shape and proportions, visible colors and materials, visible component count and placement, buttons, ports, openings and connectors when visible, branding / labels when visible, distinctive physical geometry.
Do not: replace or redesign the product, change product category, add/remove/move major visible components, change proportions or visible color distribution, morph the product between shots, invent hidden physical features.
Do not invent unsupported specifications or performance claims. Reference 1 is the visual source of truth.
${presenterIdentityBlocks}
${hasBackground ? `REFERENCE ${backgroundRefSlot} = ENVIRONMENT. Use this reference as the primary location. Preserve the recognizable: room/location type, architecture, major furniture/layout, dominant lighting and colors. Do not replace it with an unrelated location. Product and presenter identity have higher priority than background detail.` : ''}
IDENTITY PRIORITY:
1. Product
2. Presenter identities
3. Environment
4. Creative styling
Each presenter is a separate immutable identity. Never swap, merge, or transfer faces between presenters. The assigned speaker must remain aligned with the assigned presenter reference. No identity drift across shots.
${dialogueSequence.trim()}
LANGUAGE:
All spoken dialogue MUST be natural Vietnamese only. No English or other spoken language. No subtitles. No transcription. No generated on-screen dialogue text.
COMMERCIAL ACTION:
Keep the product clearly visible during important shots. Presenters interact naturally with the product. Use realistic hands, natural grip and correct physical contact. No hand/product fusion, deformation, clipping or geometry change. When a presenter is speaking, keep the face reasonably visible. Use stable mobile-first commercial camera movement.
ADDITIONAL CREATIVE REQUEST:
${additionalPrompt || 'None'}
Additional creative requests must not override product identity, presenter identity, speaker mapping, Vietnamese language, or physical realism.
`.trim();
      // Diagnostics update for task audit
      console.info("Video production diagnostics", {
        modelDisplayName: selectedModel,
        durationSeconds: parseInt(selectedDuration),
        aspectRatio: selectedRatio,
        resolution: selectedResolution,
        productImageCount: productImages.length,
        productReferenceCount: productReferenceSlots.length,
        productReferenceSlots,
        referenceCount: videoReferenceIds.length,
        activeSpeakerCount: activeSpeakerIndexes.length,
        hasBackground
      });
      setGenerationStage('rendering');
      const result = await Flow.generate.video({
        prompt: videoPrompt,
        modelDisplayName: selectedModel,
        aspectRatio: selectedRatio,
        durationSeconds: parseInt(selectedDuration),
        resolution: selectedResolution,
        referenceImageMediaIds: generationReferencePayload.referenceImageMediaIds
      });
      const bytes = Uint8Array.from(atob(result.base64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      revokeOldUrl();
      currentVideoUrlRef.current = url;
      setGeneratedVideo({ url, mediaId: result.mediaId, mimeType: result.mimeType });
      setGenerationStage('complete');
      
      setLastSuccessfulGenerationSignature(generationInputSignature);
    } catch (err: unknown) {
      console.error("Generation failed:", err);
      const message = err instanceof Error && err.message ? err.message : "Lỗi kết xuất video.";
      setError(`${message}`);
      if (hadPreviousVideo) setGenerationStage('complete');
      else setGenerationStage('idle');
    } finally {
      generationInFlightRef.current = false;
      setIsGenerating(false);
    }
  };
  const handleDownload = async () => {
    if (!generatedVideo || downloadInFlightRef.current) return;
    downloadInFlightRef.current = true;
    setSaveState('saving');
    try {
      const response = await fetch(generatedVideo.url);
      const blob = await response.blob();
      const reader = new FileReader();
      const downloadPromise = new Promise<void>((resolve, reject) => {
        reader.onload = async () => {
          try {
            const result = reader.result;
            if (typeof result !== 'string') return reject(new Error("Invalid result"));
            const base64 = result.split(',')[1];
            if (!base64) return reject(new Error("No base64"));
            
            const dlResult = await Flow.download({ 
              base64, 
              mimeType: generatedVideo.mimeType, 
              filename: `FB_AD_${Date.now()}.mp4` 
            });
            
            if (!dlResult.success) {
              console.warn("Flow.download resolved with success=false after host download handoff", dlResult);
            }
            resolve();
          } catch (e) { reject(e); }
        };
        reader.onerror = () => reject(new Error("Reader error"));
        reader.onabort = () => reject(new Error("Aborted"));
        reader.readAsDataURL(blob);
      });
      await downloadPromise;
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (err) {
      console.error(err);
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    } finally {
      downloadInFlightRef.current = false;
    }
  };
  return (
    <div className="flex flex-col min-h-screen w-full bg-[#07050B] lg:grid lg:grid-cols-2 lg:h-screen lg:min-h-0 lg:overflow-hidden">
      <CreativeWorkspace 
        productImages={productImages}
        characterImages={characterImages}
        backgroundImages={backgroundImages}
        dialogueEntries={dialogueEntries}
        addDialogue={addDialogue}
        updateDialogueCharacter={updateDialogueCharacter}
        updateDialogueText={updateDialogueText}
        removeDialogue={removeDialogue}
        additionalPrompt={additionalPrompt}
        setAdditionalPrompt={setAdditionalPrompt}
        handleSelectGroup={handleSelectGroup}
        removeImage={removeImage}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        selectedDuration={selectedDuration}
        setSelectedDuration={setSelectedDuration}
        selectedRatio={selectedRatio}
        setSelectedRatio={setSelectedRatio}
        selectedResolution={selectedResolution}
        setSelectedResolution={setSelectedResolution}
        isGenerating={isGenerating}
        generateVideo={generateVideo}
        error={error}
        capabilities={capabilities}
        selectingGroup={selectingGroup}
        hasUnchangedSuccessfulInputs={hasUnchangedSuccessfulInputs}
      />
      <ProductionStudio 
        generationStage={generationStage}
        generatedVideo={generatedVideo}
        isGenerating={isGenerating}
        selectedRatio={selectedRatio}
        handleDownload={handleDownload}
        saveState={saveState}
      />
    </div>
  );
}
