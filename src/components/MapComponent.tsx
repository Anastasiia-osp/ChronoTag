import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Tag } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Clock, PlusCircle, LogOut, Filter, UserCircle, MessageSquare, Send, Search, Calendar, Eye, Hash, X, Heart, Globe, Lock, Users, CheckSquare, Square } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { toast } from 'react-toastify';

// Fix for default marker icon in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;

// Custom marker icons for different tag types
const eventIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const announcementIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const planIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface LocationFinderProps {
  setCenter: (center: [number, number]) => void;
}

interface MapComponentProps {
  tags: Tag[];
  showMyTagsOnly: boolean;
  toggleFilter: () => void;
  onFilterChange: (filters: FilterState) => void;
}

interface UserProfile {
  id: string;
  name: string | null;
  nickname: string;
  avatar_url: string | null;
}

interface FilterState {
  search: string;
  type: string;
  visibility: string;
  selectedFriends: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  showFavorites: boolean;
}

interface Friend {
  id: string;
  profile: {
    id: string;
    name: string | null;
    nickname: string;
    avatar_url: string | null;
  };
}

interface TagWithLikes extends Tag {
  isLiked?: boolean;
  likesCount?: number;
}

interface HoverCardProps {
  tag: TagWithLikes;
  userProfile: UserProfile | undefined;
  position: L.LatLng;
  onClose: () => void;
  onLike: () => void;
  onMessage: () => void;
  isAuthor: boolean;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

const LocationFinder: React.FC<LocationFinderProps> = ({ setCenter }) => {
  const map = useMap();
  
  useEffect(() => {
    map.locate({
      setView: true,
      maxZoom: 16
    });
    
    const handleLocationFound = (e: L.LocationEvent) => {
      const { lat, lng } = e.latlng;
      setCenter([lat, lng]);
      map.setView([lat, lng], 16);
    };
    
    const handleLocationError = () => {
      console.log('Location access denied or unavailable');
      // Default coordinates (Moscow)
      const defaultLocation: [number, number] = [55.7558, 37.6173];
      setCenter(defaultLocation);
      map.setView(defaultLocation, 10);
    };
    
    map.on('locationfound', handleLocationFound);
    map.on('locationerror', handleLocationError);
    
    return () => {
      map.off('locationfound', handleLocationFound);
      map.off('locationerror', handleLocationError);
    };
  }, [map, setCenter]);
  
  return null;
};

const HoverCard: React.FC<HoverCardProps> = ({ 
  tag, 
  userProfile, 
  position, 
  onClose, 
  onLike,
  onMessage,
  isAuthor 
}) => {
  const map = useMap();
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout>();
  const cardRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) {
      const point = map.latLngToContainerPoint(position);
      const card = cardRef.current;
      
      // Position the card above the marker
      card.style.left = `${point.x - card.offsetWidth / 2}px`;
      card.style.top = `${point.y - card.offsetHeight - 45}px`; // 45px above the marker
    }
  }, [position, map]);

  const handleMouseEnter = () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(onClose, 300);
    setHideTimeout(timeout);
  };

  return (
    <div
      ref={cardRef}
      className="absolute z-[1000] bg-white rounded-lg shadow-lg p-3 min-w-[250px]"
      style={{ transform: 'translate3d(0, 0, 0)' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <img
            src={userProfile?.avatar_url || 'https://via.placeholder.com/32'}
            alt="Profile"
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="font-medium text-secondary">
            {userProfile?.name || userProfile?.nickname}
          </span>
        </div>
        {!isAuthor && (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLike();
              }}
              className={`text-${tag.isLiked ? '[#E63946]' : '[#1D3557]'} hover:opacity-80 transition-opacity`}
            >
              <Heart size={20} fill={tag.isLiked ? '#E63946' : 'none'} />
            </button>
            {tag.visibility === 'публичная' ? (
              <Globe size={20} className="text-secondary" />
            ) : tag.visibility === 'друзьям' ? (
              <Users size={20} className="text-secondary" />
            ) : (
              <Lock size={20} className="text-secondary" />
            )}
          </div>
        )}
      </div>
      <h3 className="mt-2 font-bold text-secondary truncate">{tag.title}</h3>
    </div>
  );
};

