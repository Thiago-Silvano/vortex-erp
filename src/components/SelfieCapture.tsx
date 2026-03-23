import React, { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
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
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      setCameraReady(false);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Wait for video to be ready before allowing capture
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setCameraReady(true);
          }).catch(() => {
            toast.error('Não foi possível iniciar o vídeo da câmera.');
          });
        };
      }
      setStream(mediaStream);
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err?.name === 'NotAllowedError') {
        toast.error('Permissão da câmera negada. Habilite nas configurações do navegador.');
      } else if (err?.name === 'NotFoundError') {
        toast.error('Nenhuma câmera encontrada neste dispositivo.');
      } else {
        toast.error('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
    setCameraReady(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Use actual video dimensions
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    
    const ctx = canvas.getContext('2d')!;
    // Mirror the image for a natural selfie look
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    
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
      // Convert data URL to blob
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const fileName = `selfie_${contractId}_${Date.now()}.jpg`;

      const { data, error } = await supabase.storage
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

        {!cameraActive && !capturedImage && (
          <Button onClick={startCamera} className="w-full gap-2" size="lg">
            <Camera className="h-4 w-4" /> Abrir Câmera
          </Button>
        )}

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
              {/* Overlay guide */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 rounded-full border-2 border-white/50 border-dashed" />
              </div>
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Posicione seu rosto dentro do círculo
            </p>
            <Button onClick={capturePhoto} className="w-full gap-2" size="lg" disabled={!cameraReady}>
              {!cameraReady ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {cameraReady ? 'Capturar Foto' : 'Carregando câmera...'}
            </Button>
          </div>
        )}

        {capturedImage && (
          <div className="space-y-3">
            <div className="rounded-lg overflow-hidden bg-black aspect-[4/3]">
              <img
                src={capturedImage}
                alt="Selfie capturada"
                className="w-full h-full object-cover"
              />
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
