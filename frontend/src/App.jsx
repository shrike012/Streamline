import { useState } from 'react';
import axios from 'axios';

function App() {
  const [idea, setIdea] = useState('');
  const [ideaFeedback, setIdeaFeedback] = useState(null);

  const [title, setTitle] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [packagingFeedback, setPackagingFeedback] = useState(null);

  const [script, setScript] = useState('');
  const [medium, setMedium] = useState('');
  const [visualStyle, setVisualStyle] = useState('');
  const [contentFeedback, setContentFeedback] = useState(null);

  const handleIdeaSubmit = async () => {
    const res = await axios.post('http://localhost:5050/api/idea/validate', { idea });
    setIdeaFeedback(res.data);
  };

  const handlePackagingSubmit = async () => {
    const res = await axios.post('http://localhost:5050/api/packaging/analyze', {
      title,
      thumbnail_description: thumbnail,
    });
    setPackagingFeedback(res.data);
  };

  const handleContentSubmit = async () => {
    const res = await axios.post('http://localhost:5050/api/content/analyze', {
      script,
      medium,
      visual_style: visualStyle,
    });
    setContentFeedback(res.data);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-16 text-sm">
      <header className="text-center">
        <h1 className="text-4xl font-semibold mb-2">Turn ideas into videos, without the chaos.</h1>
        <p className="text-gray-500">One page. Three steps. Everything you need to create high-performing videos — fast.</p>
      </header>

      {/* Step 1: Idea */}
      <section>
        <h2 className="text-xl font-medium mb-2">1. Video Idea</h2>
        <p className="text-gray-500 mb-4">Start with a clear, compelling concept.</p>
        <textarea value={idea} onChange={(e) => setIdea(e.target.value)} className="w-full border p-2 mb-2" rows={3} placeholder="Enter your video idea..." />
        <button onClick={handleIdeaSubmit} className="bg-black text-white px-4 py-2 rounded">Validate Idea</button>
        {ideaFeedback && (
          <div className="mt-4 border p-4 bg-gray-50">
            <p><strong>Score:</strong> {ideaFeedback.score}</p>
            <p><strong>Feedback:</strong> {ideaFeedback.feedback}</p>
          </div>
        )}
      </section>

      {/* Step 2: Packaging */}
      <section>
        <h2 className="text-xl font-medium mb-2">2. Packaging</h2>
        <p className="text-gray-500 mb-4">Make your title and thumbnail work together.</p>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border p-2 mb-2" placeholder="Video title" />
        <input value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} className="w-full border p-2 mb-2" placeholder="Thumbnail description" />
        <button onClick={handlePackagingSubmit} className="bg-black text-white px-4 py-2 rounded">Analyze Packaging</button>
        {packagingFeedback && (
          <div className="mt-4 border p-4 bg-gray-50">
            <p><strong>Score:</strong> {packagingFeedback.score}</p>
            <p><strong>Feedback:</strong> {packagingFeedback.feedback}</p>
          </div>
        )}
      </section>

      {/* Step 3: Content */}
      <section>
        <h2 className="text-xl font-medium mb-2">3. Content</h2>
        <p className="text-gray-500 mb-4">Deliver on your promise with strong storytelling and visuals.</p>
        <textarea value={script} onChange={(e) => setScript(e.target.value)} className="w-full border p-2 mb-2" rows={4} placeholder="Script or main talking points..." />
        <input value={medium} onChange={(e) => setMedium(e.target.value)} className="w-full border p-2 mb-2" placeholder="Video medium (e.g. animation, commentary)" />
        <input value={visualStyle} onChange={(e) => setVisualStyle(e.target.value)} className="w-full border p-2 mb-2" placeholder="Visual style (e.g. 2D, live action)" />
        <button onClick={handleContentSubmit} className="bg-black text-white px-4 py-2 rounded">Analyze Content</button>
        {contentFeedback && (
          <div className="mt-4 border p-4 bg-gray-50">
            <p><strong>Score:</strong> {contentFeedback.score}</p>
            <p><strong>Feedback:</strong> {contentFeedback.feedback}</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default App;