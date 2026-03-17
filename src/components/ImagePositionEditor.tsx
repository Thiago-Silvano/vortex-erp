import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, Move, RotateCcw } from 'lucide-react';

export interface ImagePositionConfig {
  offsetX: number; // percentage -100 to 100
  offsetY: number; // percentage -100 to 100
  zoom: number;    // 1 to 3
}

interface ImagePositionEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  initialConfig?: ImagePositionConfig | null;
  onSave: (config: ImagePositionConfig) => void;
}

const DEFAULT_CONFIG: ImagePositionConfig = { offsetX: 0, offsetY: 0, zoom: 1 };

export function getImageStyle(config?: ImagePositionConfig | null): React.CSSProperties {
  if (!config) return { objectFit: 'cover' as const, objectPosition: 'center' };
  return {
    objectFit: 'cover' as const,
    objectPosition: `${50 + config.offsetX}% ${50 + config.offsetY}%`,
    transform: `scale(${config.zoom})`,
  };
}

export default function ImagePositionEditor({ open, onOpenChange, imageUrl, initialConfig, onSave }: ImagePositionEditorProps) {
  const [config, setConfig] = useState<ImagePositionConfig>(initialConfig || DEFAULT_CONFIG);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setConfig(initialConfig || DEFAULT_CONFIG);
  }, [open, initialConfig]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, ox: config.offsetX, oy: config.offsetY };
  }, [config.offsetX, config.offsetY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = (e.clientX - dragStartRef.current.x) / 3;
    const dy = (e.clientY - dragStartRef.current.y) / 3;
    setConfig(prev => ({
      ...prev,
      offsetX: Math.max(-50, Math.min(50, dragStartRef.current!.ox + dx)),
      offsetY: Math.max(-50, Math.min(50, dragStartRef.current!.oy + dy)),
    }));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = { x: touch.clientX, y: touch.clientY, ox: config.offsetX, oy: config.offsetY };
  }, [config.offsetX, config.offsetY]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const touch = e.touches[0];
    const dx = (touch.clientX - dragStartRef.current.x) / 3;
    const dy = (touch.clientY - dragStartRef.current.y) / 3;
    setConfig(prev => ({
      ...prev,
      offsetX: Math.max(-50, Math.min(50, dragStartRef.current!.ox + dx)),
      offsetY: Math.max(-50, Math.min(50, dragStartRef.current!.oy + dy)),
    }));
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Move className="h-5 w-5" />
            Ajustar Posição da Imagem
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-2">
          Arraste a imagem para centralizar e use o controle de zoom. O resultado será exibido na proposta interativa.
        </p>

        {/* Preview container simulating the hero */}
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-lg border-2 border-border select-none"
          style={{ height: 340, cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={imageUrl}
            alt="Preview"
            className="w-full h-full pointer-events-none"
            draggable={false}
            style={getImageStyle(config)}
          />
          {/* Gradient overlay like the proposal */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'linear-gradient(to bottom, rgba(13,27,42,0.2) 0%, rgba(13,27,42,0.55) 40%, rgba(13,27,42,0.95) 100%)',
          }} />
          <div className="absolute bottom-4 left-4 right-4 text-white pointer-events-none">
            <p className="text-sm opacity-70">Preview da proposta</p>
            <h2 className="text-2xl font-bold">Destino da Viagem</h2>
          </div>
        </div>

        {/* Zoom control */}
        <div className="flex items-center gap-4 px-2">
          <ZoomOut className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Slider
            value={[config.zoom]}
            onValueChange={([v]) => setConfig(prev => ({ ...prev, zoom: v }))}
            min={1}
            max={3}
            step={0.05}
            className="flex-1"
          />
          <ZoomIn className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-xs text-muted-foreground w-12 text-right">{Math.round(config.zoom * 100)}%</span>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button variant="ghost" size="sm" onClick={() => setConfig(DEFAULT_CONFIG)} className="gap-1">
            <RotateCcw className="h-3.5 w-3.5" /> Resetar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => { onSave(config); onOpenChange(false); }}>Salvar posição</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
