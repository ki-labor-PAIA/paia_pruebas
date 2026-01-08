import { useState, useEffect, useCallback } from 'react';

export default function useDashboardData(session, activeTab) {
    const [myFlows, setMyFlows] = useState([]);
    const [myAgents, setMyAgents] = useState([]);
    const [friendsActiveFlows, setFriendsActiveFlows] = useState([]);
    const [publicAgents, setPublicAgents] = useState([]);
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const loadMyFlows = useCallback(async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/flows/user/${session.user.id}`);
            if (response.ok) {
                const data = await response.json();
                setMyFlows(data.flows || []);
            } else {
                console.warn('Backend no disponible, usando datos vacíos');
                setMyFlows([]);
            }
        } catch (error) {
            console.warn('Backend no disponible, usando datos vacíos:', error);
            setMyFlows([]);
        }
    }, [session?.user?.id]);

    const loadMyAgents = useCallback(async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents?user_id=${session.user.id}`);
            if (response.ok) {
                const data = await response.json();
                setMyAgents(data.agents || []);
            } else {
                console.warn('Backend no disponible, usando datos vacíos');
                setMyAgents([]);
            }
        } catch (error) {
            console.warn('Backend no disponible, usando datos vacíos:', error);
            setMyAgents([]);
        }
    }, [session?.user?.id]);

    const loadFriends = useCallback(async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${session.user.id}/connections`);
            if (response.ok) {
                const data = await response.json();
                setFriends(data.connections || []);
            } else {
                console.warn('Backend no disponible para amigos');
                setFriends([]);
            }
        } catch (error) {
            console.error('Error loading friends:', error);
            setFriends([]);
        }
    }, [session?.user?.id]);

    const loadFriendsActiveFlows = useCallback(async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/flows/friends/${session.user.id}/active`);
            if (response.ok) {
                const data = await response.json();
                setFriendsActiveFlows(data.active_flows || []);
            } else {
                console.warn('Backend no disponible para flujos activos');
                setFriendsActiveFlows([]);
            }
        } catch (error) {
            console.error('Error loading friends active flows:', error);
            setFriendsActiveFlows([]);
        }
    }, [session?.user?.id]);

    const loadPublicAgents = useCallback(async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents/public?exclude_user_id=${session.user.id}`);
            if (response.ok) {
                const data = await response.json();
                setPublicAgents(data.agents || []);
            } else {
                console.warn('Backend no disponible para agentes públicos');
                setPublicAgents([]);
            }
        } catch (error) {
            console.error('Error loading public agents:', error);
            setPublicAgents([]);
        }
    }, [session?.user?.id]);

    const loadInitialData = useCallback(async () => {
        if (!session?.user?.id) return;

        setLoading(true);
        setError('');

        try {
            switch (activeTab) {
                case 'flows':
                    await loadMyFlows();
                    break;
                case 'agents':
                    await loadMyAgents();
                    break;
                case 'friends':
                    await loadFriends();
                    break;
                case 'active-flows':
                    await loadFriendsActiveFlows();
                    break;
                case 'public-agents':
                    await loadPublicAgents();
                    break;
            }
        } catch (err) {
            console.error('Error loading data:', err);
            // setError(`Error cargando datos: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [session, activeTab, loadMyFlows, loadMyAgents, loadFriends, loadFriendsActiveFlows, loadPublicAgents]);

    useEffect(() => {
        if (session?.user?.id) {
            loadInitialData();
        }
    }, [session, activeTab, loadInitialData]);

    return {
        myFlows,
        myAgents,
        friendsActiveFlows,
        publicAgents,
        friends,
        loading,
        error,
        setError,
        refreshData: loadInitialData,
        loadMyFlows,
        loadMyAgents,
        loadFriends
    };
}
