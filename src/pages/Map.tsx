import React, { useState, useEffect } from 'react';
import MapComponent from '../components/MapComponent';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import type { Tag } from '../lib/supabase';
import type { FilterState } from '../components/MapComponent';

const Map: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [showMyTagsOnly, setShowMyTagsOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchTags();
  }, [showMyTagsOnly, user]);

  const fetchTags = async (filters?: FilterState) => {
    setIsLoading(true);
    
    try {
      let query = supabase
        .from('tags')
        .select(`
          *,
          hashtags:hashtag(hashtag)
        `);
      
      if (showMyTagsOnly) {
        query = query.eq('user_id', user?.id);
      }

      if (filters) {
        // Handle favorites filter
        if (filters.showFavorites && user) {
          const { data: likedTags } = await supabase
            .from('likes')
            .select('tag_id')
            .eq('user_id', user.id);
          
          if (likedTags && likedTags.length > 0) {
            query = query
              .in('id', likedTags.map(like => like.tag_id))
              .neq('user_id', user.id); // Exclude user's own tags
          } else {
            setTags([]);
            setIsLoading(false);
            return;
          }
        }

        // Handle search filter
        if (filters.search) {
          if (filters.search.startsWith('#')) {
            // Search by hashtag
            const hashtag = filters.search.slice(1).toLowerCase();
            const { data: hashtagData } = await supabase
              .from('hashtag')
              .select('tag_id')
              .ilike('hashtag', hashtag);

            if (hashtagData && hashtagData.length > 0) {
              query = query.in('id', hashtagData.map(h => h.tag_id));
            } else {
              setTags([]);
              setIsLoading(false);
              return;
            }
          } else {
            // Search by title or message
            query = query.or(`title.ilike.%${filters.search}%,message.ilike.%${filters.search}%`);
          }
        }

        // Handle type filter
        if (filters.type) {
          query = query.eq('type', filters.type);
        }

        // Handle visibility filter
        if (filters.visibility !== 'all') {
          query = query.eq('visibility', filters.visibility);

          // Handle friends filter for 'друзьям' visibility
          if (filters.visibility === 'друзьям' && filters.selectedFriends.length > 0) {
            query = query.in('user_id', filters.selectedFriends);
          }
        }

        // Handle date range filter
        if (filters.dateRange.start || filters.dateRange.end) {
          if (filters.dateRange.start) {
            query = query.gte('activation_datetime', filters.dateRange.start.toISOString());
          }
          if (filters.dateRange.end) {
            query = query.lte('activation_datetime', filters.dateRange.end.toISOString());
          }
        }
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Supabase error:', error);
        throw new Error('Failed to fetch tags');
      }

      if (!data) {
        console.warn('No data returned from Supabase');
        setTags([]);
        return;
      }

      const transformedTags = data.map(tag => ({
        ...tag,
        hashtags: tag.hashtags?.map(h => h.hashtag) || []
      }));

      setTags(transformedTags);

      if (transformedTags.length === 0 && filters?.search && !filters.search.startsWith('#')) {
        toast.info('По заданным параметрам метки не найдены');
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast.error('Ошибка при загрузке меток. Пожалуйста, попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFilter = () => {
    setShowMyTagsOnly(!showMyTagsOnly);
  };

  return (
    <MapComponent
      tags={tags}
      showMyTagsOnly={showMyTagsOnly}
      toggleFilter={toggleFilter}
      onFilterChange={fetchTags}
    />
  );
};

export default Map;