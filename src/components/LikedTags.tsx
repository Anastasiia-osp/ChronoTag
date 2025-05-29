import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Globe, Lock, Heart, ArrowLeft, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import type { Tag } from '../lib/supabase';

interface LikedTagsProps {
  onBack: () => void;
  onEdit: (tagId: string) => void;
}

interface Profile {
  id: string;
  name: string | null;
  nickname: string;
  avatar_url: string | null;
}

const LikedTags: React.FC<LikedTagsProps> = ({ onBack, onEdit }) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'created_at' | 'activation_datetime'>('created_at');
  const [filterType, setFilterType] = useState<'all' | 'событие' | 'объявление' | 'планы'>('all');
  const [userProfiles, setUserProfiles] = useState<{ [key: string]: Profile }>({});
  const { user } = useAuth();

  useEffect(() => {
    fetchLikedTags();
  }, [sortBy, filterType]);

  useEffect(() => {
    if (tags.length > 0) {
      fetchUserProfiles();
    }
  }, [tags]);

  const fetchLikedTags = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('likes')
        .select(`
          tag_id,
          tags (*)
        `)
        .eq('user_id', user.id);

      const { data, error } = await query;

      if (error) throw error;

      let likedTags = data.map(item => item.tags).filter(Boolean);

      // Apply type filter
      if (filterType !== 'all') {
        likedTags = likedTags.filter(tag => tag.type === filterType);
      }

      // Apply sorting
      likedTags.sort((a, b) => {
        const dateA = new Date(a[sortBy]);
        const dateB = new Date(b[sortBy]);
        return dateB.getTime() - dateA.getTime();
      });

      setTags(likedTags);
    } catch (error) {
      toast.error('Error fetching liked tags');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserProfiles = async () => {
    try {
      const userIds = [...new Set(tags.map(tag => tag.user_id))];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, nickname, avatar_url')
        .in('id', userIds);

      if (error) throw error;

      const profileMap = (data || []).reduce((acc, profile) => ({
        ...acc,
        [profile.id]: profile
      }), {});

      setUserProfiles(profileMap);
    } catch (error) {
      console.error('Error fetching user profiles:', error);
    }
  };

  const handleUnlike = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', user?.id)
        .eq('tag_id', tagId);

      if (error) throw error;

      setTags(tags.filter(tag => tag.id !== tagId));
      toast.success('Tag unliked successfully');
    } catch (error) {
      toast.error('Error unliking tag');
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
        <h1 className="text-xl font-semibold text-secondary">Понравившиеся метки</h1>
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
                    {userProfiles[tag.user_id] && (
                      <div className="flex items-center gap-2 mb-2">
                        <img
                          src={userProfiles[tag.user_id].avatar_url || 'https://via.placeholder.com/32'}
                          alt="Profile"
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <span className="font-medium text-secondary">
                          {userProfiles[tag.user_id].name || userProfiles[tag.user_id].nickname}
                        </span>
                      </div>
                    )}
                    
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

                  <button
                    onClick={() => handleUnlike(tag.id)}
                    className="p-2 text-[#E63946] hover:text-red-600 transition-colors"
                    title="Убрать из понравившихся"
                  >
                    <Heart size={20} fill="#E63946" />
                  </button>
                </div>
              </div>
            ))}

            {tags.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Нет понравившихся меток
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LikedTags;