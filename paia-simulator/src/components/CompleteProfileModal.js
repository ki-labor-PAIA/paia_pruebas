import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function CompleteProfileModal({ isOpen, onClose }) {
  const { data: session, update } = useSession();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !name.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session?.user?.id,
          name: name.trim()
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Update the session with the new name without requiring re-login
        await update({ name: name.trim() });
        onClose();
      } else {
        setError(data.message || 'Error updating profile');
      }
    } catch (error) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(5px)'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(20, 20, 35, 0.95), rgba(30, 30, 50, 0.95))',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 0 40px rgba(214, 107, 255, 0.4)',
        width: '100%',
        maxWidth: '400px',
        color: '#fff',
        border: '1px solid rgba(214, 107, 255, 0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.8rem',
            fontWeight: '700',
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, #d66bff, #9f5fff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Complete Your Profile
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
            Please enter your name to continue
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(244, 67, 54, 0.15)',
            color: '#ff8a8a',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            textAlign: 'center',
            fontSize: '0.9rem',
            border: '1px solid rgba(244, 67, 54, 0.3)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              Your Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Enter your full name"
              autoFocus
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid rgba(214, 107, 255, 0.3)',
                borderRadius: '8px',
                fontSize: '1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
                outline: 'none',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(214, 107, 255, 0.8)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(214, 107, 255, 0.3)'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #d66bff, #9f5fff)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              boxShadow: loading ? 'none' : '0 0 20px rgba(214, 107, 255, 0.5)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => !loading && (e.target.style.boxShadow = '0 0 30px rgba(214, 107, 255, 0.8)')}
            onMouseLeave={(e) => !loading && (e.target.style.boxShadow = '0 0 20px rgba(214, 107, 255, 0.5)')}
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>

        <div style={{
          marginTop: '1.5rem',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: 'rgba(255, 255, 255, 0.5)'
        }}>
          Your name will be visible to other users
        </div>
      </div>
    </div>
  );
}
