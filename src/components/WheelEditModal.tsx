'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { WheelItem } from '@/types/database';
import BottomSheet from './BottomSheet';

interface WheelEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: WheelItem[];
  onUpdate: () => void;
}

export default function WheelEditModal({ isOpen, onClose, items, onUpdate }: WheelEditModalProps) {
  const [newItemName, setNewItemName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const supabase = createClient();

  const handleAddItem = async () => {
    if (!newItemName.trim() || items.length >= 12) return;
    setIsAdding(true);
    const { error } = await supabase
      .from('wheel_items')
      .insert([{ name: newItemName, is_active: true }]);
    
    if (!error) {
      setNewItemName('');
      onUpdate();
    }
    setIsAdding(false);
  };

  const handleToggleActive = async (item: WheelItem) => {
    const { error } = await supabase
      .from('wheel_items')
      .update({ is_active: !item.is_active })
      .eq('id', item.id);
    if (!error) onUpdate();
  };

  const handleDeleteItem = async (id: string) => {
    const { error } = await supabase.from('wheel_items').delete().eq('id', id);
    if (!error) {
      onUpdate();
      setConfirmDeleteId(null);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Manage Food Choices">
      <div className="space-y-6">
        {/* Item List */}
        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 hide-scrollbar">
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggleActive(item)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    item.is_active ? 'bg-netflix-red border-netflix-red' : 'border-white/20'
                  }`}
                >
                  {item.is_active && <Check size={14} className="text-foreground" />}
                </button>
                <span className={`text-sm font-medium ${item.is_active ? 'text-foreground' : 'text-secondary-text line-through'}`}>
                  {item.name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {confirmDeleteId === item.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => handleDeleteItem(item.id)} className="bg-netflix-red p-1.5 rounded-lg text-white">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)} className="bg-white/10 p-1.5 rounded-lg text-foreground">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDeleteId(item.id)} className="p-2 text-secondary-text hover:text-red-500">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-center text-secondary-text text-sm italic py-4">No choices added yet.</p>
          )}
        </div>

        {/* Add Form */}
        {items.length < 12 ? (
          <div className="pt-6 border-t border-white/5 space-y-4">
            <h4 className="text-foreground text-sm font-bold flex items-center gap-2">
              <Plus size={16} className="text-netflix-red" /> Add New Choice
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Sushi"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-foreground outline-none focus:border-netflix-red"
              />
              <button
                onClick={handleAddItem}
                disabled={isAdding || !newItemName.trim()}
                className="bg-netflix-red text-white px-6 rounded-xl font-bold active:scale-95 disabled:opacity-50"
              >
                {isAdding ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Add'}
              </button>
            </div>
            <p className="text-[10px] text-secondary-text text-right">{items.length}/12 items</p>
          </div>
        ) : (
          <div className="p-4 bg-netflix-red/10 border border-netflix-red/20 rounded-xl text-center">
            <p className="text-netflix-red text-xs font-medium">Max 12 items reached. Delete some to add more.</p>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
