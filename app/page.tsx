export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Flow State Facilitator API</h1>
      <p>Backend API is running successfully.</p>
      <h2>Available Endpoints:</h2>
      <ul>
        <li><code>POST /api/auth/register</code> - Register new user</li>
        <li><code>POST /api/auth/[...nextauth]</code> - Authentication (NextAuth)</li>
        <li><code>GET/POST /api/sessions</code> - Flow sessions</li>
        <li><code>GET/PATCH/DELETE /api/sessions/[id]</code> - Individual session</li>
        <li><code>GET /api/analytics</code> - Flow analytics</li>
        <li><code>GET/POST/PATCH /api/interventions</code> - Interventions</li>
        <li><code>GET/PATCH /api/settings</code> - User settings</li>
        <li><code>GET/POST /api/media/upload</code> - Media upload</li>
        <li><code>POST /api/ai/chat</code> - AI chat (Groq)</li>
        <li><code>POST /api/ml</code> - ML operations (Hugging Face)</li>
      </ul>
    </main>
  );
}
