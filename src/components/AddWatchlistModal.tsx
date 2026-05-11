'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import BottomSheet from './BottomSheet';
import { Check, Clapperboard, Popcorn, Eye, Search, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce'; // Assuming we have it, or I'll add it. Wait, I'll just use a timeout.

interface AddWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onAdded: () => void;
}

export default function AddWatchlistModal({ isOpen, onClose, userId, onAdded }: AddWatchlistModalProps) {
  const [title, setTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [status, setStatus] = useState<'waiting' | 'watching' | 'done'>('waiting');
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
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleAdd = async () => {
    if (!title.trim()) return;
    setIsAdding(true);

    const { error } = await supabase
      .from('watchlist_items')
      .insert([{ title, cover_url: coverUrl || null, status, added_by: userId }]);

    if (!error) {
      setTitle('');
      setCoverUrl('');
      setStatus('waiting');
      onAdded();
      onClose();
    }
    setIsAdding(false);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={<span className="flex items-center gap-2">Add to Watchlist <Clapperboard size={20} /></span>}>
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-secondary-text uppercase tracking-widest flex items-center gap-2">
            Search <Search size={12} />
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search movies or series..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-netflix-red/10 border border-netflix-red/20 rounded-xl px-4 py-3 text-foreground outline-none focus:border-netflix-red"
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

        <div className="space-y-2">
          <label className="text-xs font-bold text-secondary-text uppercase tracking-widest">Title</label>
          <input
            type="text"
            placeholder="Movie / Anime title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-foreground outline-none focus:border-netflix-red"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-secondary-text uppercase tracking-widest">Cover Image URL</label>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Paste image URL (optional)"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-foreground outline-none focus:border-netflix-red text-sm"
            />
            {coverUrl && (
              <div className="w-[60px] h-[90px] rounded-lg overflow-hidden bg-black/40 border border-white/10 flex-shrink-0">
                <img 
                  src={coverUrl} 
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                  className="w-full h-full object-cover" 
                />
              </div>
            )}
          </div>
          <p className="text-[10px] text-secondary-text italic mt-1">
            Tip: Search posters on themoviedb.org
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-secondary-text uppercase tracking-widest">Initial Status</label>
          <div className="flex gap-2">
            {[
              { id: 'waiting', label: <div className="flex items-center gap-1 justify-center">Waiting <Popcorn size={14} /></div> },
              { id: 'watching', label: <div className="flex items-center gap-1 justify-center">Watching <Eye size={14} /></div> },
              { id: 'done', label: <div className="flex items-center gap-1 justify-center">Done <Check size={14} strokeWidth={3}/></div> }
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStatus(s.id as any)}
                className={`flex-1 py-2 rounded-full text-xs font-bold transition-all border ${
                  status === s.id ? 'bg-netflix-red border-netflix-red text-white' : 'bg-transparent border-white/10 text-secondary-text'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleAdd}
          disabled={isAdding || !title.trim()}
          className="w-full py-4 bg-netflix-red text-white font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
        >
          {isAdding ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Clapperboard size={18} /> Add to Watchlist</>}
        </button>
      </div>
    </BottomSheet>
  );
}
