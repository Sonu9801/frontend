"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Upload, 
  Camera, 
  X, 
  FileText, 
  Image as ImageIcon, 
  Check, 
  Sparkles
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
  const [selectedFileName, setSelectedFileName] = useState<string | null>(
    typeof value === "string" ? value : value?.name || null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof value === "string") {
      setSelectedFileName(value || null);
    } else if (value instanceof File) {
      setSelectedFileName(value.name);
    } else {
      setSelectedFileName(null);
    }
  }, [value]);

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
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
          {label}
        </label>
      )}

      {/* Hidden File Input for browsing local storage / files / pdfs */}
      <input
        type="file"
        ref={fileInputRef}
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={handleFileChange}
      />

      {/* Hidden Direct Full Camera Input (Native Camera without frame/box constraints) */}
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
              onClick={triggerNativeCamera}
              className="px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors flex items-center gap-1"
              title="Retake Photo"
            >
              <Camera size={12} />
              <span>Retake</span>
            </button>
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
          {/* Option 1: File Browser (PDFs / Images / Docs) */}
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

          {/* Option 2: Full Screen Native Camera Capture */}
          <button
            type="button"
            disabled={disabled}
            onClick={triggerNativeCamera}
            className={cn(
              "flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-all cursor-pointer group font-medium",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <Camera size={15} className="text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold">Take Photo</span>
          </button>
        </div>
      )}
    </div>
  );
}
