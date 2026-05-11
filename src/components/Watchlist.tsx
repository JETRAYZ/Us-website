'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Play, CheckCircle2, Clock, Trash2, ChevronRight, X, Check, Clapperboard, Popcorn, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { WatchlistItem } from '@/types/database';
import AddWatchlistModal from './AddWatchlistModal';
import BottomSheet from './BottomSheet';

interface WatchlistProps {
  userId: string;
}

type Status = 'All' | 'waiting' | 'watching' | 'done';

export default function Watchlist({ userId }: WatchlistProps) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [filter, setFilter] = useState<Status>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WatchlistItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchItems();

    const channel = supabase
      .channel('watchlist-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watchlist_items' }, () => {
        fetchItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const fetchItems = async () => {
    const { data } = await supabase
      .from('watchlist_items')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setItems(data);
  };

  const filteredItems = items.filter(item => filter === 'All' || item.status === filter);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting': return <Popcorn size={14} />;
      case 'watching': return <Eye size={14} />;
      case 'done': return <Check size={14} strokeWidth={3} />;
      default: return null;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-[#b3b3b3]';
      case 'watching': return 'bg-netflix-red';
      case 'done': return 'bg-[#2ecc71]';
      default: return 'bg-gray-500';
    }
  };

  const handleUpdateStatus = async (item: WatchlistItem) => {
    let nextStatus: WatchlistItem['status'] = 'waiting';
    if (item.status === 'waiting') nextStatus = 'watching';
    else if (item.status === 'watching') nextStatus = 'done';
    else if (item.status === 'done') nextStatus = 'waiting';

    setIsUpdating(true);
    const { error } = await supabase
      .from('watchlist_items')
      .update({ status: nextStatus })
      .eq('id', item.id);
    
    if (!error) {
      setSelectedItem(prev => prev ? { ...prev, status: nextStatus } : null);
      fetchItems();
    }
    setIsUpdating(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('watchlist_items').delete().eq('id', id);
    if (!error) {
      setIsDetailOpen(false);
      fetchItems();
    }
  };

  return (
    <section className="w-full">
      <div className="flex items-center justify-between px-4 pt-6 pb-3">
        <h2 className="text-foreground font-bold text-lg flex items-center gap-2">Our Watchlist <Clapperboard size={20} /></h2>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="w-8 h-8 rounded-full bg-netflix-red flex items-center justify-center text-white active:scale-90 transition-all shadow-lg"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 overflow-x-auto hide-scrollbar mb-4">
        {['All', 'waiting', 'watching', 'done'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s as Status)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              filter === s ? 'bg-netflix-red text-white' : 'bg-netflix-card text-secondary-text'
            }`}
          >
            {s === 'All' ? 'All' : (
              <div className="flex items-center gap-1.5 justify-center">
                {s.charAt(0).toUpperCase() + s.slice(1)}
                {getStatusIcon(s)}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Carousel */}
      <div className="flex gap-3 px-4 pb-4 overflow-x-auto hide-scrollbar snap-x">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <motion.div
              key={item.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setSelectedItem(item); setIsDetailOpen(true); }}
              className="flex-shrink-0 w-[120px] h-[180px] rounded-xl overflow-hidden relative bg-netflix-card shadow-xl snap-start cursor-pointer border border-white/5"
            >
              {item.cover_url ? (
                <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-2 text-center">
                   <span className="text-[10px] text-secondary-text/50 uppercase font-bold">{item.title}</span>
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              
              <div className={`absolute top-0 right-0 px-1.5 py-0.5 rounded-bl-lg text-[10px] flex items-center justify-center font-black text-foreground ${getStatusBadgeColor(item.status)} shadow-md`}>
                {getStatusIcon(item.status)}
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <p className="text-foreground text-[10px] font-bold leading-tight line-clamp-2 drop-shadow-md">
                  {item.title}
                </p>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="w-full py-12 flex flex-col items-center justify-center text-secondary-text/40 italic">
            <p className="text-sm flex items-center justify-center gap-2">Nothing here yet — add something! <Clapperboard size={16} /></p>
          </div>
        )}
      </div>

      <AddWatchlistModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        userId={userId}
        onAdded={fetchItems}
      />

      <BottomSheet
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Item Details"
      >
        {selectedItem && (
          <div className="flex flex-col gap-6">
            <div className="flex gap-4">
              <div className="w-[100px] h-[150px] rounded-xl overflow-hidden bg-black/40 flex-shrink-0 border border-white/10">
                {selectedItem.cover_url && <img src={selectedItem.cover_url} className="w-full h-full object-cover" />}
              </div>
              <div className="flex flex-col justify-center">
                <h3 className="text-foreground text-xl font-bold mb-2 leading-tight">{selectedItem.title}</h3>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase text-foreground w-fit ${getStatusBadgeColor(selectedItem.status)}`}>
                  {getStatusIcon(selectedItem.status)} {selectedItem.status}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/5">
              <button
                onClick={() => handleUpdateStatus(selectedItem)}
                disabled={isUpdating}
                className="w-full py-4 bg-white/5 border border-white/10 rounded-xl text-foreground font-bold flex items-center justify-center gap-2 active:bg-white/10 transition-all disabled:opacity-50"
              >
                {selectedItem.status === 'waiting' && <><Play size={18} className="fill-white" /> We&apos;re watching this!</>}
                {selectedItem.status === 'watching' && <><CheckCircle2 size={18} className="text-[#2ecc71]" /> Mark as Done</>}
                {selectedItem.status === 'done' && <><RotateCcw size={18} /> Watch Again</>}
              </button>

              {selectedItem.added_by === userId && (
                <button
                  onClick={() => handleDelete(selectedItem.id)}
                  className="w-full py-4 border border-netflix-red/30 text-netflix-red text-sm font-bold rounded-xl flex items-center justify-center gap-2 active:bg-netflix-red/10 transition-all"
                >
                  <Trash2 size={16} /> Remove from List
                </button>
              )}
            </div>
          </div>
        )}
      </BottomSheet>
    </section>
  );
}

const RotateCcw = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
);
