import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, RefreshCw, CheckCircle2, Loader2, SkipForward } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SelfieCaptureProps {
  onCapture: (selfieUrl: string) => void;
  contractId: string;
  clientName: string;
}

export default function SelfieCapture({ onCapture, contractId, clientName }: SelfieCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setCameraActive(false);
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraReady(false);
    setCameraError(null);
    setCameraActive(true);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      streamRef.current = mediaStream;

      // Small delay to ensure video element is rendered
      await new Promise(resolve => setTimeout(resolve, 100));

      const video = videoRef.current;
      if (!video) {
        throw new Error('Video element not available');
      }

      video.srcObject = mediaStream;

      // Use multiple event listeners for maximum compatibility
      const onReady = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setCameraReady(true);
      };

      video.addEventListener('playing', onReady, { once: true });
      video.addEventListener('loadeddata', () => {
        // Fallback: if 'playing' doesn't fire, try playing manually
        video.play().then(onReady).catch(() => {
          // Some browsers need user gesture, but we're already in a click handler
          setCameraReady(true);
        });
      }, { once: true });

      // Try to play immediately
      try {
        await video.play();
        onReady();
      } catch {
        // Will be handled by event listeners above
      }

      // Timeout fallback: if camera doesn't become ready in 8s, show error
      timeoutRef.current = setTimeout(() => {
        if (!cameraReady) {
          setCameraError('A câmera está demorando para carregar. Tente fechar outros apps que usam a câmera e tente novamente.');
          setCameraReady(true); // Allow capture attempt anyway
        }
      }, 8000);

    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraActive(false);
      if (err?.name === 'NotAllowedError') {
        setCameraError('Permissão da câmera negada. Habilite nas configurações do navegador.');
        toast.error('Permissão da câmera negada.');
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setCameraError('Nenhuma câmera encontrada neste dispositivo.');
        toast.error('Câmera não encontrada.');
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        setCameraError('A câmera está sendo usada por outro aplicativo. Feche-o e tente novamente.');
        toast.error('Câmera em uso por outro app.');
      } else {
        setCameraError('Não foi possível acessar a câmera. Verifique as permissões.');
        toast.error('Erro ao acessar a câmera.');
      }
    }
  }, [cameraReady]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d')!;
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const confirmSelfie = useCallback(async () => {
    if (!capturedImage) return;
    setUploading(true);
    try {
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const fileName = `selfie_${contractId}_${Date.now()}.jpg`;

      const { error } = await supabase.storage
        .from('contract-selfies')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });

      if (error) {
        console.error('Selfie upload error:', error);
        throw error;
      }

      const { data: urlData } = supabase.storage.from('contract-selfies').getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error('Não foi possível obter URL da selfie');
      }

      onCapture(urlData.publicUrl);
      toast.success('Selfie registrada com sucesso!');
    } catch (err: any) {
      console.error('Selfie confirm error:', err);
      toast.error('Erro ao salvar selfie. Tente novamente.');
    }
    setUploading(false);
  }, [capturedImage, contractId, onCapture]);

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="text-center">
          <Camera className="h-8 w-8 text-primary mx-auto mb-2" />
          <h2 className="text-lg font-bold">Selfie de Identificação</h2>
          <p className="text-sm text-muted-foreground">
            Para sua segurança, tire uma selfie para vincular ao contrato.
          </p>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Initial state: show open camera button */}
        {!cameraActive && !capturedImage && !cameraError && (
          <Button onClick={startCamera} className="w-full gap-2" size="lg">
            <Camera className="h-4 w-4" /> Abrir Câmera
          </Button>
        )}

        {/* Camera error state */}
        {!cameraActive && !capturedImage && cameraError && (
          <div className="space-y-3">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
              <p className="text-sm text-destructive font-medium">{cameraError}</p>
            </div>
            <Button onClick={() => { setCameraError(null); startCamera(); }} className="w-full gap-2" size="lg" variant="outline">
              <RefreshCw className="h-4 w-4" /> Tentar Novamente
            </Button>
          </div>
        )}

        {/* Camera active */}
        {cameraActive && (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 rounded-full border-2 border-white/50 border-dashed" />
              </div>
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin text-white mx-auto" />
                    <p className="text-white text-sm">Carregando câmera...</p>
                  </div>
                </div>
              )}
            </div>

            {cameraError && (
              <p className="text-xs text-amber-600 text-center">{cameraError}</p>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Posicione seu rosto dentro do círculo
            </p>

            <div className="flex gap-2">
              <Button onClick={capturePhoto} className="flex-1 gap-2" size="lg" disabled={!cameraReady}>
                {!cameraReady ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                {cameraReady ? 'Capturar Foto' : 'Carregando...'}
              </Button>
              <Button onClick={stopCamera} variant="outline" size="lg" className="px-4">
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Captured image preview */}
        {capturedImage && (
          <div className="space-y-3">
            <div className="rounded-lg overflow-hidden bg-black aspect-[4/3]">
              <img src={capturedImage} alt="Selfie capturada" className="w-full h-full object-cover" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={retake} className="flex-1 gap-2" disabled={uploading}>
                <RefreshCw className="h-4 w-4" /> Tirar Outra
              </Button>
              <Button onClick={confirmSelfie} className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700" disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Confirmar Selfie
              </Button>
            </div>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground text-center italic">
          A selfie será vinculada ao contrato como prova de identidade e não será utilizada para outros fins.
        </p>
      </CardContent>
    </Card>
  );
}
