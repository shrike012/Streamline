import { useEffect, useState } from 'react';
import VideoCard from '../components/VideoCard';
import Grid from '../components/Grid.jsx';
import { getSavedLists, updateSavedLists } from '../api/apiRoutes.js';

function Saved() {
  const [lists, setLists] = useState([]);
  const [activeTab, setActiveTab] = useState('lists');

  useEffect(() => {
    if (activeTab === 'lists') {
      getSavedLists()
        .then((res) => {
          setLists(res.data.lists || []);
        })
        .catch((err) => {
          console.error('Failed to fetch saved lists:', err);
        });
    }
  }, [activeTab]);

  const handleCreateClick = async () => {
    if (activeTab === 'lists') {
      const name = prompt('Enter a list name');
      if (name) {
        const updatedLists = [...lists, { name, videos: [] }];
        setLists(updatedLists);
        try {
          await updateSavedLists({ lists: updatedLists });
        } catch (err) {
          console.error('Failed to save new list:', err);
        }
      }
    } else {
      alert('Note creation not yet implemented.');
    }
  };

  return (
    <>
      <h1>Your Saved</h1>

      <div className="toggle-bar">
        <div className="toggle-buttons" style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={activeTab === 'lists' ? 'button-primary-sm' : 'button-ghost-sm'}
            onClick={() => setActiveTab('lists')}
          >
            Lists
          </button>
          <button
            className={activeTab === 'notes' ? 'button-primary-sm' : 'button-ghost-sm'}
            onClick={() => setActiveTab('notes')}
          >
            Notes
          </button>
          <button className="button-ghost" onClick={handleCreateClick}>
            ＋
          </button>
        </div>
      </div>

      {activeTab === 'lists' && (
        <section className="page-section">
          <Grid
            items={lists}
            renderCard={(list, idx) => (
              <VideoCard
                key={idx}
                title={list.name}
                thumbnail={list.videos[0]?.thumbnail || ''}
                views="View full list"
                timeAgo=""
                length={`${list.videos.length} videos`}
                videoId={null}
                showActions={false}
              />
            )}
          />
        </section>
      )}

      {activeTab === 'notes' && (
        <section className="page-section">
          <p style={{ color: '#aaa', marginTop: '1rem' }}>
            (No saved notes functionality added yet.)
          </p>
        </section>
      )}
    </>
  );
}

export default Saved;