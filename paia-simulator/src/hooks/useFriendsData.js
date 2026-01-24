import { useState, useCallback } from 'react';

const useFriendsData = () => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const loadFriends = useCallback(async (userId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/users/${userId}/connections`);

      if (!response.ok) {
        throw new Error(`Failed to load friends: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform backend data to match frontend expectations
      const transformedFriends = (data.connections || []).map(connection => {
        // Determine who is the "friend" (the other user who is not the current user)
        const isRequester = connection.requester.id === userId;
        const friendData = isRequester ? connection.recipient : connection.requester;

        return {
          connection_id: connection.connection_id,
          friend_id: friendData.id,
          friend_name: friendData.name || 'Unknown User',
          friend_email: friendData.email || '',
          friend_image: friendData.image || null,
          status: connection.status,
          connection_type: connection.connection_type || 'friend',
          connected_since: connection.created_at
        };
      });

      setFriends(transformedFriends);
      return transformedFriends;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const addFriend = useCallback(async (userId, friendData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/users/${userId}/connections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(friendData),
      });

      if (!response.ok) {
        throw new Error(`Failed to add friend: ${response.statusText}`);
      }

      const newFriend = await response.json();
      setFriends(prevFriends => [...prevFriends, newFriend]);
      return newFriend;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const acceptFriendRequest = useCallback(async (connectionId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/connections/${connectionId}/accept`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to accept friend request: ${response.statusText}`);
      }

      const updatedConnection = await response.json();
      setFriends(prevFriends =>
        prevFriends.map(friend =>
          friend.id === connectionId ? updatedConnection : friend
        )
      );
      return updatedConnection;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const rejectFriendRequest = useCallback(async (connectionId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/connections/${connectionId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to reject friend request: ${response.statusText}`);
      }

      setFriends(prevFriends =>
        prevFriends.filter(friend => friend.id !== connectionId)
      );
      return { success: true };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const removeFriend = useCallback(async (connectionId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/connections/${connectionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to remove friend: ${response.statusText}`);
      }

      setFriends(prevFriends =>
        prevFriends.filter(friend => friend.id !== connectionId)
      );
      return { success: true };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  return {
    friends,
    loading,
    error,
    loadFriends,
    addFriend,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
  };
};

export default useFriendsData;
