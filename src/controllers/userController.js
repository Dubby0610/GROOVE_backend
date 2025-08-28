import supabase from "../services/supabaseClient.js";

export async function getProfile(req, res) {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", req.user.id)
      .single();
    if (error || !profile)
      return res.status(404).json({ error: "Profile not found" });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getSubscription(req, res) {
  try {
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", req.user.id)
      .order("end_date", { ascending: false, nullsFirst: true})
      .limit(1)
      .single();
    if (error || !subscription) return res.json({ status: "none" });

    const now = new Date();
    if (subscription.plan === "onehour") {
      const remaining = subscription.remaining_time_seconds || 0;
      const active = subscription.status === "active" && remaining > 0;
      return res.json({
        status: active ? "active" : "expired",
        plan: subscription.plan,
        remaining_time_seconds: remaining,
        end_date: null,
      });
    }

    const endDate = new Date(subscription.end_date);
    const active = subscription.status === "active" && endDate > now;
    return res.json({
      status: active ? "active" : "expired",
      plan: subscription.plan,
      start_date: subscription.start_date,
      end_date: subscription.end_date,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
