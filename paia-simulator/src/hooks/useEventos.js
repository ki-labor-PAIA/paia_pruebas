import { useEffect, useState } from 'react';
import PAIAApi from '@/utils/api';
import { generateMockResponse } from '@/utils/mockResponses';

export default function useEventos() {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    PAIAApi.getEventos()
      .then(data => setEventos(data))
      .catch(() => {
        const mock = generateMockResponse({ expertise: 'scheduling', personality: 'professional' }, 'Simular evento');
        setEventos([{ id: 1, title: mock, date: '2025-01-01' }]);
      })
      .finally(() => setLoading(false));
  }, []);

  return { eventos, loading };
}