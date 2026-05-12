'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Camera, LogOut, Loader2, Save, Palette, Check, Bell, BellOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/database';
import BottomSheet from './BottomSheet';

interface NavbarProps {
  activeUser: { userId: string; userName: string; userRole: string };
}

export default function Navbar({ activeUser }: NavbarProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isMoodModalOpen, setIsMoodModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('classic');
  
  const [myMood, setMyMood] = useState(100);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [notifsMuted, setNotifsMuted] = useState(false);
  
  // Profile Edit State
  const [editName, setEditName] = useState('');
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('role', { ascending: true });
    if (data) {
      setProfiles(data);
      const me = data.find(p => p.id === activeUser.userId);
      if (me) {
        setMyMood(me.mood_percent);
        setEditName(me.name);
        
        // Auto-set theme based on role if no theme is saved
        if (!localStorage.getItem('theme')) {
          const defaultTheme = me.role === 'admin' ? 'classic' : 'sweet-pink';
          handleSelectTheme(defaultTheme);
        }
      }
    }
  }, [activeUser.userId, supabase]);

  useEffect(() => {
    fetchProfiles();

    // Load initial theme from localStorage
    try {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        setCurrentTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
      
      const muted = localStorage.getItem('notifs_muted') === 'true';
      setNotifsMuted(muted);
    } catch (e) {}

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }

    // Realtime profiles subscription
    const channel = supabase
      .channel('navbar-profiles')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        setProfiles(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProfiles, supabase]);

  const toggleNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'default') {
      const res = await Notification.requestPermission();
      setNotifPermission(res);
      if (res === 'granted') {
        new Notification('สำเร็จแล้ว! 🎉', { body: 'เปิดแจ้งเตือนเรียบร้อยจ้า' });
      }
    } else if (Notification.permission === 'granted') {
      const newState = !notifsMuted;
      setNotifsMuted(newState);
      localStorage.setItem('notifs_muted', String(newState));
    } else {
      alert('คุณได้ปิดการแจ้งเตือนในระดับเบราว์เซอร์ไว้ กรุณาเปิดในการตั้งค่าเบราว์เซอร์ก่อนครับ');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('activeUser');
    document.cookie = 'userId=; path=/; max-age=0';
    router.push('/');
  };

  const handleSaveMood = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ mood_percent: myMood })
      .eq('id', activeUser.userId);

    if (!error) {
      setIsMoodModalOpen(false);
    }
    setIsSaving(false);
  };

  const compressProfileImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const max = 400;

          const size = Math.min(width, height);
          const startX = (width - size) / 2;
          const startY = (height - size) / 2;

          canvas.width = max;
          canvas.height = max;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('Failed to get canvas context');
          
          ctx.drawImage(img, startX, startY, size, size, 0, 0, max, max);
          
          const base64Url = canvas.toDataURL('image/jpeg', 0.8);
          resolve(base64Url);
        };
        img.onerror = () => reject('Failed to load image');
        if (e.target?.result) {
          img.src = e.target.result as string;
        }
      };
      reader.onerror = () => reject('Failed to read file');
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await compressProfileImage(file);
      setPreviewAvatar(base64);
    } catch (err) {
      console.error(err);
      alert('Failed to process image');
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    setIsSavingProfile(true);

    const updates: any = { name: editName };
    if (previewAvatar) {
      updates.avatar_url = previewAvatar;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', activeUser.userId);

    if (!error) {
      setProfiles(prev => prev.map(p => p.id === activeUser.userId ? { ...p, ...updates } : p));
      try {
        const storedUserStr = localStorage.getItem('activeUser');
        if (storedUserStr) {
          const storedUser = JSON.parse(storedUserStr);
          storedUser.userName = editName;
          localStorage.setItem('activeUser', JSON.stringify(storedUser));
        }
      } catch (e) {}

      setIsEditProfileOpen(false);
      setPreviewAvatar(null);
      window.dispatchEvent(new CustomEvent('profile_updated'));
    }
    
    setIsSavingProfile(false);
  };

  const handleSelectTheme = (themeId: string) => {
    setCurrentTheme(themeId);
    try {
      localStorage.setItem('theme', themeId);
      document.documentElement.setAttribute('data-theme', themeId);
    } catch (e) {}
  };

  const themes = [
    { id: 'classic', name: 'Classic Dark', color: '#E50914', bg: '#141414' },
    { id: 'sweet-pink', name: 'Sweet Pink', color: '#ff69b4', bg: '#fff0f5' },
  ];

  const getBatteryColor = (percent: number) => {
    if (percent <= 30) return '#E50914';
    if (percent <= 60) return '#f5a623';
    return '#2ecc71';
  };

  const me = profiles.find(p => p.id === activeUser.userId);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 max-w-[430px] mx-auto bg-netflix-dark/95 backdrop-blur-sm border-b border-white/5 flex items-center justify-between px-4">
        <div className="flex items-center gap-1">
          <span className="text-netflix-red font-bold text-lg">US Space</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Notification Toggle - Updated Bell Logic */}
          <button
            onClick={toggleNotifications}
            className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center bg-black/40 transition-all ${
              notifPermission === 'granted' && !notifsMuted ? 'text-[#2ecc71]' : 'text-secondary-text'
            }`}
          >
            {notifPermission === 'granted' && !notifsMuted ? (
              <Bell size={14} fill="currentColor" />
            ) : (
              <BellOff size={14} />
            )}
          </button>

          <button
            onClick={() => setIsThemeModalOpen(true)}
            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center bg-black/40 hover:border-netflix-red transition-colors text-foreground"
          >
            <Palette size={14} />
          </button>

          <button 
            onClick={() => {
              if (me) setEditName(me.name);
              setPreviewAvatar(null);
              setIsEditProfileOpen(true);
            }}
            className="relative w-8 h-8 rounded-full overflow-hidden border border-white/10 hover:border-netflix-red transition-colors"
          >
            {me?.avatar_url ? (
              <img src={me.avatar_url} alt="Me" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-netflix-card" />
            )}
          </button>
        </div>
      </nav>

      <BottomSheet
        isOpen={isMoodModalOpen}
        onClose={() => setIsMoodModalOpen(false)}
        title="Update My Mood"
      >
        <div className="flex flex-col items-center gap-8 py-4">
          <div className="relative w-32 h-32 flex items-center justify-center">
             <span className="text-5xl font-black transition-all" style={{ color: getBatteryColor(myMood) }}>
               {myMood}%
             </span>
          </div>
          <div className="w-full space-y-6">
            <input
              type="range"
              min="0"
              max="100"
              value={myMood}
              onChange={(e) => setMyMood(parseInt(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-netflix-red"
            />
            <div className="flex justify-between text-xs text-secondary-text font-medium px-1">
              <span>CRITICAL</span>
              <span>NEUTRAL</span>
              <span>PEAK</span>
            </div>
          </div>
          <button
            onClick={handleSaveMood}
            disabled={isSaving}
            className="w-full py-4 bg-netflix-red text-white font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Mood'}
          </button>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        title="Edit Profile"
      >
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="relative">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full overflow-hidden border-2 border-netflix-red cursor-pointer relative group bg-black/40"
            >
              <img 
                src={previewAvatar || me?.avatar_url || ''} 
                className="w-full h-full object-cover" 
                alt="Profile"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={24} className="text-foreground" />
              </div>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-netflix-card border border-white/10 rounded-full flex items-center justify-center text-foreground shadow-lg hover:scale-110 transition-transform"
            >
              <Camera size={14} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          <div className="w-full space-y-2">
            <label className="text-sm font-medium text-secondary-text flex items-center justify-between">
              Display Name
              <span className="text-[10px] text-netflix-red">Will update everywhere</span>
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-foreground outline-none focus:border-netflix-red"
              placeholder="Your name..."
              maxLength={20}
            />
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={isSavingProfile || !editName.trim()}
            className="w-full py-4 bg-netflix-red text-white font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {isSavingProfile ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Save Changes</>}
          </button>
          <div className="w-full border-t border-white/5 mt-4 pt-6">
            <button
              onClick={handleLogout}
              className="w-full py-4 bg-white/5 hover:bg-red-500/10 text-red-500 font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        title="App Theme"
      >
        <div className="flex flex-col gap-3 py-4">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleSelectTheme(theme.id)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                currentTheme === theme.id 
                  ? 'border-netflix-red bg-netflix-red/10' 
                  : 'border-white/5 bg-black/40 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="w-8 h-8 rounded-full border-2 border-white/20 shadow-lg"
                  style={{ backgroundColor: theme.color }}
                />
                <span className={`font-bold ${currentTheme === theme.id ? 'text-netflix-red' : 'text-foreground'}`}>
                  {theme.name}
                </span>
              </div>
              {currentTheme === theme.id && <Check className="text-netflix-red" size={20} />}
            </button>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
