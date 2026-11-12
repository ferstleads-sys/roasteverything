module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const id = String((req.query && req.query.session_id) || "");
  if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(id)) return res.status(400).json({ paid: false });
  try {
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions/" + id, {
      headers: { Authorization: "Bearer " + process.env.STRIPE_SECRET_KEY }
    });
    const s = await r.json();
    if (!r.ok) return res.status(404).json({ paid: false });
    // Optional: only accept sessions from your own Payment Link
    const okLink = !process.env.STRIPE_PAYMENT_LINK_ID || s.payment_link === process.env.STRIPE_PAYMENT_LINK_ID;
    const paid = s.payment_status === "paid" && okLink;
    return res.status(paid ? 200 : 402).json({ paid });
  } catch (e) {
    return res.status(500).json({ paid: false });
  }
};
