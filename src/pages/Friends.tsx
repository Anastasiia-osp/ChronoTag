import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Search, UserPlus, MessageSquare, Check, X, Clock, UserMinus } from 'lucide-react';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

interface Profile {
  id: string;
  name: string | null;
  nickname: string;
  avatar_url: string | null;
}

interface FriendConnection {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'cancelled';
  created_at: string;
  profile: Profile;
}

interface SearchResult extends Profile {
  friendStatus?: {
    id: string;
    status: 'pending' | 'accepted' | 'cancelled';
  };
}

const Friends: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'sent'>('friends');
  const [friends, setFriends] = useState<FriendConnection[]>([]);
  const [requests, setRequests] = useState<FriendConnection[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendConnection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchFriends();
      fetchRequests();
      fetchSentRequests();
    }
  }, [user]);

  const fetchFriends = async () => {
    try {
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select(`
          *,
          profile:profiles!friends_friend_id_fkey(*)
        `)
        .eq('status', 'accepted')
        .eq('user_id', user?.id);

      if (friendsError) throw friendsError;

      const { data: friendOfData, error: friendOfError } = await supabase
        .from('friends')
        .select(`
          *,
          profile:profiles!friends_user_id_fkey(*)
        `)
        .eq('status', 'accepted')
        .eq('friend_id', user?.id);

      if (friendOfError) throw friendOfError;

      const transformedFriends = [
        ...friendsData.map(friend => ({
          ...friend,
          profile: friend.profile
        })),
        ...friendOfData.map(friend => ({
          ...friend,
          profile: friend.profile
        }))
      ];

      setFriends(transformedFriends);
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast.error('Error fetching friends');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          *,
          profile:profiles!friends_user_id_fkey(*)
        `)
        .eq('friend_id', user?.id)
        .eq('status', 'pending');

      if (error) throw error;
      
      const transformedRequests = data.map(request => ({
        ...request,
        profile: request.profile
      }));
      
      setRequests(transformedRequests);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      toast.error('Error fetching friend requests');
    }
  };

  const fetchSentRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          *,
          profile:profiles!friends_friend_id_fkey(*)
        `)
        .eq('user_id', user?.id)
        .eq('status', 'pending');

      if (error) throw error;

      const transformedRequests = data.map(request => ({
        ...request,
        profile: request.profile
      }));

      setSentRequests(transformedRequests);
    } catch (error) {
      console.error('Error fetching sent requests:', error);
      toast.error('Error fetching sent requests');
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // First, get all matching profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, nickname, avatar_url')
        .or(`name.ilike.%${query}%,nickname.ilike.%${query}%`)
        .neq('id', user?.id)
        .limit(10);

      if (profilesError) throw profilesError;

      if (!profiles) {
        setSearchResults([]);
        return;
      }

      // Then, get friend status for each profile
      const friendStatusPromises = profiles.map(async (profile) => {
        const { data: friendData } = await supabase
          .from('friends')
          .select('id, status')
          .or(`and(user_id.eq.${user?.id},friend_id.eq.${profile.id}),and(user_id.eq.${profile.id},friend_id.eq.${user?.id})`)
          .not('status', 'eq', 'cancelled')
          .maybeSingle();

        return {
          ...profile,
          friendStatus: friendData || undefined
        };
      });

      const resultsWithStatus = await Promise.all(friendStatusPromises);
      setSearchResults(resultsWithStatus);
    } catch (error) {
      toast.error('Error searching users');
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .insert({
          user_id: user?.id,
          friend_id: friendId,
          status: 'pending'
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Friend request already sent');
        } else {
          throw error;
        }
      } else {
        toast.success('Friend request sent');
        setSearchResults(prev => 
          prev.map(result => 
            result.id === friendId
              ? {
                  ...result,
                  friendStatus: {
                    id: 'temp',
                    status: 'pending'
                  }
                }
              : result
          )
        );
        fetchSentRequests();
      }
    } catch (error) {
      toast.error('Error sending friend request');
    }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Friend request accepted');
      fetchFriends();
      fetchRequests();
    } catch (error) {
      toast.error('Error accepting friend request');
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'cancelled' })
        .eq('id', requestId);

      if (error) throw error;

      setRequests(prev => prev.filter(request => request.id !== requestId));
      toast.success('Friend request rejected');
    } catch (error) {
      toast.error('Error rejecting friend request');
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'cancelled' })
        .eq('id', requestId);

      if (error) throw error;

      setSentRequests(prev => prev.filter(request => request.id !== requestId));
      toast.success('Friend request cancelled');
    } catch (error) {
      toast.error('Error cancelling friend request');
    }
  };

  const removeFriend = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendId);

      if (error) throw error;

      setFriends(prev => prev.filter(friend => friend.id !== friendId));
      setShowRemoveConfirm(null);
      toast.success('Friend removed successfully');
    } catch (error) {
      toast.error('Error removing friend');
    }
  };

  const startChat = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    navigate(`/messages/${userId}`);
  };

  const handleProfileClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd.MM.yyyy HH:mm');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between shadow-sm">
        <button
          onClick={() => navigate('/profile')}
          className="text-secondary hover:text-secondary-light transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-semibold text-secondary">Друзья</h1>
        <div className="w-6"></div>
      </div>

      {/* Search Bar */}
      <div className="p-4">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              searchUsers(e.target.value);
            }}
            placeholder="Поиск пользователей..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            spellCheck="true"
            lang="ru"
          />
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="mt-2 bg-white rounded-lg shadow-lg overflow-hidden">
            {isSearching ? (
              <div className="p-4 text-center text-gray-500">
                Поиск...
              </div>
            ) : searchResults.length > 0 ? (
              <div className="divide-y">
                {searchResults.map(user => (
                  <div 
                    key={user.id} 
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                    onClick={() => handleProfileClick(user.id)}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar_url || 'https://via.placeholder.com/40'}
                        alt={user.nickname}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="font-medium text-secondary">
                          {user.name || user.nickname}
                        </h3>
                        <p className="text-sm text-gray-500">@{user.nickname}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!user.friendStatus && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            sendFriendRequest(user.id);
                          }}
                          className="p-2 text-secondary hover:text-secondary-light transition-colors"
                          title="Отправить запрос в друзья"
                        >
                          <UserPlus size={20} />
                        </button>
                      )}
                      {user.friendStatus?.status === 'accepted' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startChat(e, user.id);
                          }}
                          className="p-2 text-secondary hover:text-secondary-light transition-colors"
                          title="Написать сообщение"
                        >
                          <MessageSquare size={20} />
                        </button>
                      )}
                      {user.friendStatus?.status === 'pending' && (
                        <div className="p-2 text-gray-400" title="Запрос отправлен">
                          <Clock size={20} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                Пользователи не найдены
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-4">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'friends'
                ? 'text-secondary border-b-2 border-secondary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Мои друзья
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 font-medium relative ${
              activeTab === 'requests'
                ? 'text-secondary border-b-2 border-secondary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Запросы в друзья
            {requests.length > 0 && (
              <span className="absolute top-0 right-0 -mt-1 -mr-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {requests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'sent'
                ? 'text-secondary border-b-2 border-secondary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Отправленные запросы
            {sentRequests.length > 0 && (
              <span className="absolute top-0 right-0 -mt-1 -mr-1 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                {sentRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-secondary animate-pulse">Loading...</div>
          </div>
        ) : activeTab === 'friends' ? (
          <div className="space-y-4">
            {friends.length > 0 ? (
              friends.map(friend => (
                <div 
                  key={friend.id} 
                  className="bg-white p-4 rounded-lg shadow-sm cursor-pointer hover:bg-gray-50"
                  onClick={() => handleProfileClick(friend.profile.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={friend.profile.avatar_url || 'https://via.placeholder.com/40'}
                        alt={friend.profile.nickname}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="font-medium text-secondary">
                          {friend.profile.name || friend.profile.nickname}
                        </h3>
                        <p className="text-sm text-gray-500">@{friend.profile.nickname}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowRemoveConfirm(friend.id);
                        }}
                        className="p-2 text-red-500 hover:text-red-600 transition-colors"
                        title="Удалить из друзей"
                      >
                        <UserMinus size={20} />
                      </button>
                      <button
                        onClick={(e) => startChat(e, friend.profile.id)}
                        className="p-2 text-secondary hover:text-secondary-light transition-colors"
                      >
                        <MessageSquare size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                У вас пока нет друзей
              </div>
            )}
          </div>
        ) : activeTab === 'requests' ? (
          <div className="space-y-4">
            {requests.length > 0 ? (
              requests.map(request => (
                <div 
                  key={request.id} 
                  className="bg-white p-4 rounded-lg shadow-sm cursor-pointer hover:bg-gray-50"
                  onClick={() => handleProfileClick(request.profile.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={request.profile.avatar_url || 'https://via.placeholder.com/40'}
                        alt={request.profile.nickname}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="font-medium text-secondary">
                          {request.profile.name || request.profile.nickname}
                        </h3>
                        <p className="text-sm text-gray-500">@{request.profile.nickname}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          acceptRequest(request.id);
                        }}
                        className="p-2 text-green-500 hover:text-green-600 transition-colors"
                        title="Принять"
                      >
                        <Check size={20} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          rejectRequest(request.id);
                        }}
                        className="p-2 text-red-500 hover:text-red-600 transition-colors"
                        title="Отклонить"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                Нет новых запросов в друзья
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {sentRequests.length > 0 ? (
              sentRequests.map(request => (
                <div 
                  key={request.id} 
                  className="bg-white p-4 rounded-lg shadow-sm cursor-pointer hover:bg-gray-50"
                  onClick={() => handleProfileClick(request.profile.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={request.profile.avatar_url || 'https://via.placeholder.com/40'}
                        alt={request.profile.nickname}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="font-medium text-secondary">
                          {request.profile.name || request.profile.nickname}
                        </h3>
                        <p className="text-sm text-gray-500">@{request.profile.nickname}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                          <Clock size={12} />
                          Отправлено {formatDate(request.created_at)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelRequest(request.id);
                      }}
                      className="p-2 text-red-500 hover:text-red-600 transition-colors"
                      title="Отменить запрос"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                Нет отправленных запросов
              </div>
            )}
          </div>
        )}
      </div>

      {/* Remove Friend Confirmation Modal */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-secondary mb-4">
              Удалить из друзей
            </h3>
            <p className="text-gray-600 mb-6">
              Вы уверены, что хотите удалить этого пользователя из друзей?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowRemoveConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => removeFriend(showRemoveConfirm)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Friends;