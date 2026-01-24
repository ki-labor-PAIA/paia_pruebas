import { useEffect, useState } from 'react';
import PAIAApi from '@/utils/api';
import { generateMockResponse } from '@/utils/mockResponses';

export default function useEmails() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    PAIAApi.getEmails()
      .then(data => setEmails(data))
      .catch(() => {
        const mock = generateMockResponse({ expertise: 'general', personality: 'friendly' }, 'Simular email');
        setEmails([{ id: 1, subject: mock, from: 'mock@paia.ai' }]);
      })
      .finally(() => setLoading(false));
  }, []);

  return { emails, loading };
}