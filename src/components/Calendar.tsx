'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays, Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Event } from '@/types/database';
import EventModal from './EventModal';

interface CalendarProps {
  userId: string;
}

export default function Calendar({ userId }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchEvents();
    fetchProfiles();

    const channel = supabase
      .channel('calendar-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentDate, supabase]);

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('id, role').order('role', { ascending: true });
    if (data) setProfiles(data);
  };

  const fetchEvents = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);

    const startStr = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}-${String(startOfMonth.getDate()).padStart(2, '0')}`;
    const endStr = `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}`;

    const { data } = await supabase
      .from('events')
      .select('*')
      .gte('event_date', startStr)
      .lte('event_date', endStr);

    if (data) setEvents(data);
  };

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    
    // Day offset for start of month
    const firstDay = date.getDay();
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [currentDate]);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const handleDayClick = (day: Date | null) => {
    if (!day) return;
    setSelectedDate(day);
    setIsModalOpen(true);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const displayEvents = useMemo(() => {
    const combined: any[] = [...events];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 18th Anniversary
    combined.push({
      id: `virtual-anniversary-${year}-${month}`,
      created_by: 'system',
      event_date: `${year}-${String(month + 1).padStart(2, '0')}-18`,
      title: '💖 Our Anniversary',
      description: 'Happy Anniversary!',
      created_at: new Date().toISOString(),
      is_virtual: true,
      virtual_type: 'anniversary',
      virtual_color: '#ff69b4' // Pink
    });

    // March 16 User 2 Birthday
    if (month === 2) {
      combined.push({
        id: `virtual-bday2-${year}`,
        created_by: 'system',
        event_date: `${year}-03-16`,
        title: '🎂 วันเกิดเฟือง',
        description: '',
        created_at: new Date().toISOString(),
        is_virtual: true,
        virtual_type: 'birthday',
        virtual_color: '#3b82f6' // Blue
      });
    }

    // June 16 User 1 Birthday
    if (month === 5) {
      combined.push({
        id: `virtual-bday1-${year}`,
        created_by: 'system',
        event_date: `${year}-06-16`,
        title: '🎂 วันเกิดข้าวฝ้าย',
        description: '',
        created_at: new Date().toISOString(),
        is_virtual: true,
        virtual_type: 'birthday',
        virtual_color: '#E50914' // Red
      });
    }

    // Fixed Thai Holidays
    const thaiHolidays = [
      { date: '01-01', title: '🎊 วันขึ้นปีใหม่' },
      { date: '04-06', title: '👑 วันจักรี' },
      { date: '04-13', title: '💦 วันสงกรานต์' },
      { date: '04-14', title: '💦 วันสงกรานต์' },
      { date: '04-15', title: '💦 วันสงกรานต์' },
      { date: '05-01', title: '🛠️ วันแรงงาน' },
      { date: '05-04', title: '👑 วันฉัตรมงคล' },
      { date: '06-03', title: '👑 วันเฉลิมฯ พระราชินี' },
      { date: '07-28', title: '👑 วันเฉลิมฯ ร.10' },
      { date: '08-12', title: '💙 วันแม่แห่งชาติ' },
      { date: '10-13', title: '👑 วันนวมินทรมหาราช' },
      { date: '10-23', title: '👑 วันปิยมหาราช' },
      { date: '12-05', title: '💛 วันพ่อแห่งชาติ' },
      { date: '12-10', title: '📜 วันรัฐธรรมนูญ' },
      { date: '12-31', title: '🎇 วันสิ้นปี' }
    ];

    thaiHolidays.forEach((holiday, idx) => {
      const [m, d] = holiday.date.split('-');
      if (parseInt(m) - 1 === month) {
        combined.push({
          id: `virtual-th-${year}-${idx}`,
          created_by: 'system',
          event_date: `${year}-${m}-${d}`,
          title: holiday.title,
          description: '',
          created_at: new Date().toISOString(),
          is_virtual: true,
          virtual_color: '#eab308' // Gold for Thai holidays
        });
      }
    });

    return combined;
  }, [events, currentDate]);

  const getDayEvents = (date: Date) => {
    const localDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return displayEvents.filter(e => e.event_date === localDateStr);
  };

  return (
    <section className="w-full">
      <h2 className="text-foreground font-bold px-4 pt-6 pb-3 text-lg flex items-center gap-2">Our Calendar <CalendarDays size={20} /></h2>
      
      <div className="mx-4 bg-netflix-card rounded-2xl p-4 shadow-xl border border-white/5">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => changeMonth(-1)}
            className="w-9 h-9 flex items-center justify-center bg-white/5 rounded-full text-foreground active:scale-90 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          
          <h3 className="text-foreground font-semibold">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>

          <button 
            onClick={() => changeMonth(1)}
            className="w-9 h-9 flex items-center justify-center bg-white/5 rounded-full text-foreground active:scale-90 transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-secondary-text text-[10px] font-bold uppercase mb-2">
              {day}
            </div>
          ))}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentDate.toISOString()}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="contents"
            >
              {daysInMonth.map((day, idx) => (
                <div 
                  key={day ? day.toISOString() : `empty-${idx}`}
                  className="aspect-square relative p-0.5"
                >
                  {day ? (() => {
                    const dayEvents = getDayEvents(day);
                    const hasUser1 = profiles[0] && dayEvents.some(e => e.created_by === profiles[0].id && !e.is_virtual);
                    const hasUser2 = profiles[1] && dayEvents.some(e => e.created_by === profiles[1].id && !e.is_virtual);
                    const virtualEvents = dayEvents.filter(e => e.is_virtual);
                    const isAnniversary = virtualEvents.some(e => e.virtual_type === 'anniversary');
                    const isBirthday = virtualEvents.some(e => e.virtual_type === 'birthday');
                    
                    const isDual = hasUser1 && hasUser2;
                    let singleColor = null;
                    if (hasUser1) singleColor = '#E50914';
                    else if (hasUser2) singleColor = '#3b82f6';
                    else if (virtualEvents.length > 0 && !isAnniversary) singleColor = virtualEvents[0].virtual_color;

                    return (
                      <div 
                        className={`w-full h-full ${isDual && !isAnniversary ? 'rounded-full p-[2.5px]' : ''}`}
                        style={isDual && !isAnniversary ? { background: 'linear-gradient(135deg, #E50914 50%, #3b82f6 50%)' } : {}}
                      >
                        <button
                          onClick={() => handleDayClick(day)}
                          className={`relative w-full h-full flex flex-col items-center justify-center transition-all active:scale-90 ${
                            !isAnniversary ? 'rounded-full' : ''
                          } ${
                            isToday(day) 
                              ? (isAnniversary ? '' : 'bg-netflix-red text-white shadow-lg') 
                              : (isDual && !isAnniversary ? 'bg-netflix-card text-foreground hover:brightness-110' : 'text-foreground hover:bg-white/10')
                          } ${day.getTime() < new Date().setHours(0,0,0,0) && !isToday(day) ? 'opacity-40' : ''}`}
                          style={
                            !isDual && singleColor && !isAnniversary
                              ? { border: `2.5px solid ${isToday(day) ? '#ffffff' : singleColor}` } 
                              : (isDual && isToday(day) && !isAnniversary ? { border: '2px solid #ffffff'} : {})
                          }
                        >
                          {isAnniversary && (
                            <Heart 
                              size={44} 
                              className={`absolute z-0 ${isToday(day) ? 'text-netflix-red fill-netflix-red drop-shadow-md' : 'text-[#ff69b4] fill-[#ff69b4]/20'}`}
                            />
                          )}
                          {isBirthday && (
                            <span className="absolute -top-1 -right-2 text-[14px] drop-shadow-md z-20 pointer-events-none" style={{ transform: 'rotate(10deg)' }}>🎂</span>
                          )}
                          <span className={`relative z-10 text-sm ${isToday(day) ? (isAnniversary ? 'font-black text-white drop-shadow-md' : 'font-black') : 'font-bold'}`}>
                            {day.getDate()}
                          </span>
                          
                          {/* Show count if multiple events */}
                          {dayEvents.length > 1 && (
                            <span 
                              className="absolute bottom-1 text-[8px] font-bold leading-none z-10"
                              style={{ color: isToday(day) ? '#ffffff' : (singleColor || '#ffffff') }}
                            >
                              {dayEvents.length}
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })() : null}
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>


      </div>

      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        date={selectedDate || new Date()}
        events={displayEvents}
        userId={userId}
        profiles={profiles}
        onEventAdded={(e) => setEvents([...events, e])}
        onEventDeleted={(id) => setEvents(events.filter(e => e.id !== id))}
      />
    </section>
  );
}

