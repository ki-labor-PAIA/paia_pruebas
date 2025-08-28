import { useEffect, useState } from 'react';
import PAIAApi from '@/utils/api';
import { generateMockResponse } from '@/utils/mockResponses';

export default function useNotas() {
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    PAIAApi.getNotas()
      .then(data => setNotas(data))
      .catch(() => {
        const mock = generateMockResponse({ expertise: 'creativity', personality: 'creative' }, 'Simular nota');
        setNotas([{ id: 1, content: mock }]);
      })
      .finally(() => setLoading(false));
  }, []);

  return { notas, loading };
}