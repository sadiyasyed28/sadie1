export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  // Deliberately fail closed until authenticated access, persistent storage,
  // and a server-side AI provider are configured. Never expose model keys in VITE_*.
  return res.status(503).json({
    error: 'The project assistant backend is not configured yet. Sign-in and a server-side AI provider must be connected before the assistant can respond. No patient analysis or clinical evaluation is available.'
  });
}
