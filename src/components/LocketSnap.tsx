'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Trash2, Loader2, Send, X, History, Calendar as CalendarIcon, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Snap } from '@/types/database';
import ConfirmModal from './ConfirmModal';

interface LocketSnapProps {
  userId: string;
}

export default function LocketSnap({ userId }: LocketSnapProps) {
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [captioningId, setCaptioningId] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [snapToDelete, setSnapToDelete] = useState<Snap | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewCaption, setPreviewCaption] = useState('');
  const [isFeedOpen, setIsFeedOpen] = useState(false);
  const [initialSnapId, setInitialSnapId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchSnaps();
    const channel = supabase
      .channel('snaps-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'snaps' }, (payload) => {
        // Realtime only updates if we are not in filtered mode, or we just re-fetch
        if (!selectedDate) {
          if (payload.eventType === 'INSERT') {
            setSnaps(prev => [payload.new as Snap, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setSnaps(prev => prev.filter(s => s.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setSnaps(prev => prev.map(s => s.id === payload.new.id ? { ...s, ...payload.new } : s));
          }
        } else {
           fetchSnaps(); // Refresh to ensure filtered view is correct
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, selectedDate]);

  const fetchSnaps = async () => {
    let query = supabase
      .from('snaps')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (selectedDate) {
      const startOfDay = `${selectedDate}T00:00:00.000Z`;
      const endOfDay = `${selectedDate}T23:59:59.999Z`;
      query = query.gte('created_at', startOfDay).lte('created_at', endOfDay);
    }

    const { data } = await query;
    if (data) setSnaps(data);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setPreviewCaption('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadSubmit = async () => {
    if (!previewFile) return;
    setIsUploading(true);
    try {
      const compressedFile = await compressImage(previewFile);
      const base64Url = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(compressedFile);
      });
      const { data: insertedSnap, error: dbError } = await supabase
        .from('snaps')
        .insert([{ user_id: userId, image_url: base64Url, caption: previewCaption }])
        .select()
        .single();
      if (dbError) throw dbError;
      if (!selectedDate) setSnaps(prev => [insertedSnap, ...prev]);
      setPreviewFile(null);
      setPreviewUrl(null);
      setPreviewCaption('');
    } catch (err) {
      console.error('Upload error:', err);
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูป กรุณาลองใหม่อีกครั้งครับ');
    } finally {
      setIsUploading(false);
    }
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const max = 1080;
          if (width > height) { if (width > max) { height *= max / width; width = max; } }
          else { if (height > max) { width *= max / height; height = max; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUpdateCaption = async (id: string) => {
    if (!caption.trim()) { setCaptioningId(null); return; }
    const { error } = await supabase
      .from('snaps')
      .update({ caption: caption.substring(0, 60) })
      .eq('id', id);
    if (!error) { setCaptioningId(null); setCaption(''); }
  };

  const handleDeleteSnap = async () => {
    if (!snapToDelete) return;
    const { error } = await supabase.from('snaps').delete().eq('id', snapToDelete.id);
    if (!error) {
      const path = snapToDelete.image_url.split('/snaps/')[1];
      if (path) await supabase.storage.from('snaps').remove([path]);
      setDeletingId(null);
      setSnapToDelete(null);
      if (snaps.length <= 1) setIsFeedOpen(false);
    }
  };

  const openFeedAt = (id: string) => {
    setInitialSnapId(id);
    setIsFeedOpen(true);
  };

  useEffect(() => {
    if (isFeedOpen && initialSnapId) {
      const el = document.getElementById(`feed-item-${initialSnapId}`);
      if (el) el.scrollIntoView({ behavior: 'auto' });
    }
  }, [isFeedOpen, initialSnapId]);

  return (
    <section className="w-full">
      <div className="px-4 pt-6 pb-3 flex items-center justify-between">
        <h2 className="text-foreground font-bold text-lg flex items-center gap-2">
          Our Snaps <Camera size={20} />
        </h2>
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {isFilterVisible && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="overflow-hidden flex items-center gap-2"
              >
                <input 
                  type="date" 
                  value={selectedDate || ''} 
                  onChange={(e) => setSelectedDate(e.target.value || null)}
                  className="bg-netflix-card border border-white/10 rounded-lg px-2 py-1 text-xs text-foreground outline-none focus:border-netflix-red"
                />
                {selectedDate && (
                  <button 
                    onClick={() => setSelectedDate(null)}
                    className="p-1.5 text-secondary-text hover:text-netflix-red transition-colors"
                  >
                    <RotateCcw size={16} />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => setIsFilterVisible(!isFilterVisible)}
            className={`p-2 rounded-full transition-all ${isFilterVisible ? 'bg-netflix-red text-white' : 'bg-foreground/5 text-secondary-text hover:bg-foreground/10'}`}
          >
            <CalendarIcon size={20} />
          </button>
        </div>
      </div>
      
      <div className="flex gap-4 px-4 pb-4 overflow-x-auto hide-scrollbar snap-x">
        {!selectedDate && (
          <div className="flex-shrink-0 snap-start">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-[140px] h-[180px] bg-netflix-card border-2 border-dashed border-netflix-red rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-all group relative overflow-hidden"
            >
              {isUploading ? (
                <Loader2 className="text-netflix-red animate-spin" size={32} />
              ) : (
                <>
                  <Camera className="text-netflix-red group-hover:scale-110 transition-transform" size={32} />
                  <span className="text-secondary-text text-xs font-medium">Add Snap</span>
                </>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" capture="environment" className="hidden" />
            </button>
          </div>
        )}

        {snaps.length === 0 ? (
          <div className="flex-shrink-0 w-full flex items-center justify-center py-10">
            <p className="text-secondary-text text-sm">No snaps found {selectedDate ? 'on this day' : ''}</p>
          </div>
        ) : (
          snaps.map((snap) => (
            <SnapCard 
              key={snap.id} 
              snap={snap} 
              userId={userId}
              isDeleting={deletingId === snap.id}
              isCaptioning={captioningId === snap.id}
              onLongPress={() => snap.user_id === userId && setDeletingId(snap.id)}
              onView={() => openFeedAt(snap.id)}
              onDelete={() => { setSnapToDelete(snap); setIsConfirmOpen(true); }}
              onCancelDelete={() => setDeletingId(null)}
              caption={caption}
              onCaptionChange={setCaption}
              onCaptionSubmit={() => handleUpdateCaption(snap.id)}
            />
          ))
        )}
      </div>

      <AnimatePresence>
        {previewUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm bg-netflix-card rounded-3xl overflow-hidden shadow-2xl border border-foreground/10">
              <div className="relative aspect-[3/4] w-full bg-netflix-dark">
                <img src={previewUrl} className="w-full h-full object-contain" alt="Preview" />
                <button onClick={() => { setPreviewUrl(null); setPreviewFile(null); }} className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-foreground backdrop-blur-md"><X size={20} /></button>
              </div>
              <div className="p-4 space-y-4">
                <input type="text" placeholder="Add a small note... (optional)" value={previewCaption} onChange={(e) => setPreviewCaption(e.target.value)} maxLength={60} className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 text-foreground placeholder:text-secondary-text/60 outline-none focus:border-netflix-red text-sm" />
                <button onClick={handleUploadSubmit} disabled={isUploading} className="w-full py-3 bg-netflix-red text-white font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isUploading ? <Loader2 className="animate-spin" size={20} /> : <><Send size={18} /> Post Snap</>}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFeedOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/98 flex flex-col">
            <div className="flex justify-between items-center p-4 absolute top-0 left-0 right-0 z-10 pointer-events-none">
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full pointer-events-auto border border-white/5">
                 <History size={16} className="text-netflix-red" />
                 <span className="text-foreground text-xs font-bold uppercase tracking-widest">
                   {selectedDate ? new Date(selectedDate).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }) : 'History'}
                 </span>
              </div>
              <button onClick={() => setIsFeedOpen(false)} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-foreground pointer-events-auto border border-white/5"><X size={24} /></button>
            </div>

            <div ref={feedRef} className="flex-1 overflow-y-auto snap-y snap-mandatory hide-scrollbar h-full">
              {snaps.map((snap) => (
                <div key={snap.id} id={`feed-item-${snap.id}`} className="w-full h-full snap-start flex flex-col items-center justify-center relative p-4">
                  <div className="relative w-full max-w-md aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl">
                    <img src={snap.image_url} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
                      {snap.caption && <p className="text-foreground text-xl font-medium mb-2 drop-shadow-lg">{snap.caption}</p>}
                      <p className="text-secondary-text text-sm font-medium">
                        {new Date(snap.created_at).toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => { setIsConfirmOpen(false); setSnapToDelete(null); setDeletingId(null); }}
        onConfirm={handleDeleteSnap}
        title="Delete Snap?"
        message="คุณแน่ใจใช่ไหมที่จะลบรูปนี้? การลบจะไม่สามารถกู้คืนได้ครับ"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </section>
  );
}

function SnapCard({ 
  snap, 
  userId, 
  isDeleting, 
  isCaptioning, 
  onLongPress, 
  onView, 
  onDelete, 
  onCancelDelete, 
  caption, 
  onCaptionChange, 
  onCaptionSubmit 
}: {
  snap: Snap;
  userId: string;
  isDeleting: boolean;
  isCaptioning: boolean;
  onLongPress: () => void;
  onView: () => void;
  onDelete: () => void;
  onCancelDelete: () => void;
  caption: string;
  onCaptionChange: (val: string) => void;
  onCaptionSubmit: () => void;
}) {
  const longPressProps = useLongPress(onLongPress);
  return (
    <div className="flex-shrink-0 snap-start relative">
      <motion.div layoutId={snap.id} whileTap={{ scale: 0.98 }} {...longPressProps} onClick={onView} className="w-[140px] h-[180px] rounded-2xl overflow-hidden relative group shadow-lg border border-white/5 cursor-pointer">
        <img src={snap.image_url} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2">
          {snap.caption && <p className="text-foreground text-[10px] leading-tight font-medium drop-shadow-md">{snap.caption}</p>}
        </div>
        <AnimatePresence>
          {isDeleting && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-3 bg-netflix-red rounded-full text-white shadow-xl"><Trash2 size={24} /></button>
              <button onClick={(e) => { e.stopPropagation(); onCancelDelete(); }} className="p-3 bg-white/20 rounded-full text-foreground"><X size={24} /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      {isCaptioning && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-2 w-[140px] flex gap-1 items-center">
          <input autoFocus value={caption} onChange={(e) => onCaptionChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onCaptionSubmit()} placeholder="Caption..." className="bg-netflix-card border border-white/10 rounded-lg px-2 py-1 text-[10px] text-foreground w-full outline-none focus:border-netflix-red" />
          <button onClick={onCaptionSubmit} className="p-1 text-netflix-red"><Send size={14} /></button>
        </motion.div>
      )}
    </div>
  );
}

function useLongPress(callback: () => void, ms = 500) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const start = () => { timerRef.current = setTimeout(callback, ms); };
  const stop = () => { if (timerRef.current) clearTimeout(timerRef.current); };
  return { onMouseDown: start, onMouseUp: stop, onMouseLeave: stop, onTouchStart: start, onTouchEnd: stop };
}
