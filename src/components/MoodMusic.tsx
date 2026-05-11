'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Music, Search, Play, Pause, ChevronRight, Loader2, Moon } from 'lucide-react';
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
  
  // Search State
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

  // Debounced iTunes Search
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
      // อัปเดต state แบบ manual เพื่อให้หน้าเว็บเปลี่ยนทันที (กรณี Realtime ปิดอยู่)
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
      <div className="bg-netflix-card rounded-2xl p-5 shadow-xl border border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-foreground font-semibold flex items-center gap-2"><Music size={20} className="text-netflix-red"/> Vibes Today</h2>
        </div>

        {/* Players List instead of Grid */}
        <div className="flex flex-col gap-4 mb-5">
          {profiles.map(profile => (
            <div key={profile.id} className="bg-foreground/5 rounded-xl p-3 border border-foreground/10">
              <p className="text-xs font-bold text-foreground/60 mb-2 uppercase tracking-wider">{profile.name}'s Vibe</p>
              {renderMusicPlayer(profile.music_url)}
            </div>
          ))}
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full py-3 rounded-xl border border-netflix-red text-netflix-red text-sm font-bold flex items-center justify-center gap-2 active:bg-netflix-red active:text-white transition-all"
        >
          Update My Song <Music size={16} />
        </button>
      </div>

      <BottomSheet
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Update your vibe"
      >
        <div className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto hide-scrollbar pb-4">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Search size={16} className="text-netflix-red"/> Search Song (Fast & Easy!)
            </label>
            <input
              type="text"
              placeholder="e.g. Taylor Swift, Bruno Mars..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 text-foreground outline-none focus:border-netflix-red"
            />
          </div>

          {isSearching && (
            <div className="text-center py-4">
              <Loader2 className="animate-spin text-netflix-red mx-auto" size={24} />
            </div>
          )}
          
          {!isSearching && searchResults.length > 0 && (
            <div className="flex flex-col gap-2">
              {searchResults.map((song: any) => (
                <div 
                  key={song.trackId}
                  onClick={() => handleSelectSong(song)}
                  className="flex items-center gap-3 p-2 bg-foreground/5 rounded-xl cursor-pointer hover:bg-foreground/10 active:scale-[0.98] transition-all border border-transparent hover:border-foreground/10"
                >
                  <img src={song.artworkUrl100} className="w-12 h-12 rounded-md shadow-md" />
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-foreground truncate">{song.trackName}</p>
                    <p className="text-xs text-foreground/60 truncate">{song.artistName}</p>
                  </div>
                  <ChevronRight className="text-foreground/30" size={16} />
                </div>
              ))}
            </div>
          )}

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-foreground/30 text-[10px] uppercase tracking-wider font-bold">OR PASTE LINK</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="https://open.spotify.com/..."
              value={musicUrl}
              onChange={(e) => setMusicUrl(e.target.value)}
              className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 text-foreground outline-none focus:border-foreground/20 text-sm"
            />
            <button
              onClick={() => handleUpdateMusic(musicUrl)}
              disabled={isSaving || !musicUrl.startsWith('https://')}
              className="w-full py-3 bg-foreground/10 text-foreground font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50 mt-2 flex justify-center items-center h-12"
            >
              {isSaving && !searchQuery ? <Loader2 className="animate-spin" size={20} /> : "Save Link"}
            </button>
          </div>
        </div>
      </BottomSheet>
    </section>
  );
}

// ----------------------------------------------------------------------
// RENDER HELPERS
// ----------------------------------------------------------------------

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
  if (!url) return <p className="text-foreground/40 text-sm italic py-2 flex items-center gap-1.5">No vibe set <Moon size={16} /></p>;

  // If it's our custom JSON string from iTunes API
  if (url.startsWith('{')) {
    try {
      const song = JSON.parse(url);
      return <AudioPlayer song={song} />;
    } catch(e) {
      return <p className="text-red-500 text-xs">Error parsing song</p>;
    }
  }

  // If it's a Spotify/YT link, try to embed it
  const embedUrl = getEmbedUrl(url);
  if (embedUrl && embedUrl.includes('spotify')) {
    return (
      <iframe 
        style={{ borderRadius: '12px' }} 
        src={embedUrl} 
        width="100%" 
        height="80" 
        frameBorder="0" 
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
        loading="lazy"
      ></iframe>
    );
  }

  if (embedUrl && embedUrl.includes('youtube')) {
    return (
      <div className="aspect-video w-full rounded-xl overflow-hidden shadow-lg border border-white/5">
        <iframe 
          src={embedUrl} 
          width="100%" 
          height="100%" 
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        ></iframe>
      </div>
    );
  }

  // Fallback for regular links
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-netflix-red underline text-sm break-all">
      {url}
    </a>
  );
};

// ----------------------------------------------------------------------
// CUSTOM AUDIO PLAYER COMPONENT
// ----------------------------------------------------------------------

function AudioPlayer({ song }: { song: any }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      // Pause all other audio tags on the page first (optional, but good UX)
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
    <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl">
      <div className="relative w-12 h-12 flex-shrink-0">
        <img 
          src={song.artworkUrl} 
          className={`w-full h-full object-cover shadow-md transition-all duration-500 ${isPlaying ? 'animate-[spin_4s_linear_infinite] rounded-full scale-105' : 'rounded-md'}`} 
        />
        <div className="absolute inset-0 bg-black/10 rounded-full"></div>
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="text-sm font-bold text-foreground truncate">{song.trackName}</p>
        <p className="text-[10px] text-foreground/60 truncate">{song.artistName}</p>
      </div>
      <button 
        onClick={togglePlay} 
        className="w-10 h-10 flex items-center justify-center bg-netflix-red text-white rounded-full flex-shrink-0 hover:scale-105 active:scale-95 transition-all shadow-lg"
      >
        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
      </button>
      <audio ref={audioRef} src={song.previewUrl} />
    </div>
  );
}
