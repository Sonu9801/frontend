"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Upload, 
  Camera, 
  X, 
  FileText, 
  Image as ImageIcon, 
  RefreshCw, 
  Check, 
  AlertCircle,
  FlipHorizontal,
  Paperclip
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentUploadWithCameraProps {
  value?: File | string | null;
  onChange: (file: File | null, fileName?: string) => void;
  accept?: string;
  label?: string;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
  captureMode?: "environment" | "user";
}

export function DocumentUploadWithCamera({
  value,
  onChange,
  accept = ".pdf,image/*,.doc,.docx,.xls,.xlsx",
  label,
  placeholder = "Upload Files or Take Photo",
  className,
  compact = false,
  disabled = false,
  captureMode = "environment",
}: DocumentUploadWithCameraProps) {
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(captureMode);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(
    typeof value === "string" ? value : value?.name || null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof value === "string") {
      setSelectedFileName(value || null);
    } else if (value instanceof File) {
      setSelectedFileName(value.name);
    } else {
      setSelectedFileName(null);
    }
  }, [value]);

  // Clean up camera stream on modal unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const startCamera = async (mode: "environment" | "user" = facingMode) => {
    setCameraError(null);
    setIsStartingCamera(true);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported on this browser.");
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      setFacingMode(mode);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn("WebRTC Camera start failed, falling back to native input:", err);
      setCameraError(
        err?.message || "Could not access camera. Using fallback device camera."
      );
      setTimeout(() => {
        nativeCameraInputRef.current?.click();
        setShowCameraModal(false);
      }, 500);
    } finally {
      setIsStartingCamera(false);
    }
  };

  const openCameraModal = () => {
    setCapturedImage(null);
    setShowCameraModal(true);
    startCamera(facingMode);
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    startCamera(nextMode);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(dataUrl);
  };

  const confirmCapturedPhoto = () => {
    if (!capturedImage) return;

    const arr = capturedImage.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `Doc_Capture_${timestamp}.jpg`;
    const file = new File([u8arr], fileName, { type: mime });

    setSelectedFileName(fileName);
    onChange(file, fileName);

    stopCamera();
    setShowCameraModal(false);
    setCapturedImage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFileName(file.name);
      onChange(file, file.name);
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedFileName(null);
    onChange(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = "";
  };

  const triggerNativeCamera = () => {
    if (nativeCameraInputRef.current) {
      nativeCameraInputRef.current.click();
    } else {
      openCameraModal();
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
          {label}
        </label>
      )}

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={handleFileChange}
      />

      {/* Hidden Mobile Direct Camera Input (PWA native capture fallback) */}
      <input
        type="file"
        ref={nativeCameraInputRef}
        accept="image/*"
        capture={captureMode}
        className="hidden"
        disabled={disabled}
        onChange={handleFileChange}
      />

      {/* Upload Box / Selected State UI */}
      {selectedFileName ? (
        <div className="flex items-center justify-between p-2.5 px-3 rounded-lg border border-border bg-card shadow-sm text-sm transition-all hover:border-primary/50">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {selectedFileName.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                <ImageIcon size={16} />
              ) : (
                <FileText size={16} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">
                {selectedFileName}
              </p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Check size={10} className="text-emerald-500" /> Ready to upload
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
              title="Change File"
            >
              Change
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={handleRemoveFile}
              className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
              title="Remove File"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "grid grid-cols-2 gap-2 rounded-lg border-2 border-dashed border-border/80 p-2 bg-muted/20 hover:bg-muted/40 transition-colors",
            compact ? "p-1.5 gap-1.5" : "p-3"
          )}
        >
          {/* Option 1: File Browser */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-background border border-border/60 shadow-xs hover:border-primary/50 hover:bg-card text-foreground transition-all cursor-pointer group",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <Upload size={15} className="text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-xs font-medium">Upload File</span>
          </button>

          {/* Option 2: Camera Capture */}
          <button
            type="button"
            disabled={disabled}
            onClick={openCameraModal}
            className={cn(
              "flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary transition-all cursor-pointer group font-medium",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <Camera size={15} className="text-primary group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold">Take Photo</span>
          </button>
        </div>
      )}

      {/* Canvas for rendering snapshot */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Live WebRTC Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative bg-card text-card-foreground w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-border flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-primary" />
                <h3 className="font-semibold text-sm">Document Camera Capture</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setShowCameraModal(false);
                }}
                className="p-1 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Camera Preview Box */}
            <div className="relative bg-black aspect-4/3 flex items-center justify-center overflow-hidden">
              {capturedImage ? (
                /* Captured Photo Preview */
                <img
                  src={capturedImage}
                  alt="Captured Document"
                  className="w-full h-full object-contain"
                />
              ) : (
                /* Live Video Stream */
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Document Framing Guide Overlay */}
                  <div className="absolute inset-6 border-2 border-dashed border-white/60 rounded-lg pointer-events-none flex items-center justify-center">
                    <span className="text-[11px] text-white/80 bg-black/50 px-2 py-1 rounded backdrop-blur-xs">
                      Align document inside frame
                    </span>
                  </div>

                  {isStartingCamera && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white gap-2">
                      <RefreshCw size={24} className="animate-spin text-primary" />
                      <span className="text-xs font-medium">Starting Camera...</span>
                    </div>
                  )}

                  {cameraError && (
                    <div className="absolute inset-0 bg-black/80 p-4 flex flex-col items-center justify-center text-center text-white gap-2">
                      <AlertCircle size={28} className="text-amber-400" />
                      <p className="text-xs text-amber-200">{cameraError}</p>
                      <button
                        type="button"
                        onClick={triggerNativeCamera}
                        className="mt-2 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg shadow-sm hover:bg-primary/90"
                      >
                        Open Device Camera
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Controls Footer */}
            <div className="p-4 bg-card border-t border-border flex items-center justify-between gap-2">
              {capturedImage ? (
                <>
                  <button
                    type="button"
                    onClick={() => setCapturedImage(null)}
                    className="flex-1 py-2 px-3 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw size={14} /> Retake
                  </button>
                  <button
                    type="button"
                    onClick={confirmCapturedPhoto}
                    className="flex-1 py-2 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Check size={14} /> Use Photo
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    title="Switch Camera"
                    className="p-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <FlipHorizontal size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={capturePhoto}
                    disabled={isStartingCamera || !!cameraError}
                    className="flex-1 py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    <Camera size={16} /> Snap Photo
                  </button>

                  <button
                    type="button"
                    onClick={triggerNativeCamera}
                    title="Use Device Native Camera"
                    className="p-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Paperclip size={18} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
