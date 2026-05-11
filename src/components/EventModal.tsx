'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Calendar as CalendarIcon, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Event } from '@/types/database';
import BottomSheet from './BottomSheet';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  events: Event[];
  userId: string;
  profiles?: any[];
  onEventAdded: (event: Event) => void;
  onEventDeleted: (id: string) => void;
}

export default function EventModal({ 
  isOpen, 
  onClose, 
  date, 
  events, 
  userId, 
  profiles = [],
  onEventAdded, 
  onEventDeleted 
}: EventModalProps) {
  const [title, setTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const supabase = createClient();

  const localDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const dayEvents = events.filter(e => e.event_date === localDateStr);

  const handleAddEvent = async () => {
    if (!title.trim()) return;
    setIsAdding(true);
    
    const newEvent = {
      title,
      event_date: localDateStr,
      type: 'date',
      created_by: userId,
    };

    const { data, error } = await supabase
      .from('events')
      .insert([newEvent])
      .select()
      .single();

    if (!error && data) {
      onEventAdded(data);
      setTitle('');
      // Trigger update for other components (like CountdownBanner)
      window.dispatchEvent(new CustomEvent('calendar_updated'));
    }
    setIsAdding(false);
  };

  const handleDeleteEvent = async (id: string) => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (!error) {
      onEventDeleted(id);
      setConfirmDeleteId(null);
      // Trigger update for other components
      window.dispatchEvent(new CustomEvent('calendar_updated'));
    }
  };



  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
    >
      <div className="space-y-6">
        {/* Events List */}
        <div className="space-y-3">
          {dayEvents.length > 0 ? (
            dayEvents.map(event => {
              const isUser1 = profiles[0] && event.created_by === profiles[0].id;
              const isUser2 = profiles[1] && event.created_by === profiles[1].id;
              const borderColor = event.is_virtual ? event.virtual_color : (isUser1 ? '#E50914' : (isUser2 ? '#3b82f6' : '#ffffff'));

              return (
                <div 
                  key={event.id}
                  className="flex items-center justify-between bg-black/20 p-3 rounded-xl border-l-4"
                  style={{ borderLeftColor: borderColor }}
                >
                <div className="flex flex-col">
                  <span className="text-foreground font-medium">{event.title}</span>
                </div>
                
                {event.created_by === userId && !event.is_virtual && (
                  <div className="flex items-center gap-2">
                    {confirmDeleteId === event.id ? (
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleDeleteEvent(event.id)}
                          className="bg-netflix-red p-1.5 rounded-lg text-white"
                        >
                          <Check size={14} />
                        </button>
                        <button 
                          onClick={() => setConfirmDeleteId(null)}
                          className="bg-white/10 p-1.5 rounded-lg text-foreground"
                        >
                          <Trash2 size={14} className="opacity-50" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setConfirmDeleteId(event.id)}
                        className="p-2 text-secondary-text hover:text-netflix-red transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )})
          ) : (
            <p className="text-center text-secondary-text/50 text-xs italic py-4">
              No events scheduled for this day
            </p>
          )}
        </div>

        {/* Add Event Form */}
        <div className="pt-6 border-t border-white/5">
          <h4 className="text-foreground text-sm font-bold mb-4 flex items-center gap-2">
            <Plus size={16} className="text-netflix-red" /> Add New Event
          </h4>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Event title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-foreground outline-none focus:border-netflix-red"
            />



            <button
              onClick={handleAddEvent}
              disabled={isAdding || !title.trim()}
              className="w-full py-4 bg-netflix-red text-white font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAdding ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CalendarIcon size={18} /> Add to Calendar</>}
            </button>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
