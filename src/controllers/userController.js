import supabase from '../services/supabaseClient.js';

export async function getProfile(req, res) {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .single();
    if (error || !profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getSubscription(req, res) {
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('end_date', { ascending: false })
      .limit(1)
      .single();
    if (error || !subscription) return res.json({ status: 'none' });
    // Check if subscription is active
    const now = new Date();
    const end = new Date(subscription.end_date);
    if (subscription.status === 'active' && end > now) {
      return res.json({ status: 'active', plan: subscription.plan, end_date: subscription.end_date });
    }
    res.json({ status: 'expired', plan: subscription.plan, end_date: subscription.end_date });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
} 