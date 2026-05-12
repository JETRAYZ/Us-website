'use client';

import { useState, useRef } from 'react';
import { Camera, Calendar as CalendarIcon, Save, Loader2, X, Box, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import BottomSheet from './BottomSheet';

interface AddCapsuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onAdded: () => void;
}

export default function AddCapsuleModal({ isOpen, onClose, userId, onAdded }: AddCapsuleModalProps) {
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [unlockDate, setUnlockDate] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Compress and convert to Base64 (Same logic as LocketSnap for consistency)
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Upload error:', err);
      setIsUploading(false);
    }
  };

  const handleQuickSelect = (months: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    // Format for datetime-local input
    const formatted = date.toISOString().slice(0, 16);
    setUnlockDate(formatted);
  };

  const handleSave = async () => {
    if ((!message && !imageUrl) || !unlockDate) return;
    setIsSaving(true);

    const { error } = await supabase
      .from('time_capsules')
      .insert([{
        author_id: userId,
        content_text: message || null,
        image_url: imageUrl || null,
        unlock_date: new Date(unlockDate).toISOString()
      }]);

    if (!error) {
      setMessage('');
      setImageUrl(null);
      setUnlockDate('');
      onAdded();
      onClose();
    }
    setIsSaving(false);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={<span className="flex items-center gap-2">Seal a Memory <Box size={20} /></span>}>
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-secondary-text uppercase tracking-widest">Message</label>
          <textarea
            placeholder="Write your message to the future..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-foreground text-sm outline-none focus:border-netflix-red resize-none hide-scrollbar"
          />
          <div className="text-[10px] text-right text-secondary-text">{message.length}/500</div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-secondary-text uppercase tracking-widest">Image (Optional)</label>
          {imageUrl ? (
            <div className="relative w-full h-32 rounded-xl overflow-hidden border border-white/10 group">
              <img src={imageUrl} className="w-full h-full object-cover" />
              <button 
                onClick={() => setImageUrl(null)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full h-32 bg-white/5 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-all"
            >
              {isUploading ? (
                <Loader2 className="text-netflix-red animate-spin" size={24} />
              ) : (
                <>
                  <Camera size={24} className="text-secondary-text" />
                  <span className="text-xs text-secondary-text font-medium">Upload a photo</span>
                </>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
            </button>
          )}
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-secondary-text uppercase tracking-widest flex items-center gap-1.5">When should this open? <CalendarIcon size={12} /></label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 3, 6, 12].map((m) => (
              <button
                key={m}
                onClick={() => handleQuickSelect(m)}
                className="py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-white hover:bg-netflix-red/20 active:bg-netflix-red transition-all"
              >
                {m < 12 ? `${m}M` : '1Y'}
              </button>
            ))}
          </div>
          <input
            type="datetime-local"
            value={unlockDate}
            min={new Date(Date.now() + 86400000).toISOString().slice(0, 16)}
            onChange={(e) => setUnlockDate(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-foreground text-sm outline-none focus:border-netflix-red"
          />
          {unlockDate && (
             <p className="text-[10px] text-netflix-red font-medium italic">
               Will open on {new Date(unlockDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
             </p>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || (!message && !imageUrl) || !unlockDate}
          className="w-full py-4 bg-netflix-red text-white font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl"
        >
          {isSaving ? <Loader2 size={20} className="animate-spin" /> : <><Lock size={20} /> Seal It</>}
        </button>
      </div>
    </BottomSheet>
  );
}
