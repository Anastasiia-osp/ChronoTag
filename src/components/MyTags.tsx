import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { ArrowLeft, Globe, Lock, Trash2, Edit2, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import type { Tag } from '../lib/supabase';

interface MyTagsProps {
  onBack: () => void;
  onEdit: (tagId: string) => void;
}

const MyTags: React.FC<MyTagsProps> = ({ onBack, onEdit }) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'created_at' | 'activation_datetime'>('created_at');
  const [filterType, setFilterType] = useState<'all' | 'событие' | 'объявление' | 'планы'>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchTags();
  }, [sortBy, filterType]);

  const fetchTags = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id);

      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      const { data, error } = await query.order(sortBy, { ascending: false });

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      toast.error('Error fetching tags');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      setTags(tags.filter(tag => tag.id !== tagId));
      toast.success('Tag deleted successfully');
    } catch (error) {
      toast.error('Error deleting tag');
    } finally {
      setShowDeleteConfirm(null);
    }
  };

  const getTagTypeColor = (type: string) => {
    switch (type) {
      case 'событие':
        return 'bg-[#A8DADC]';
      case 'объявление':
        return 'bg-[#F09797]';
      case 'планы':
        return 'bg-[#B7E4C7]';
      default:
        return 'bg-gray-200';
    }
  };

  const formatDateTime = (date: string) => {
    return format(new Date(date), 'dd.MM.yyyy HH:mm');
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="bg-white px-4 py-3 flex items-center justify-between shadow-sm">
        <button
          onClick={onBack}
          className="text-secondary hover:text-secondary-light transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-semibold text-secondary">Мои метки</h1>
        <div className="w-6"></div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex gap-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'created_at' | 'activation_datetime')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="created_at">По дате создания</option>
            <option value="activation_datetime">По дате активации</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'событие' | 'объявление' | 'планы')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">Все типы</option>
            <option value="событие">События</option>
            <option value="объявление">Объявления</option>
            <option value="планы">Планы</option>
          </select>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-secondary animate-pulse">Loading tags...</div>
          </div>
        ) : (
          <div className="space-y-4">
            {tags.map(tag => (
              <div key={tag.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm ${getTagTypeColor(tag.type)}`}>
                        {tag.type}
                      </span>
                      {tag.visibility === 'публичная' ? (
                        <Globe size={18} className="text-secondary" title="Публичная метка" />
                      ) : tag.visibility === 'друзьям' ? (
                        <Users size={18} className="text-secondary" title="Только для друзей" />
                      ) : (
                        <Lock size={18} className="text-secondary" title="Личная метка" />
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-secondary mb-2">{tag.title}</h3>
                    
                    {tag.address && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Адрес:</span> {tag.address}
                      </p>
                    )}

                    {tag.activation_datetime && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Когда:</span> {formatDateTime(tag.activation_datetime)}
                      </p>
                    )}

                    {tag.time_range_start && tag.time_range_end && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Когда:</span> {formatDateTime(tag.time_range_start)} - {formatDateTime(tag.time_range_end)}
                      </p>
                    )}

                    <p className="text-xs text-gray-500 mt-2">
                      Создано: {formatDateTime(tag.created_at)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    
                    <button
                      onClick={() => onEdit(tag.id)}
                      className="p-2 text-secondary hover:text-secondary-light transition-colors"
                      title="Редактировать"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(tag.id)}
                      className="p-2 text-red-500 hover:text-red-600 transition-colors"
                      title="Удалить"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Delete Confirmation Dialog */}
                {showDeleteConfirm === tag.id && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                      <h3 className="text-lg font-semibold text-secondary mb-4">
                        Подтвердите удаление
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Вы уверены, что хотите удалить эту метку? Это действие нельзя отменить.
                      </p>
                      <div className="flex justify-end gap-4">
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={() => handleDelete(tag.id)}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {tags.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Нет доступных меток
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTags;