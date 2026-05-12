'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Search, Play, Pause, ChevronRight, Loader2, Moon, Disc } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/database';
import BottomSheet from './BottomSheet';

interface MoodMusicProps {
  activeUser: { userId: string; userName: string };
}

export default function MoodMusic({ activeUser }: MoodMusicProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [musicUrl, setMusicUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    fetchProfiles();
    const channel = supabase
      .channel('mood-music-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        setProfiles(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*').order('role', { ascending: true });
    if (data) setProfiles(data);
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&limit=4&entity=song`);
        const data = await res.json();
        setSearchResults(data.results);
      } catch(e) {
        console.error("Search error", e);
      }
      setIsSearching(false);
    }, 500);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const handleUpdateMusic = async (url: string) => {
    if (!url) return;
    setIsSaving(true);
    const { error } = await supabase.from('profiles').update({ music_url: url }).eq('id', activeUser.userId);
    if (!error) {
      setProfiles(prev => prev.map(p => p.id === activeUser.userId ? { ...p, music_url: url } : p));
      setIsModalOpen(false);
      setMusicUrl('');
      setSearchQuery('');
      setSearchResults([]);
    }
    setIsSaving(false);
  };

  const handleSelectSong = async (song: any) => {
    const payload = JSON.stringify({
      type: 'itunes',
      previewUrl: song.previewUrl,
      trackName: song.trackName,
      artistName: song.artistName,
      artworkUrl: song.artworkUrl100
    });
    await handleUpdateMusic(payload);
  };

  return (
    <section className="px-4 mt-2">
      <div className="bg-netflix-card rounded-2xl p-6 shadow-2xl border border-white/5 relative overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-foreground font-bold text-lg flex items-center gap-2">
             <Music size={20} className="text-netflix-red"/> Vibes Today
          </h2>
          <div className="flex gap-1">
             {[1,2,3].map(i => (
               <motion.div 
                 key={i}
                 animate={{ height: [8, 16, 8] }}
                 transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                 className="w-1 bg-netflix-red rounded-full"
               />
             ))}
          </div>
        </div>

        <div className="flex flex-col gap-5 mb-6">
          {profiles.map(profile => (
            <div key={profile.id} className="relative">
              <p className="text-[10px] font-black text-secondary-text mb-2 uppercase tracking-[0.2em] px-1">{profile.name}'s current vibe</p>
              {renderMusicPlayer(profile.music_url)}
            </div>
          ))}
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full py-4 rounded-2xl bg-foreground/5 border border-foreground/10 text-foreground text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-foreground/10 shadow-lg"
        >
          <Disc size={18} className="text-netflix-red" /> Update Vibe
        </button>
      </div>

      <BottomSheet
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Share your vibe"
      >
        <div className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto hide-scrollbar pb-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-bold text-sm px-1">
              <Search size={18} className="text-netflix-red"/> Search for a song
            </div>
            <input
              type="text"
              placeholder="Artist, Song, or Album..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-foreground/5 border border-foreground/10 rounded-2xl px-5 py-4 text-foreground outline-none focus:border-netflix-red transition-all shadow-inner"
            />
          </div>

          <AnimatePresence>
            {isSearching ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 flex justify-center">
                <Loader2 className="animate-spin text-netflix-red" size={32} />
              </motion.div>
            ) : searchResults.length > 0 ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
                {searchResults.map((song: any) => (
                  <button 
                    key={song.trackId}
                    onClick={() => handleSelectSong(song)}
                    className="flex items-center gap-4 p-3 bg-foreground/5 rounded-2xl hover:bg-foreground/10 active:scale-[0.98] transition-all border border-transparent hover:border-foreground/10 group"
                  >
                    <img src={song.artworkUrl100} className="w-14 h-14 rounded-xl shadow-lg group-hover:rotate-6 transition-transform" />
                    <div className="flex-1 text-left overflow-hidden">
                      <p className="text-sm font-bold text-foreground truncate">{song.trackName}</p>
                      <p className="text-xs text-secondary-text truncate">{song.artistName}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-netflix-red/10 flex items-center justify-center text-netflix-red opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={14} fill="currentColor" />
                    </div>
                  </button>
                ))}
              </motion.div>
            ) : searchQuery && !isSearching && (
              <p className="text-center text-secondary-text text-sm py-8">No songs found matching "{searchQuery}"</p>
            )}
          </AnimatePresence>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-foreground/10"></div>
            <span className="flex-shrink-0 mx-4 text-secondary-text text-[10px] uppercase tracking-[0.2em] font-black">or link</span>
            <div className="flex-grow border-t border-foreground/10"></div>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Paste Spotify or YouTube link..."
              value={musicUrl}
              onChange={(e) => setMusicUrl(e.target.value)}
              className="w-full bg-foreground/5 border border-foreground/10 rounded-2xl px-5 py-4 text-foreground outline-none text-sm placeholder:text-secondary-text/50"
            />
            <button
              onClick={() => handleUpdateMusic(musicUrl)}
              disabled={isSaving || !musicUrl.startsWith('https://')}
              className="w-full py-4 bg-netflix-red text-white font-bold rounded-2xl active:scale-95 transition-all disabled:opacity-50 shadow-xl"
            >
              {isSaving && !searchQuery ? <Loader2 className="animate-spin mx-auto" size={24} /> : "Save Link"}
            </button>
          </div>
        </div>
      </BottomSheet>
    </section>
  );
}

const getEmbedUrl = (url: string) => {
  if (url.includes('spotify.com/track/')) {
    const id = url.split('track/')[1].split('?')[0];
    return `https://open.spotify.com/embed/track/${id}`;
  }
  if (url.includes('youtube.com/watch?v=')) {
    const id = url.split('v=')[1].split('&')[0];
    return `https://www.youtube.com/embed/${id}`;
  }
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1].split('?')[0];
    return `https://www.youtube.com/embed/${id}`;
  }
  return null;
}

