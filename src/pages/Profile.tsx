import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { ArrowLeft, Camera, Edit2, Save, Users, UserPlus, MessageSquare, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Profile {
  id: string;
  name: string | null;
  nickname: string;
  bio: string | null;
  links: { [key: string]: string } | null;
  avatar_url: string | null;
}

interface FriendStatus {
  id: string | null;
  status: 'none' | 'pending' | 'accepted';
  created_at: string | null;
}

const Profile: React.FC = () => {
  const { userId } = useParams<{ userId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>({
    id: null,
    status: 'none',
    created_at: null
  });
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    bio: '',
    links: { website: '' }
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const isOwnProfile = !userId || userId === user?.id;

  useEffect(() => {
    if (isOwnProfile) {
      if (user) {
        fetchProfile(user.id);
      }
    } else {
      fetchProfile(userId);
      checkFriendStatus();
    }
  }, [user, userId]);

  const fetchProfile = async (profileId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          if (isOwnProfile) {
            setIsEditing(true);
          } else {
            toast.error('Профиль не найден');
            navigate('/map');
          }
        } else {
          throw error;
        }
      }

      if (data) {
        setProfile(data);
        setFormData({
          name: data.name || '',
          nickname: data.nickname,
          bio: data.bio || '',
          links: { website: data.links?.website || '' }
        });
      }
    } catch (error) {
      toast.error('Ошибка при загрузке профиля');
    } finally {
      setIsLoading(false);
    }
  };

  const checkFriendStatus = async () => {
    if (!user || !userId) return;

    try {
      const { data, error } = await supabase
        .from('friends')
        .select('*')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`)
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setFriendStatus({
          id: data.id,
          status: data.status,
          created_at: data.created_at
        });
      } else {
        setFriendStatus({
          id: null,
          status: 'none',
          created_at: null
        });
      }
    } catch (error) {
      console.error('Error checking friend status:', error);
      setFriendStatus({
        id: null,
        status: 'none',
        created_at: null
      });
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;

    const fileExt = avatarFile.name.split('.').pop();
    const filePath = `${user.id}/${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile);

    if (uploadError) {
      toast.error('Ошибка при загрузке аватара');
      return null;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.nickname.trim()) {
      toast.error('Никнейм обязателен');
      return;
    }

    try {
      let avatarUrl = profile?.avatar_url;
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...formData,
          avatar_url: avatarUrl,
        });

      if (error) throw error;

      toast.success('Профиль успешно обновлен');
      setIsEditing(false);
      fetchProfile(user.id);
    } catch (error) {
      toast.error('Ошибка при обновлении профиля');
    }
  };

  const handleStartChat = () => {
    if (userId) {
      navigate(`/messages/${userId}`);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!user || !userId) return;

    try {
      const { error } = await supabase
        .from('friends')
        .insert({
          user_id: user.id,
          friend_id: userId,
          status: 'pending'
        });

      if (error) throw error;

      setFriendStatus({
        id: null,
        status: 'pending',
        created_at: new Date().toISOString()
      });
      toast.success('Запрос в друзья отправлен');
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error('Ошибка при отправке запроса в друзья');
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd.MM.yyyy HH:mm');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-secondary animate-pulse">Загрузка профиля...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between shadow-sm">
        <button
          onClick={() => navigate('/map')}
          className="text-secondary hover:text-secondary-light transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-semibold text-secondary">
          {isEditing ? 'Редактировать профиль' : isOwnProfile ? 'Мой профиль' : 'Профиль'}
        </h1>
        {isOwnProfile && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-secondary hover:text-secondary-light transition-colors"
          >
            <Edit2 size={24} />
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <img
                  src={avatarPreview || profile?.avatar_url || 'https://via.placeholder.com/150'}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover"
                />
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 bg-secondary text-white p-2 rounded-full cursor-pointer hover:bg-secondary-light transition-colors"
                >
                  <Camera size={20} />
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Имя
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  spellCheck="true"
                  lang="ru"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Никнейм <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  spellCheck="true"
                  lang="ru"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  О себе
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={4}
                  spellCheck="true"
                  lang="ru"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ссылка
                </label>
                <input
                  type="url"
                  value={formData.links.website}
                  onChange={(e) => setFormData({
                    ...formData,
                    links: { website: e.target.value }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Введите вашу ссылку"
                  spellCheck="false"
                  lang="en"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setAvatarPreview(null);
                  setAvatarFile(null);
                  if (profile) {
                    setFormData({
                      name: profile.name || '',
                      nickname: profile.nickname,
                      bio: profile.bio || '',
                      links: { website: profile.links?.website || '' }
                    });
                  }
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-light transition-colors flex items-center space-x-2"
              >
                <Save size={20} />
                <span>Сохранить</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <img
                src={profile?.avatar_url || 'https://via.placeholder.com/150'}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover"
              />
              <h2 className="mt-4 text-2xl font-semibold text-secondary">
                {profile?.name}
              </h2>
              <p className="text-gray-600">@{profile?.nickname}</p>
              
              {isOwnProfile ? (
                <button
                  onClick={() => navigate('/friends')}
                  className="mt-4 px-6 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-light transition-colors flex items-center gap-2"
                >
                  <Users size={20} />
                  <span>Друзья</span>
                </button>
              ) : (
                <div className="mt-4 flex gap-2">
                  {friendStatus.status === 'none' && (
                    <button
                      onClick={handleSendFriendRequest}
                      className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-light transition-colors flex items-center gap-2"
                    >
                      <UserPlus size={20} />
                      <span>Добавить в друзья</span>
                    </button>
                  )}
                  {friendStatus.status === 'pending' && (
                    <div className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg flex items-center gap-2">
                      <Clock size={20} />
                      <span>Запрос отправлен</span>
                    </div>
                  )}
                  {friendStatus.status === 'accepted' && (
                    <button
                      onClick={handleStartChat}
                      className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-light transition-colors flex items-center gap-2"
                    >
                      <MessageSquare size={20} />
                      <span>Написать сообщение</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {profile?.bio && (
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="text-lg font-medium text-secondary mb-2">О себе</h3>
                <p className="text-gray-700">{profile.bio}</p>
              </div>
            )}

            {profile?.links?.website && (
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="text-lg font-medium text-secondary mb-2">Ссылка</h3>
                <a
                  href={profile.links.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-primary hover:text-primary-dark transition-colors"
                >
                  {profile.links.website}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;