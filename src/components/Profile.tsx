// ... (previous imports remain the same)

const Profile: React.FC = () => {
  // ... (state declarations and other code remain the same)

  return (
    <div className="min-h-screen bg-background">
      {/* ... header section remains the same ... */}

      <div className="max-w-2xl mx-auto p-4">
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ... avatar upload section remains the same ... */}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
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
                  Nickname <span className="text-red-500">*</span>
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
                  Bio
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
                  Link
                </label>
                <input
                  type="url"
                  value={formData.links.website}
                  onChange={(e) => setFormData({
                    ...formData,
                    links: { website: e.target.value }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter your link"
                  spellCheck="false"
                  lang="en"
                />
              </div>
            </div>

            {/* ... form buttons remain the same ... */}
          </form>
        ) : (
          /* ... profile view remains the same ... */
        )}
      </div>
    </div>
  );
};

export default Profile;