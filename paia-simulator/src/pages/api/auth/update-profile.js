export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId, name } = req.body;
  console.log('[UPDATE PROFILE] Request received:', { userId, name });

  if (!userId || !name || !name.trim()) {
    console.log('[UPDATE PROFILE] Validation failed - missing userId or name');
    return res.status(400).json({ message: 'User ID and name are required' });
  }

  try {
    const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/users/${userId}`;
    console.log('[UPDATE PROFILE] Calling backend:', backendUrl, { name: name.trim() });

    const response = await fetch(backendUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() })
    });

    console.log('[UPDATE PROFILE] Backend response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('[UPDATE PROFILE] Success:', data);
      res.status(200).json({ message: 'Profile updated successfully' });
    } else {
      const data = await response.json();
      console.error('[UPDATE PROFILE] Backend error:', data);
      res.status(response.status).json({ message: data.message || 'Error updating profile' });
    }
  } catch (error) {
    console.error('[UPDATE PROFILE] Exception:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
