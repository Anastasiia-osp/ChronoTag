// ... (previous imports remain the same)

const Messages: React.FC = () => {
  // ... (state declarations and other code remain the same)

  return (
    <div className="min-h-screen bg-background flex">
      {/* ... chat list sidebar remains the same ... */}

      {/* Chat Area */}
      {userId ? (
        <div className="flex-1 flex flex-col h-screen">
          {/* ... chat header remains the same ... */}

          {/* Messages section remains the same */}

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="bg-white p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
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
        /* ... empty state remains the same ... */
      )}
    </div>
  );
};

export default Messages;