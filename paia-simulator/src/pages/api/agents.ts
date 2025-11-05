import { NextApiRequest, NextApiResponse } from 'next';
import { createServiceSupabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { name, description, personality, expertise, user_id, is_public = false } = req.body;

    if (!user_id || !name) {
      return res.status(400).json({ error: 'User ID and agent name are required.' });
    }

    try {
      const supabase = createServiceSupabase();
      const { data, error } = await supabase
        .from('agents')
        .insert({
          user_id,
          name,
          description,
          personality,
          expertise,
          is_public,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating agent in Supabase:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json(data);
    } catch (error) {
      console.error('Unexpected error creating agent:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'GET') {
    const { user_id, exclude_user_id } = req.query;

    try {
      const supabase = createServiceSupabase();
      let query = supabase.from('agents').select('*');

      if (user_id) {
        query = query.eq('user_id', user_id);
      } else if (exclude_user_id) {
        query = query.eq('is_public', true).neq('user_id', exclude_user_id);
      } else {
        query = query.eq('is_public', true); // Default to public agents if no user_id specified
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching agents from Supabase:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Unexpected error fetching agents:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
