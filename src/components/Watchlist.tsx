'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Play, CheckCircle2, Trash2, X, Check, Clapperboard, Popcorn, Eye, Star, Film, Tv, Sparkles, Utensils, MapPin, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { WatchlistItem } from '@/types/database';
import AddWatchlistModal, { WatchlistCategory } from './AddWatchlistModal';
import BottomSheet from './BottomSheet';
import ConfirmModal from './ConfirmModal';

interface WatchlistProps {
  userId: string;
}

type StatusFilter = 'All' | 'waiting' | 'watching' | 'done';
type CategoryFilter = 'all' | WatchlistCategory;

export default function Watchlist({ userId }: WatchlistProps) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('All');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WatchlistItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Review & Rating State
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [isSavingReview, setIsSavingReview] = useState(false);
  
  const supabase = useMemo(() => createClient(), []);

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

  const filteredItems = items.filter(item => {
    const matchesStatus = filter === 'All' || item.status === filter;
    const matchesCategory = categoryFilter === 'all' || (item.category || 'movie') === categoryFilter;
    return matchesStatus && matchesCategory;
  });

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

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'series': return { label: 'Series', icon: Tv, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
      case 'anime': return { label: 'Anime', icon: Sparkles, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
      case 'food': return { label: 'Food', icon: Utensils, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' };
      case 'place': return { label: 'Place', icon: MapPin, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      default: return { label: 'Movie', icon: Film, color: 'text-red-400 bg-red-500/10 border-red-500/20' };
    }
  };

  const handleOpenDetail = (item: WatchlistItem) => {
    setSelectedItem(item);
    setRating(item.rating || 0);
    setReview(item.review || '');
    setIsDetailOpen(true);
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

  const handleSaveRatingAndReview = async () => {
    if (!selectedItem) return;
    setIsSavingReview(true);
    const { error } = await supabase
      .from('watchlist_items')
      .update({ rating, review: review.trim() || null })
      .eq('id', selectedItem.id);

    if (!error) {
      setSelectedItem(prev => prev ? { ...prev, rating, review: review.trim() || null } : null);
      fetchItems();
    }
    setIsSavingReview(false);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    const { error } = await supabase.from('watchlist_items').delete().eq('id', itemToDelete);
    if (!error) {
      setIsDetailOpen(false);
      setItemToDelete(null);
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

      {/* Category Pills */}
      <div className="flex gap-2 px-4 overflow-x-auto hide-scrollbar mb-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'movie', label: '🍿 Movies' },
          { id: 'series', label: '📺 Series' },
          { id: 'anime', label: '✨ Anime' },
          { id: 'food', label: '🍜 Food' },
          { id: 'place', label: '📍 Places' },
        ].map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryFilter(c.id as CategoryFilter)}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all border ${
              categoryFilter === c.id
                ? 'bg-white text-black border-white shadow-sm'
                : 'bg-black/30 text-secondary-text border-white/5 hover:text-white'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Status Filter Pills */}
      <div className="flex gap-2 px-4 overflow-x-auto hide-scrollbar mb-4">
        {['All', 'waiting', 'watching', 'done'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s as StatusFilter)}
            className={`px-3.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              filter === s ? 'bg-netflix-red text-white shadow-md' : 'bg-netflix-card text-secondary-text hover:text-white'
            }`}
          >
            {s === 'All' ? 'All Status' : s === 'waiting' ? 'Want to watch' : s === 'watching' ? 'Watching' : 'Done'}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex gap-4 px-4 overflow-x-auto hide-scrollbar snap-x pb-4">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const badge = getCategoryBadge(item.category);
            const CategoryIcon = badge.icon;
            return (
              <motion.div
                key={item.id}
                layoutId={item.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleOpenDetail(item)}
                className="w-[140px] h-[210px] rounded-2xl bg-netflix-card border border-white/5 overflow-hidden flex-shrink-0 relative group shadow-lg cursor-pointer snap-start flex flex-col justify-between"
              >
                {item.cover_url ? (
                  <img src={item.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 text-secondary-text/30 p-4 text-center">
                    <CategoryIcon size={32} className="mb-2 text-white/20" />
                    <span className="text-[10px] font-bold uppercase">{badge.label}</span>
                  </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

                {/* Top Badges */}
                <div className="absolute top-2 left-2 right-2 flex justify-between items-center pointer-events-none">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border backdrop-blur-md flex items-center gap-1 ${badge.color}`}>
                    <CategoryIcon size={10} /> {badge.label}
                  </span>
                  <div className={`p-1.5 rounded-full text-foreground shadow-md backdrop-blur-md ${getStatusBadgeColor(item.status)}`}>
                    {getStatusIcon(item.status)}
                  </div>
                </div>

                {/* Bottom Title & Rating */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  {item.rating ? (
                    <div className="flex items-center gap-0.5 mb-1 text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={10} className={i < (item.rating || 0) ? 'fill-yellow-400' : 'text-white/20'} />
                      ))}
                    </div>
                  ) : null}
                  <p className="text-foreground text-xs font-bold leading-tight line-clamp-2 drop-shadow-md">
                    {item.title}
                  </p>
                </div>
              </motion.div>
            );
          })
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
          <div className="flex flex-col gap-5 pb-4">
            <div className="flex gap-4">
              <div className="w-[100px] h-[150px] rounded-2xl overflow-hidden bg-black/40 flex-shrink-0 border border-white/10 shadow-lg">
                {selectedItem.cover_url ? (
                  <img src={selectedItem.cover_url} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20">
                    <Clapperboard size={28} />
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${getCategoryBadge(selectedItem.category).color}`}>
                    {getCategoryBadge(selectedItem.category).label}
                  </span>
                  <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase text-foreground ${getStatusBadgeColor(selectedItem.status)}`}>
                    {getStatusIcon(selectedItem.status)} {selectedItem.status}
                  </div>
                </div>
                <h3 className="text-foreground text-lg font-bold leading-tight">{selectedItem.title}</h3>
              </div>
            </div>

            {/* 5-Star Rating & Review Box */}
            <div className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-secondary-text uppercase tracking-wider flex items-center gap-1.5">
                  <Star size={14} className="text-yellow-400 fill-yellow-400" /> Couple Rating
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-125 transition-transform"
                    >
                      <Star
                        size={20}
                        className={star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Write a cute review or note together... (e.g. 10/10 ชอบตอนจบมากกก)"
                maxLength={200}
                className="w-full h-18 bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-foreground outline-none focus:border-netflix-red resize-none hide-scrollbar"
              />

              <button
                onClick={handleSaveRatingAndReview}
                disabled={isSavingReview}
                className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-foreground text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                {isSavingReview ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check size={14} /> Save Rating & Review</>}
              </button>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/5">
              <button
                onClick={() => handleUpdateStatus(selectedItem)}
                disabled={isUpdating}
                className="w-full py-3.5 bg-netflix-red text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-netflix-red/20 text-sm"
              >
                {selectedItem.status === 'waiting' && <><Play size={16} className="fill-white" /> We&apos;re watching this!</>}
                {selectedItem.status === 'watching' && <><CheckCircle2 size={16} /> Mark as Done</>}
                {selectedItem.status === 'done' && <><RotateCcw size={16} /> Watch Again</>}
              </button>

              <button
                onClick={() => {
                  setItemToDelete(selectedItem.id);
                  setIsConfirmOpen(true);
                }}
                className="w-full py-3 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 active:bg-red-500/10 transition-all"
              >
                <Trash2 size={14} /> Remove from List
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Remove Item?"
        message="คุณต้องการลบรายการนี้ออกจาก Watchlist ใช่ไหม?"
        confirmText="Remove"
        cancelText="Keep it"
      />
    </section>
  );
}

const RotateCcw = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
);
