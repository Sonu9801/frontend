import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { X, Camera as CameraIcon, Loader2, Upload } from "lucide-react";
import Webcam from "react-webcam";
import { toast } from "sonner";
import { componentsApi } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

export function SubmitComponentModal({
  isOpen,
  onClose,
  taskId,
  workerId
}: {
  isOpen: boolean;
  onClose: () => void;
  taskId: number | null;
  workerId: number;
}) {
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  if (!isOpen || taskId === null) return null;

  const capturePhoto = (): string | null => {
    if (!webcamRef.current) return null;
    
    // 1. Try react-webcam getScreenshot
    let imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc && imageSrc.length > 100) {
      return imageSrc;
    }

    // 2. Canvas fallback for iOS / Android WebViews
    try {
      const video = webcamRef.current.video;
      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          if (dataUrl && dataUrl.length > 100) return dataUrl;
        }
      }
    } catch (e) {
      console.warn("Canvas capture fallback error:", e);
    }

    return null;
  };

  const processAndSubmit = async (imageSrc: string) => {
    setLoading(true);
    try {
      await componentsApi.submitTask(taskId, imageSrc, "Completed via PWA");
      toast.success("Task completed successfully!");
      queryClient.invalidateQueries({ queryKey: ["workerComponents", workerId] });
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to submit task");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const photo = capturePhoto();
    if (!photo) {
      toast.error("Could not capture photo. Use the upload option below.");
      return;
    }
    await processAndSubmit(photo);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      if (result) {
        await processAndSubmit(result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex flex-col bg-black">
        {/* Hidden file input for iOS/Android fallback */}
        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*" 
          capture="environment" 
          className="hidden" 
          onChange={handleFileUpload} 
        />

        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
          <h2 className="text-white font-bold text-lg">Submit Work Proof</h2>
          <button onClick={onClose} className="p-2 bg-white/20 rounded-full text-white backdrop-blur-md">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 relative bg-zinc-900 flex items-center justify-center overflow-hidden">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              facingMode: "environment",
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }}
            // Essential iOS & Android properties
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="p-6 pb-10 bg-black flex flex-col gap-3 items-center">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full max-w-sm h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 transition-transform"
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : <><CameraIcon size={24} className="mr-2" /> Capture & Submit</>}
          </Button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-emerald-400 underline flex items-center gap-1 font-semibold py-1 px-3"
          >
            <Upload size={14} /> Camera issue? Upload photo from device
          </button>
        </div>
      </div>
    </AnimatePresence>
  );
}
