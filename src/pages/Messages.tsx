import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { ArrowLeft, Send, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface ChatPartner {
  id: string;
  nickname: string;
  name: string | null;
  avatar_url: string | null;
  lastMessage: Message;
}

const Messages: React.FC = () => {
  const { userId } = useParams<{ userId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chatPartners, setChatPartners] = useState<ChatPartner[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentPartner, setCurrentPartner] = useState<ChatPartner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChatPartners();
    if (userId) {
      fetchMessages(userId);
      fetchPartnerProfile(userId);
    }
  }, [userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatPartners = async () => {
    try {
      const { data: sentMessages, error: sentError } = await supabase
        .from('messages')
        .select(`
          *,
          receiver:profiles!messages_receiver_id_fkey (
            id,
            nickname,
            name,
            avatar_url
          )
        `)
        .eq('sender_id', user?.id)
        .order('created_at', { ascending: false });

      const { data: receivedMessages, error: receivedError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            id,
            nickname,
            name,
            avatar_url
          )
        `)
        .eq('receiver_id', user?.id)
        .order('created_at', { ascending: false });

      if (sentError || receivedError) throw sentError || receivedError;

      const partners = new Map<string, ChatPartner>();

      sentMessages?.forEach((msg: any) => {
        if (!partners.has(msg.receiver_id)) {
          partners.set(msg.receiver_id, {
            id: msg.receiver_id,
            nickname: msg.receiver.nickname,
            name: msg.receiver.name,
            avatar_url: msg.receiver.avatar_url,
            lastMessage: msg
          });
        }
      });

      receivedMessages?.forEach((msg: any) => {
        if (!partners.has(msg.sender_id)) {
          partners.set(msg.sender_id, {
            id: msg.sender_id,
            nickname: msg.sender.nickname,
            name: msg.sender.name,
            avatar_url: msg.sender.avatar_url,
            lastMessage: msg
          });
        }
      });

      setChatPartners(Array.from(partners.values()));
    } catch (error) {
      toast.error('Ошибка при загрузке чатов');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (partnerId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user?.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      const unreadMessages = data?.filter(msg => 
        msg.receiver_id === user?.id && !msg.read_at
      );

      if (unreadMessages?.length) {
        await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadMessages.map(msg => msg.id));
      }
    } catch (error) {
      toast.error('Ошибка при загрузке сообщений');
    }
  };

  const fetchPartnerProfile = async (partnerId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', partnerId)
        .single();

      if (error) throw error;
      if (data) {
        setCurrentPartner({
          id: data.id,
          nickname: data.nickname,
          name: data.name,
          avatar_url: data.avatar_url,
          lastMessage: messages[messages.length - 1]
        });
      }
    } catch (error) {
      toast.error('Ошибка при загрузке профиля');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user?.id,
          receiver_id: userId,
          content: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage('');
      fetchMessages(userId);
      fetchChatPartners();
    } catch (error) {
      toast.error('Ошибка при отправке сообщения');
    }
  };

  const formatMessageTime = (timestamp: string) => {
    return format(new Date(timestamp), 'HH:mm');
  };

  const handleProfileClick = (profileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/profile/${profileId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-secondary animate-pulse">Загрузка сообщений...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Chat List Sidebar */}
      <div className={`w-full md:w-80 bg-white border-r ${userId ? 'hidden md:block' : 'block'}`}>
        <div className="p-4 border-b flex items-center gap-4">
          <button
            onClick={() => navigate('/map')}
            className="text-secondary hover:text-secondary-light transition-colors"
            aria-label="Back to map"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-semibold text-secondary flex items-center gap-2">
            <MessageSquare size={24} />
            Сообщения
          </h1>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-64px)]">
          {chatPartners.map(partner => (
            <div
              key={partner.id}
              onClick={() => navigate(`/messages/${partner.id}`)}
              className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                partner.id === userId ? 'bg-primary/10' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={partner.avatar_url || 'https://via.placeholder.com/40'}
                  alt={partner.nickname}
                  className="w-10 h-10 rounded-full object-cover cursor-pointer"
                  onClick={(e) => handleProfileClick(partner.id, e)}
                />
                <div className="flex-1 min-w-0">
                  <h3 
                    className="font-medium text-secondary truncate cursor-pointer hover:text-secondary-light"
                    onClick={(e) => handleProfileClick(partner.id, e)}
                  >
                    {partner.name || partner.nickname}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {partner.lastMessage.content}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {formatMessageTime(partner.lastMessage.created_at)}
                </span>
              </div>
            </div>
          ))}
          {chatPartners.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              Нет сообщений
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      {userId ? (
        <div className="flex-1 flex flex-col h-screen">
          {/* Chat Header */}
          <div className="bg-white p-4 shadow-sm flex items-center gap-4">
            <button
              onClick={() => navigate('/messages')}
              className="md:hidden text-secondary hover:text-secondary-light transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            {currentPartner && (
              <>
                <img
                  src={currentPartner.avatar_url || 'https://via.placeholder.com/40'}
                  alt={currentPartner.nickname}
                  className="w-10 h-10 rounded-full object-cover cursor-pointer"
                  onClick={(e) => handleProfileClick(currentPartner.id, e)}
                />
                <div 
                  className="cursor-pointer"
                  onClick={(e) => handleProfileClick(currentPartner.id, e)}
                >
                  <h2 className="font-medium text-secondary hover:text-secondary-light">
                    {currentPartner.name || currentPartner.nickname}
                  </h2>
                  <p className="text-sm text-gray-500">@{currentPartner.nickname}</p>
                </div>
              </>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${
                    message.sender_id === user?.id
                      ? 'bg-secondary text-white'
                      : 'bg-primary text-secondary'
                  }`}
                >
                  <p>{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender_id === user?.id ? 'text-white/70' : 'text-secondary/70'
                  }`}>
                    {formatMessageTime(message.created_at)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="bg-white p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Сообщение"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                spellCheck="true"
                lang="ru"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-secondary text-white p-2 rounded-lg hover:bg-secondary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={20} />
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-center">
            <MessageSquare size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Выберите чат, чтобы начать переписку</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;