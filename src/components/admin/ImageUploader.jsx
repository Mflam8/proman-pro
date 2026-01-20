import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Camera } from "lucide-react";

export default function ImageUploader({ label, imageUrl, onFileSelect, isUploading, disabled }) {
  return (
    <div className="space-y-2">
      <Label className="block text-sm font-medium text-proman-navy">{label}</Label>
      <div className="w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center relative">
        {imageUrl ? (
          <img src={imageUrl} alt={label} className="w-full h-full object-contain rounded-lg" />
        ) : (
          <Camera className="w-8 h-8 text-gray-300" />
        )}
        {!disabled && (
          <Input 
            type="file" 
            accept="image/*" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            onChange={(e) => onFileSelect(e.target.files[0])} 
          />
        )}
        {isUploading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <p>Subiendo...</p>
          </div>
        )}
      </div>
    </div>
  );
}