const defaultFilters: FilterState = {
  search: '',
  type: '',
  visibility: 'all',
  selectedFriends: [],
  dateRange: {
    start: null,
    end: null
  },
  showFavorites: false
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

const MapComponent: React.FC<MapComponentProps> = ({ tags, showMyTagsOnly, toggleFilter, onFilterChange }) => {
  const [center, setCenter] = useState<[number, number]>([55.7558, 37.6173]);
  const [showFilters, setShowFilters] = useState(false);
  const [userProfiles, setUserProfiles] = useState<{ [key: string]: UserProfile }>({});
  const [tagsWithLikes, setTagsWithLikes] = useState<TagWithLikes[]>([]);
  const [hoveredTag, setHoveredTag] = useState<TagWithLikes | null>(null);
  const [hoveredPosition, setHoveredPosition] = useState<L.LatLng | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout>();
  const mapRef = useRef<L.Map | null>(null);
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  
  const [tempFilters, setTempFilters] = useState<FilterState>(defaultFilters);

  const fitMapToBounds = () => {
    if (!mapRef.current || tags.length === 0) return;

    const bounds = new L.LatLngBounds(
      tags.map(tag => [tag.latitude, tag.longitude])
    );

    mapRef.current.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 16,
      animate: true
    });
  };

  useEffect(() => {
    fitMapToBounds();
  }, [tags]);

  useEffect(() => {
    const fetchFriends = async () => {
      if (!user) return;

      try {
        const { data: friendsData, error: friendsError } = await supabase
          .from('friends')
          .select(`
            id,
            profile:profiles!friends_friend_id_fkey(
              id,
              name,
              nickname,
              avatar_url
            )
          `)
          .eq('status', 'accepted')
          .eq('user_id', user.id);

        if (friendsError) throw friendsError;

        const { data: friendOfData, error: friendOfError } = await supabase
          .from('friends')
          .select(`
            id,
            profile:profiles!friends_user_id_fkey(
              id,
              name,
              nickname,
              avatar_url
            )
          `)
          .eq('status', 'accepted')
          .eq('friend_id', user.id);

        if (friendOfError) throw friendOfError;

        const allFriends = [...(friendsData || []), ...(friendOfData || [])];
        setFriends(allFriends);
      } catch (error) {
        console.error('Error fetching friends:', error);
        toast.error('Ошибка при загрузке списка друзей');
      }
    };

    fetchFriends();
  }, [user]);

  useEffect(() => {
    const fetchLikesInfo = async () => {
      if (!user) {
        setTagsWithLikes(tags.map(tag => ({ ...tag, isLiked: false, likesCount: 0 })));
        return;
      }

      try {
        const { error: connectionError } = await supabase.from('likes').select('count').limit(1);
        if (connectionError) {
          throw new Error(`Connection error: ${connectionError.message}`);
        }

        const { data: userLikes, error: likesError } = await supabase
          .from('likes')
          .select('tag_id')
          .eq('user_id', user.id);

        if (likesError) {
          throw new Error(`Error fetching likes: ${likesError.message}`);
        }

        const likesCountPromises = tags.map(async (tag) => {
          const { count, error: countError } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('tag_id', tag.id);

          if (countError) {
            throw new Error(`Error fetching likes count: ${countError.message}`);
          }

          return { tagId: tag.id, count };
        });

        const likesCount = await Promise.all(likesCountPromises);
        const likedTagIds = new Set(userLikes?.map(like => like.tag_id) || []);

        setTagsWithLikes(tags.map(tag => ({
          ...tag,
          isLiked: likedTagIds.has(tag.id),
          likesCount: likesCount.find(c => c.tagId === tag.id)?.count || 0
        })));
      } catch (error) {
        console.error('Error in fetchLikesInfo:', error);
        toast.error('Ошибка при загрузке информации о лайках. Пожалуйста, проверьте подключение к интернету.');
        
        setTagsWithLikes(tags.map(tag => ({
          ...tag,
          isLiked: false,
          likesCount: 0
        })));
      }
    };

    fetchLikesInfo();
  }, [tags, user]);

  useEffect(() => {
    const fetchUserProfiles = async () => {
      try {
        const userIds = [...new Set(tags.map(tag => tag.user_id))];
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, nickname, avatar_url')
          .in('id', userIds);

        if (error) {
          throw new Error(`Error fetching profiles: ${error.message}`);
        }

        const profileMap = (data || []).reduce((acc, profile) => ({
          ...acc,
          [profile.id]: profile
        }), {});

        setUserProfiles(profileMap);
      } catch (error) {
        console.error('Error in fetchUserProfiles:', error);
        toast.error('Ошибка при загрузке профилей пользователей');
      }
    };

    fetchUserProfiles();
  }, [tags]);

  const handleLikeToggle = async (tagId: string, currentLikeState: boolean) => {
    if (!user) {
      toast.info('Войдите, чтобы поставить лайк');
      return;
    }

    try {
      if (currentLikeState) {
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('tag_id', tagId);
      } else {
        await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            tag_id: tagId
          });
      }

      setTagsWithLikes(prevTags =>
        prevTags.map(tag =>
          tag.id === tagId
            ? {
                ...tag,
                isLiked: !currentLikeState,
                likesCount: (tag.likesCount || 0) + (currentLikeState ? -1 : 1)
              }
            : tag
        )
      );
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Error updating like');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const renderMessageWithLinks = (message: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = message.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a 
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-primary hover:text-primary-dark underline"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const getMarkerIcon = (tag: Tag) => {
    switch (tag.type) {
      case 'событие':
        return eventIcon;
      case 'объявление':
        return announcementIcon;
      case 'планы':
        return planIcon;
      default:
        return eventIcon;
    }
  };

  const handleStartChat = async (userId: string) => {
    navigate(`/messages/${userId}`);
  };

  const handleProfileClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const searchAddress = async (query: string) => {
    if (!query || query.startsWith('#')) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
        {
          headers: {
            'User-Agent': 'ChronoTag/1.0'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch address suggestions');
      }
      
      const data: SearchResult[] = await response.json();
      setSearchResults(data.slice(0, 5));
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setSearchResults([]);
    }
  };

  const handleSearchChange = (value: string) => {
    handleTempFilterChange({ search: value });
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (value && !value.startsWith('#')) {
      const timeout = setTimeout(() => {
        searchAddress(value);
      }, 300);
      setSearchTimeout(timeout);
    } else {
      setSearchResults([]);
    }
  };

  const handleAddressSelect = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lon], 16);
    }
    
    setSearchResults([]);
    setShowFilters(false);
    handleTempFilterChange({ search: result.display_name });
  };

  const handleTempFilterChange = (newFilters: Partial<FilterState>) => {
    setTempFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilter = (filterName: keyof FilterState) => {
    if (filterName === 'dateRange') {
      setTempFilters(prev => ({
        ...prev,
        dateRange: { start: null, end: null }
      }));
    } else {
      setTempFilters(prev => ({
        ...prev,
        [filterName]: defaultFilters[filterName]
      }));
    }
    setSearchResults([]);
  };

  const applyFilters = () => {
    onFilterChange(tempFilters);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setTempFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const toggleFilterPanel = () => {
    setShowFilters(!showFilters);
    if (showFilters) {
      setTempFilters(defaultFilters);
    }
  };

  const handleSelectAllFriends = () => {
    const filteredFriends = friends
      .filter(friend => 
        (friend.profile.name?.toLowerCase().includes(friendSearch.toLowerCase()) ||
        friend.profile.nickname.toLowerCase().includes(friendSearch.toLowerCase()))
      )
      .map(friend => friend.profile.id);
    
    setTempFilters(prev => ({
      ...prev,
      selectedFriends: filteredFriends
    }));
  };

  const handleClearFriendSelection = () => {
    setTempFilters(prev => ({
      ...prev,
      selectedFriends: []
    }));
  };

  const toggleFriendSelection = (friendId: string) => {
    setTempFilters(prev => ({
      ...prev,
      selectedFriends: prev.selectedFriends.includes(friendId)
        ? prev.selectedFriends.filter(id => id !== friendId)
        : [...prev.selectedFriends, friendId]
    }));
  };

  const filteredFriends = friends.filter(friend =>
    friend.profile.name?.toLowerCase().includes(friendSearch.toLowerCase()) ||
    friend.profile.nickname.toLowerCase().includes(friendSearch.toLowerCase())
  );

  return (
    <div className="h-screen w-full relative">
      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationFinder setCenter={setCenter} />
        
        {tagsWithLikes.map(tag => (
          <Marker 
            key={tag.id} 
            position={[tag.latitude, tag.longitude]}
            icon={getMarkerIcon(tag)}
            eventHandlers={{
              mouseover: (e) => {
                setHoveredTag(tag);
                setHoveredPosition(e.target.getLatLng());
              },
              mouseout: () => {
                setHoveredTag(null);
                setHoveredPosition(null);
              },
              popupopen: () => {
                setHoveredTag(null);
                setHoveredPosition(null);
              }
            }}
          >
            <Popup>
              <div className="p-2">
                {userProfiles[tag.user_id] && (
                  <div 
                    className="flex items-center gap-2 mb-2 cursor-pointer"
                    onClick={() => handleProfileClick(tag.user_id)}
                  >
                    <img
                      src={userProfiles[tag.user_id].avatar_url || 'https://via.placeholder.com/32'}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span className="text-sm font-medium text-secondary">
                      {userProfiles[tag.user_id].name || userProfiles[tag.user_id].nickname}
                    </span>
                    {tag.user_id !== user?.id && (
                      <div className="flex gap-2 ml-auto">
                        {user && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLikeToggle(tag.id, tag.isLiked || false);
                            }}
                            className={`text-${tag.isLiked ? '[#E63946]' : '[#1D3557]'} hover:opacity-80 transition-opacity`}
                          >
                            <Heart size={20} fill={tag.isLiked ? '#E63946' : 'none'} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartChat(tag.user_id);
                          }}
                          className="text-primary hover:text-primary-dark transition-colors"
                          title="Написать сообщение"
                        >
                          <Send size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${getTagTypeColor(tag.type)}`}>
                    {tag.type}
                  </span>
                  {tag.visibility === 'публичная' ? (
                    <Globe size={18} className="text-secondary" />
                  ) : tag.visibility === 'друзьям' ? (
                    <Users size={18} className="text-secondary" />
                  ) : (
                    <Lock size={18} className="text-secondary" />
                  )}
                </div>
                
                <h3 className="text-xl font-bold text-secondary mb-2">{tag.title}</h3>
                <p className="text-gray-700">{renderMessageWithLinks(tag.message)}</p>
                
                {tag.activation_datetime && (
                  <p className="text-xs text-gray-500 mt-2">
                    <span className="font-medium">Когда:</span> {formatDate(tag.activation_datetime)}
                  </p>
                )}
                
                {tag.time_range_start && tag.time_range_end && (
                  <div className="text-xs text-gray-500 mt-2">
                    <p><span className="font-medium">Начало:</span> {formatDate(tag.time_range_start)}</p>
                    <p><span className="font-medium">Конец:</span> {formatDate(tag.time_range_end)}</p>
                  </div>
                )}

                {/* Hashtags section */}
                {tag.hashtags && tag.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200">
                    {tag.hashtags.map((hashtag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-dark cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTempFilterChange({ search: `#${hashtag}` });
                          setShowFilters(true);
                        }}
                      >
                        <Hash size={14} />
                        {hashtag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {hoveredTag && hoveredPosition && (
          <HoverCard
            tag={hoveredTag}
            userProfile={userProfiles[hoveredTag.user_id]}
            position={hoveredPosition}
            onClose={() => {
              setHoveredTag(null);
              setHoveredPosition(null);
            }}
            onLike={() => handleLikeToggle(hoveredTag.id, hoveredTag.isLiked || false)}
            onMessage={() => handleStartChat(hoveredTag.user_id)}
            isAuthor={hoveredTag.user_id === user?.id}
          />
        )}
      </MapContainer>
      
      {/* Header */}
      <div className="absolute top-4 left-0 right-0 flex justify-center z-[1000]">
        <div className="bg-white py-2 px-4 rounded-lg shadow-md flex items-center space-x-2">
          <Clock size={20} className="text-secondary" />
          <h1 className="text-xl font-semibold text-secondary">ChronoTag</h1>
        </div>
      </div>

      {/* Filter Panel */}
      <div className={`absolute top-0 left-0 right-0 z-[999] transition-transform duration-300 ${
        showFilters ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="bg-[#F1FAFF] m-4 p-4 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-secondary flex items-center gap-2">
              <Filter size={20} />
              Фильтры
            </h2>
            <button
              onClick={toggleFilterPanel}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Search with Autocomplete */}
            <div className="relative">
              <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={tempFilters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Поиск по заголовку, описанию или адресу..."
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {tempFilters.search && (
                <button
                  onClick={() => {
                    clearFilter('search');
                    setSearchResults([]);
                  }}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              )}

              {/* Address Suggestions */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-lg overflow-hidden z-50">
                  {searchResults.map((result) => (
                    <button
                      key={result.place_id}
                      onClick={() => handleAddressSelect(result)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                    >
                      <p className="text-sm text-gray-700 truncate">
                        {result.display_name}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Favorites Filter */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Heart size={16} />
                Избранные метки
              </label>
              <button
                onClick={() => handleTempFilterChange({ showFavorites: !tempFilters.showFavorites })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                  tempFilters.showFavorites ?'bg-secondary' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    tempFilters.showFavorites ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Type */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Filter size={16} />
                  Тип метки
                </label>
                {tempFilters.type && (
                  <button
                    onClick={() => clearFilter('type')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <select
                value={tempFilters.type}
                onChange={(e) => handleTempFilterChange({ type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Все типы</option>
                <option value="объявление">Объявление</option>
                <option value="событие">Событие</option>
                <option value="планы">Планы</option>
              </select>
            </div>

            {/* Visibility */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Eye size={16} />
                  Видимость
                </label>
                {tempFilters.visibility !== 'all' && (
                  <button
                    onClick={() => clearFilter('visibility')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <select
                value={tempFilters.visibility}
                onChange={(e) => {
                  const newVisibility = e.target.value;
                  handleTempFilterChange({ 
                    visibility: newVisibility,
                    selectedFriends: newVisibility !== 'друзьям' ? [] : tempFilters.selectedFriends 
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">Все</option>
                <option value="публичная">Публичные</option>
                <option value="личная">Личные</option>
                <option value="друзьям">Только друзьям</option>
              </select>
            </div>

            {/* Friends Filter */}
            {tempFilters.visibility === 'друзьям' && (
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Users size={16} />
                    Друзья
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSelectAllFriends}
                      className="text-xs text-secondary hover:text-secondary-light"
                    >
                      Выбрать всех
                    </button>
                    <button
                      onClick={handleClearFriendSelection}
                      className="text-xs text-secondary hover:text-secondary-light"
                    >
                      Сбросить выбор
                    </button>
                  </div>
                </div>

                <div className="relative mb-2">
                  <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={friendSearch}
                    onChange={(e) => setFriendSearch(e.target.value)}
                    placeholder="Поиск друзей..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2">
                  {filteredFriends.length > 0 ? (
                    filteredFriends.map(friend => (
                      <div
                        key={friend.profile.id}
                        onClick={() => toggleFriendSelection(friend.profile.id)}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors"
                      >
                        <div className="flex-shrink-0">
                          {tempFilters.selectedFriends.includes(friend.profile.id) ? (
                            <CheckSquare size={20} className="text-secondary" />
                          ) : (
                            <Square size={20} className="text-gray-400" />
                          )}
                        </div>
                        <img
                          src={friend.profile.avatar_url || 'https://via.placeholder.com/32'}
                          alt={friend.profile.nickname}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <div className="font-medium text-secondary">
                            {friend.profile.name || friend.profile.nickname}
                          </div>
                          <div className="text-xs text-gray-500">
                            @{friend.profile.nickname}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      {friends.length === 0 ? 'У вас пока нет друзей' : 'Нет результатов поиска'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Date Range */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Calendar size={16} />
                  Временной диапазон
                </label>
                {(tempFilters.dateRange.start || tempFilters.dateRange.end) && (
                  <button
                    onClick={() => clearFilter('dateRange')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <DatePicker
                  selected={tempFilters.dateRange.start}
                  onChange={(date) => handleTempFilterChange({
                    dateRange: { ...tempFilters.dateRange, start: date }
                  })}
                  selectsStart
                  startDate={tempFilters.dateRange.start}
                  endDate={tempFilters.dateRange.end}
                  placeholderText="Начало"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <DatePicker
                  selected={tempFilters.dateRange.end}
                  onChange={(date) => handleTempFilterChange({
                    dateRange: { ...tempFilters.dateRange, end: date }
                  })}
                  selectsEnd
                  startDate={tempFilters.dateRange.start}
                  endDate={tempFilters.dateRange.end}
                  minDate={tempFilters.dateRange.start}
                  placeholderText="Конец"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={resetFilters}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Сбросить
              </button>
              <button
                onClick={applyFilters}
                className="flex-1 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-light transition-colors"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Profile and Messages Buttons */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col space-y-2">
        <button 
          onClick={() => navigate('/profile')}
          className="bg-white text-secondary p-3 rounded-full shadow-lg hover:bg-gray-100 transition-colors duration-200"
          aria-label="Profile"
        >
          <UserCircle size={24} />
        </button>
        <button 
          onClick={() => navigate('/messages')}
          className="bg-white text-secondary p-3 rounded-full shadow-lg hover:bg-gray-100 transition-colors duration-200"
          aria-label="Messages"
        >
          <MessageSquare size={24} />
        </button>
      </div>
      
      {/* Controls */}
      <div className="absolute bottom-6 right-4 z-[1000] flex flex-col space-y-3">
        <button 
          onClick={() => navigate('/add-tag')}
          className="bg-secondary text-white p-3 rounded-full shadow-lg hover:bg-secondary-light transition-colors duration-200"
          aria-label="Add tag"
        >
          <PlusCircle size={24} />
        </button>
        
        <button 
          onClick={toggleFilterPanel}
          className={`p-3 rounded-full shadow-lg transition-colors duration-200 ${
            showFilters 
              ? 'bg-primary text-secondary hover:bg-primary-dark' 
              : 'bg-white text-secondary hover:bg-gray-100'
          }`}
          aria-label="Filter tags"
        >
          <Filter size={24} />
        </button>
        
        <button 
          onClick={signOut}
          className="bg-white text-secondary p-3 rounded-full shadow-lg hover:bg-gray-100 transition-colors duration-200"
          aria-label="Sign out"
        >
          <LogOut size={24} />
        </button>
      </div>
    </div>
  );
};

export default MapComponent;