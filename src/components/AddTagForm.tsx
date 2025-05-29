import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Clock, Check, Calendar, Hash } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { toast } from 'react-toastify';
import L from 'leaflet';
import type { Tag } from '../lib/supabase';

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

interface LocationMarkerProps {
  position: [number, number] | null;
  setPosition: (position: [number, number]) => void;
  tagType: string;
  onPositionChange: (position: [number, number]) => void;
  initialPosition?: [number, number];
}

const LocationMarker: React.FC<LocationMarkerProps> = ({ 
  position, 
  setPosition, 
  tagType, 
  onPositionChange,
  initialPosition 
}) => {
  const map = useMap();
  
  useEffect(() => {
    if (initialPosition) {
      map.setView(initialPosition, 16);
    } else {
      map.locate({
        setView: true,
        maxZoom: 16
      });
    }

    const handleLocationError = () => {
      console.log('Location access denied or unavailable');
      // Default coordinates (Moscow)
      const defaultLocation: [number, number] = [55.7558, 37.6173];
      map.setView(defaultLocation, 10);
    };
    
    map.on('locationerror', handleLocationError);
    
    return () => {
      map.off('locationerror', handleLocationError);
    };
  }, [map, initialPosition]);

  useMapEvents({
    click(e) {
      const newPosition: [number, number] = [e.latlng.lat, e.latlng.lng];
      setPosition(newPosition);
      onPositionChange(newPosition);
    },
  });

  const getMarkerIcon = () => {
    switch (tagType) {
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

  return position ? <Marker position={position} icon={getMarkerIcon()} /> : null;
};

interface AddTagFormProps {
  editingTagId: string | null;
  onCancel: () => void;
}

const AddTagForm: React.FC<AddTagFormProps> = ({ editingTagId, onCancel }) => {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [initialPosition, setInitialPosition] = useState<[number, number] | undefined>();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [activationDate, setActivationDate] = useState<Date | null>(new Date());
  const [timeRangeStart, setTimeRangeStart] = useState<Date | null>(null);
  const [timeRangeEnd, setTimeRangeEnd] = useState<Date | null>(null);
  const [type, setType] = useState('событие');
  const [visibility, setVisibility] = useState('публичная');
  const [hashtags, setHashtags] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useTimeRange, setUseTimeRange] = useState(false);
  const [address, setAddress] = useState('');
  const [initialFormState, setInitialFormState] = useState<string>('');
  const { user } = useAuth();

  useEffect(() => {
    if (editingTagId) {
      fetchTag();
    }
  }, [editingTagId]);

  useEffect(() => {
    const currentState = JSON.stringify({
      title,
      message,
      type,
      visibility,
      hashtags,
      position,
      activationDate,
      timeRangeStart,
      timeRangeEnd,
      useTimeRange
    });

    if (!initialFormState) {
      setInitialFormState(currentState);
    }
  }, [title, message, type, visibility, hashtags, position, activationDate, timeRangeStart, timeRangeEnd, useTimeRange]);

  const fetchTag = async () => {
    try {
      const { data: tagData, error: tagError } = await supabase
        .from('tags')
        .select('*')
        .eq('id', editingTagId)
        .single();

      if (tagError) throw tagError;

      const { data: hashtagData, error: hashtagError } = await supabase
        .from('hashtag')
        .select('hashtag')
        .eq('tag_id', editingTagId);

      if (hashtagError) throw hashtagError;

      if (tagData) {
        setTitle(tagData.title);
        setMessage(tagData.message);
        const tagPosition: [number, number] = [tagData.latitude, tagData.longitude];
        setPosition(tagPosition);
        setInitialPosition(tagPosition);
        setType(tagData.type);
        setVisibility(tagData.visibility);
        setAddress(tagData.address || '');

        const hashtagString = hashtagData
          ?.map(h => h.hashtag.toLowerCase())
          .join(', ') || '';
        setHashtags(hashtagString);

        if (tagData.time_range_start && tagData.time_range_end) {
          setUseTimeRange(true);
          setTimeRangeStart(new Date(tagData.time_range_start));
          setTimeRangeEnd(new Date(tagData.time_range_end));
          setActivationDate(null);
        } else if (tagData.activation_datetime) {
          setUseTimeRange(false);
          setActivationDate(new Date(tagData.activation_datetime));
          setTimeRangeStart(null);
          setTimeRangeEnd(null);
        }

        setInitialFormState(JSON.stringify({
          title: tagData.title,
          message: tagData.message,
          type: tagData.type,
          visibility: tagData.visibility,
          hashtags: hashtagString,
          position: [tagData.latitude, tagData.longitude],
          activationDate: tagData.activation_datetime ? new Date(tagData.activation_datetime) : null,
          timeRangeStart: tagData.time_range_start ? new Date(tagData.time_range_start) : null,
          timeRangeEnd: tagData.time_range_end ? new Date(tagData.time_range_end) : null,
          useTimeRange: !!tagData.time_range_start
        }));
      }
    } catch (error) {
      console.error('Error fetching tag:', error);
      toast.error('Error fetching tag');
    }
  };

  const fetchAddress = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        {
          headers: {
            'User-Agent': 'ChronoTag/1.0'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch address');
      }
      
      const data = await response.json();
      setAddress(data.display_name);
    } catch (error) {
      console.error('Error fetching address:', error);
      setAddress('');
    }
  };

  const handlePositionChange = (newPosition: [number, number]) => {
    fetchAddress(newPosition[0], newPosition[1]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!position || !title || !message || !user) {
      toast.error('Пожалуйста, заполните все обязательные поля и выберите местоположение');
      return;
    }

    if (title.length > 120) {
      toast.error('Заголовок не может быть длиннее 120 символов');
      return;
    }

    if (!useTimeRange && !activationDate) {
      toast.error('Пожалуйста, укажите время активации');
      return;
    }

    if (useTimeRange && (!timeRangeStart || !timeRangeEnd)) {
      toast.error('Пожалуйста, укажите временной диапазон');
      return;
    }

    if (useTimeRange && timeRangeStart && timeRangeEnd && timeRangeStart >= timeRangeEnd) {
      toast.error('Время начала должно быть раньше времени окончания');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const tagData = {
        user_id: user.id,
        title,
        latitude: position[0],
        longitude: position[1],
        message,
        activation_datetime: useTimeRange ? null : activationDate?.toISOString(),
        time_range_start: useTimeRange ? timeRangeStart?.toISOString() : null,
        time_range_end: useTimeRange ? timeRangeEnd?.toISOString() : null,
        type,
        visibility,
        address: address || null
      };

      let tagId;
      let error;

      if (editingTagId) {
        ({ error } = await supabase
          .from('tags')
          .update(tagData)
          .eq('id', editingTagId));
        tagId = editingTagId;
      } else {
        const { data, error: insertError } = await supabase
          .from('tags')
          .insert(tagData)
          .select('id')
          .single();
        error = insertError;
        tagId = data?.id;
      }

      if (error) throw error;

      if (tagId) {
        if (editingTagId) {
          const { error: deleteError } = await supabase
            .from('hashtag')
            .delete()
            .eq('tag_id', tagId);
          
          if (deleteError) throw deleteError;
        }

        if (hashtags.trim()) {
          const hashtagArray = hashtags
            .split(',')
            .map(tag => tag.trim().toLowerCase())
            .filter(Boolean)
            .filter((value, index, self) => self.indexOf(value) === index);

          if (hashtagArray.length > 0) {
            const hashtagData = hashtagArray.map(hashtag => ({
              tag_id: tagId,
              hashtag: hashtag
            }));

            const { error: hashtagError } = await supabase
              .from('hashtag')
              .insert(hashtagData);

            if (hashtagError) throw hashtagError;
          }
        }
      }

      toast.success(editingTagId ? 'Метка обновлена!' : 'Метка добавлена!');
      onCancel();
    } catch (error) {
      console.error('Error saving tag:', error);
      toast.error('Ошибка при сохранении метки');
    } finally {
      setIsLoading(false);
    }
  };
  
  const isFormValid = !!position && !!title && !!message && 
    ((!useTimeRange && !!activationDate) || 
     (useTimeRange && !!timeRangeStart && !!timeRangeEnd));

  const hasChanges = () => {
    const currentState = JSON.stringify({
      title,
      message,
      type,
      visibility,
      hashtags,
      position,
      activationDate,
      timeRangeStart,
      timeRangeEnd,
      useTimeRange
    });
    return currentState !== initialFormState;
  };

  return (
    <div className="h-screen w-full flex flex-col">
      <div className="h-1/3 relative">
        <MapContainer
          center={[55.7558, 37.6173]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          attributionControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker 
            position={position} 
            setPosition={setPosition} 
            tagType={type}
            onPositionChange={handlePositionChange}
            initialPosition={initialPosition}
          />
        </MapContainer>
        
        {!position && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 pointer-events-none">
            <div className="bg-white p-3 rounded-lg shadow-lg text-secondary text-sm">
              Нажмите на карту, чтобы разместить метку
            </div>
          </div>
        )}
      </div>

      <div className="text-center py-4">
        <h1 className="text-2xl font-bold text-secondary">
          {editingTagId ? 'Редактировать метку' : 'Создать метку'}
        </h1>
      </div>
      
      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Заголовок <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Введите заголовок"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
              spellCheck="true"
              lang="ru"
            />
            <p className="text-xs text-gray-500 mt-1">
              {title.length}/120 символов
            </p>
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Описание <span className="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="О чем вы хотите рассказать?"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
              required
              spellCheck="true"
              lang="ru"
            />
          </div>

          {address && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Адрес
              </label>
              <p className="text-gray-700">
                {address}
              </p>
            </div>
          )}

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Тип метки
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="событие">Событие</option>
              <option value="объявление">Объявление</option>
              <option value="планы">Планы</option>
            </select>
          </div>

          <div>
            <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 mb-1">
              Видимость
            </label>
            <select
              id="visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="публичная">Публичная</option>
              <option value="личная">Личная</option>
              <option value="друзьям">Только друзьям</option>
            </select>
          </div>

          <div>
            <label htmlFor="hashtags" className="block text-sm font-medium text-gray-700 mb-1">
              Хэштеги
            </label>
            <div className="relative">
              <Hash size={20} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                id="hashtags"
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="Введите хэштеги через запятую"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                spellCheck="true"
                lang="ru"
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="useTimeRange"
                checked={useTimeRange}
                onChange={(e) => setUseTimeRange(e.target.checked)}
                className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="useTimeRange" className="ml-2 block text-sm text-gray-700">
                Использовать временной диапазон
              </label>
            </div>

            {useTimeRange ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="time-range-start" className="block text-sm font-medium text-gray-700 mb-1">
                    Начало периода <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    selected={timeRangeStart}
                    onChange={(date) => setTimeRangeStart(date)}
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat="d MMMM yyyy HH:mm"
                    minDate={new Date()}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    id="time-range-start"
                  />
                </div>

                <div>
                  <label htmlFor="time-range-end" className="block text-sm font-medium text-gray-700 mb-1">
                    Конец периода <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    selected={timeRangeEnd}
                    onChange={(date) => setTimeRangeEnd(date)}
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat="d MMMM yyyy HH:mm"
                    minDate={timeRangeStart || new Date()}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    id="time-range-end"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="activation-date" className="block text-sm font-medium text-gray-700 mb-1">
                  Когда <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  selected={activationDate}
                  onChange={(date) => setActivationDate(date)}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="d MMMM yyyy HH:mm"
                  minDate={new Date()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  id="activation-date"
                />
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isLoading || !hasChanges()}
              className={`px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                isFormValid && hasChanges() && !isLoading
                  ? 'bg-secondary text-white hover:bg-secondary-light'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                'Сохранение...'
              ) : (
                <>
                  <Check size={20} />
                  <span>{editingTagId ? 'Сохранить изменения' : 'Сохранить'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default AddTagForm;