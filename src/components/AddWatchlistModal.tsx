'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import BottomSheet from './BottomSheet';
import { Check, Clapperboard, Popcorn, Eye, Search, Loader2, Film, Tv, Sparkles, Utensils, MapPin } from 'lucide-react';
import { sendPushTrigger } from '@/lib/push-client';

interface AddWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onAdded: () => void;
}

export type WatchlistCategory = 'movie' | 'series' | 'anime' | 'food' | 'place';

export default function AddWatchlistModal({ isOpen, onClose, userId, onAdded }: AddWatchlistModalProps) {
  const [title, setTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [status, setStatus] = useState<'waiting' | 'watching' | 'done'>('waiting');
  const [category, setCategory] = useState<WatchlistCategory>('movie');
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data.slice(0, 5));
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectShow = (show: any) => {
    setTitle(show.name);
    setCoverUrl(show.image?.original || show.image?.medium || '');
    setCategory(show.type === 'Animation' ? 'anime' : 'series');
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleAdd = async () => {
    if (!title.trim()) return;
    setIsAdding(true);

    const { error } = await supabase
      .from('watchlist_items')
      .insert([{
        title,
        cover_url: coverUrl || null,
        status,
        category,
        added_by: userId,
      }]);

    if (!error) {
      // Trigger Web Push to partner
      supabase.from('profiles').select('id, name').then(({ data: profiles }) => {
        if (profiles) {
          const partner = profiles.find(p => p.id !== userId);
          const me = profiles.find(p => p.id === userId);
          if (partner) {
            sendPushTrigger({
              targetUserId: partner.id,
              title: `เพิ่มรายการใหม่ใน Watchlist 🎬`,
              body: `${me?.name || 'Partner'} เพิ่ม "${title}" ลงในรายการรอดูด้วยกัน`,
            });
          }
        }
      });

      setTitle('');
      setCoverUrl('');
      setStatus('waiting');
      setCategory('movie');
      onAdded();
      onClose();
    }
    setIsAdding(false);
  };

  const categories: { id: WatchlistCategory; label: string; icon: any }[] = [
    { id: 'movie', label: 'Movie', icon: Film },
    { id: 'series', label: 'Series', icon: Tv },
    { id: 'anime', label: 'Anime', icon: Sparkles },
    { id: 'food', label: 'Food', icon: Utensils },
    { id: 'place', label: 'Place', icon: MapPin },
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={<span className="flex items-center gap-2">Add to Watchlist <Clapperboard size={20} /></span>}>
      <div className="space-y-5 pb-6">
        {/* Category Picker */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-secondary-text uppercase tracking-widest">
            Category
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`py-2.5 px-1 rounded-xl flex flex-col items-center gap-1 transition-all border ${
                    isSelected
                      ? 'bg-netflix-red text-white border-netflix-red shadow-lg shadow-netflix-red/30 scale-105'
                      : 'bg-black/30 border-white/5 text-secondary-text hover:text-white'
                  }`}
                >
                  <Icon size={14} />
                  <span className="text-[10px] font-bold">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-secondary-text uppercase tracking-widest flex items-center gap-2">
            Auto-Search Cover <Search size={12} />
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search movie/series for auto poster..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-foreground outline-none focus:border-netflix-red text-sm"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 size={16} className="animate-spin text-netflix-red" />
              </div>
            )}
            
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-netflix-card border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
                {searchResults.map((result: any) => (
                  <button
                    key={result.show.id}
                    onClick={() => selectShow(result.show)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                  >
                    {result.show.image?.medium ? (
                      <img src={result.show.image.medium} alt="" className="w-8 h-12 object-cover rounded" />
                    ) : (
                      <div className="w-8 h-12 bg-white/5 rounded flex items-center justify-center">
                        <Clapperboard size={14} className="text-secondary-text" />
                      </div>
                    )}
                    <div className="text-left">
                      <div className="text-sm font-bold text-foreground">{result.show.name}</div>
                      <div className="text-[10px] text-secondary-text">
                        {result.show.premiered?.split('-')[0]} • {result.show.genres?.join(', ')}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-secondary-text uppercase tracking-widest">
            Title / Name
          </label>
          <input
            type="text"
            placeholder="e.g. Stranger Things, ข้าวต้มปลา..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-foreground outline-none focus:border-netflix-red text-sm font-bold"
          />
        </div>

        {/* Status */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-secondary-text uppercase tracking-widest">
            Status
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'waiting', label: 'Want to watch', icon: Popcorn },
              { id: 'watching', label: 'Watching', icon: Eye },
              { id: 'done', label: 'Watched', icon: Check },
            ].map((s) => {
              const Icon = s.icon;
              const isSelected = status === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatus(s.id as any)}
                  className={`py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all border text-xs font-bold ${
                    isSelected
                      ? 'bg-white text-black border-white shadow-md'
                      : 'bg-black/30 border-white/5 text-secondary-text hover:text-white'
                  }`}
                >
                  <Icon size={14} />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleAdd}
          disabled={isAdding || !title.trim()}
          className="w-full py-4 bg-netflix-red text-white font-bold rounded-2xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-netflix-red/20 mt-2"
        >
          {isAdding ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Add to List'
          )}
        </button>
      </div>
    </BottomSheet>
  );
}