const renderMusicPlayer = (url: string | null) => {
  if (!url) return <div className="p-4 rounded-2xl bg-foreground/5 border border-dashed border-foreground/10 text-secondary-text text-xs italic flex items-center gap-2 justify-center"><Moon size={14}/> Resting in silence...</div>;

  if (url.startsWith('{')) {
    try {
      const song = JSON.parse(url);
      return <AudioPlayer song={song} />;
    } catch(e) {
      return <p className="text-red-500 text-xs">Error parsing song</p>;
    }
  }

  const embedUrl = getEmbedUrl(url);
  if (embedUrl) {
    return (
      <div className="rounded-2xl overflow-hidden shadow-xl border border-white/5 bg-black">
        <iframe 
          style={{ borderRadius: '16px' }} 
          src={embedUrl} 
          width="100%" 
          height={embedUrl.includes('spotify') ? "80" : "180"} 
          frameBorder="0" 
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
          loading="lazy"
        ></iframe>
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block p-4 rounded-2xl bg-netflix-red/10 text-netflix-red text-sm font-bold truncate border border-netflix-red/20 text-center active:scale-[0.98] transition-transform">
       🔗 Open External Link
    </a>
  );
};

function AudioPlayer({ song }: { song: any }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      document.querySelectorAll('audio').forEach(el => el.pause());
      audioRef.current?.play();
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  return (
    <div className="group relative flex items-center gap-4 bg-foreground/5 p-3 rounded-2xl border border-foreground/10 hover:bg-foreground/10 transition-all overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -left-10 -top-10 w-32 h-32 bg-netflix-red/5 blur-3xl rounded-full pointer-events-none group-hover:bg-netflix-red/10 transition-all"></div>
      
      {/* Vinyl Art */}
      <div className="relative w-16 h-16 flex-shrink-0 z-10">
        <motion.div 
          animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="relative w-full h-full"
        >
          <img 
            src={song.artworkUrl} 
            className="w-full h-full object-cover rounded-full shadow-2xl border-2 border-netflix-dark" 
          />
          <div className="absolute inset-0 rounded-full border-[10px] border-black/30 pointer-events-none"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-netflix-dark rounded-full shadow-inner border border-white/20"></div>
        </motion.div>
        
        {/* Visualizer bars */}
        <AnimatePresence>
          {isPlaying && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5"
            >
              {[1,2,3,4].map(i => (
                <motion.div 
                  key={i}
                  animate={{ height: [4, 10, 4] }}
                  transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }}
                  className="w-0.5 bg-netflix-red rounded-full"
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-hidden z-10">
        <p className="text-sm font-black text-foreground truncate drop-shadow-sm">{song.trackName}</p>
        <p className="text-[10px] font-bold text-secondary-text truncate uppercase tracking-widest">{song.artistName}</p>
      </div>

      <button 
        onClick={togglePlay} 
        className="w-12 h-12 flex items-center justify-center bg-netflix-red text-white rounded-full flex-shrink-0 hover:scale-110 active:scale-90 transition-all shadow-[0_8px_20px_rgba(229,9,20,0.3)] z-10"
      >
        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
      </button>
      <audio ref={audioRef} src={song.previewUrl} />
    </div>
  );
}
