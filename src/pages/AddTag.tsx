import React, { useState } from 'react';
import AddTagForm from '../components/AddTagForm';
import MyTags from '../components/MyTags';
import LikedTags from '../components/LikedTags';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AddTag: React.FC = () => {
  const [showMyTags, setShowMyTags] = useState(false);
  const [showLikedTags, setShowLikedTags] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-background">
      {showMyTags ? (
        <MyTags 
          onBack={() => setShowMyTags(false)}
          onEdit={(tagId) => {
            setEditingTagId(tagId);
            setShowMyTags(false);
          }}
        />
      ) : showLikedTags ? (
        <LikedTags
          onBack={() => setShowLikedTags(false)}
          onEdit={(tagId) => {
            setEditingTagId(tagId);
            setShowLikedTags(false);
          }}
        />
      ) : (
        <>
          <div className="bg-white px-4 py-3 flex items-center justify-between shadow-sm">
            <button 
              onClick={() => navigate('/map')}
              className="text-secondary hover:text-secondary-light transition-colors"
              aria-label="Back to map"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLikedTags(true)}
                className="px-4 py-2 bg-[#E63946] text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Избранные метки
              </button>
              <button
                onClick={() => {
                  setEditingTagId(null);
                  setShowMyTags(true);
                }}
                className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-light transition-colors"
              >
                Мои метки
              </button>
            </div>
          </div>
          <AddTagForm editingTagId={editingTagId} onCancel={() => setShowMyTags(true)} />
        </>
      )}
    </div>
  );
};

export default AddTag;