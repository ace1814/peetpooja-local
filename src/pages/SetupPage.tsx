import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initSupabase } from '../lib/supabase';

const MIGRATION_SQL_URL = '/supabase/migration.sql';

type Step = 1 | 2 | 3;

export function SetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const downloadSql = async () => {
    try {
      const res = await fetch(MIGRATION_SQL_URL);
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'migration.sql';
      a.click();
    } catch {
      // Fallback: navigate to the file
      window.open(MIGRATION_SQL_URL, '_blank');
    }
  };

  const copySqlLink = async () => {
    await navigator.clipboard.writeText(window.location.origin + MIGRATION_SQL_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnect = async () => {
    if (!url.trim()) { setError('Project URL is required'); return; }
    if (!key.trim()) { setError('Anon key is required'); return; }
    if (!url.startsWith('https://')) { setError('URL must start with https://'); return; }

    setError('');
    setLoading(true);
    try {
      initSupabase(url.trim(), key.trim());
      // Test connection — restaurant_settings is readable by anon
      const sb = (await import('../lib/supabase')).getSupabase()!;
      const { error: testErr } = await sb.from('restaurant_settings').select('id').limit(1);
      if (testErr) throw new Error('Could not connect. Have you run the migration SQL?');
      // Seed happens after login (needs authenticated role for INSERT)
      navigate('/login', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="w-10 h-10 bg-brand-red rounded-xl flex items-center justify-center text-white font-bold text-lg">P</div>
          <span className="text-2xl font-bold font-display text-gray-900">PeetPooja Billing</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {([1, 2, 3] as Step[]).map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                step >= s ? 'bg-brand-red text-white' : 'bg-gray-200 text-gray-500'
              }`}>{s}</div>
              {s < 3 && <div className={`w-10 h-0.5 ${step > s ? 'bg-brand-red' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">

          {/* ── Step 1: Welcome ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold font-display text-gray-900">Welcome! 👋</h1>
                <p className="text-gray-500 mt-2">Let's set up your private billing system. Your data will live in <strong>your own database</strong> — nobody else can access it.</p>
              </div>
              <div className="space-y-3">
                {[
                  { icon: '🔒', title: 'Your data, your database', desc: 'Each restaurant gets a private Supabase project — completely isolated.' },
                  { icon: '📱', title: 'Real-time sync', desc: 'Waiters can take orders on their phones and you see them instantly.' },
                  { icon: '🖨️', title: 'Print & export', desc: '58mm thermal invoices and Excel exports work the same as before.' },
                ].map(f => (
                  <div key={f.title} className="flex gap-3 p-3 rounded-xl bg-gray-50">
                    <span className="text-2xl">{f.icon}</span>
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{f.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setStep(2)} className="w-full bg-brand-red hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-colors">
                Get Started →
              </button>
            </div>
          )}

          {/* ── Step 2: Supabase Setup ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold font-display text-gray-900">Create your database</h2>
                <p className="text-gray-500 mt-1 text-sm">You need a free Supabase account. This takes about 5 minutes.</p>
              </div>
              <ol className="space-y-4">
                <div className="flex gap-3">
                  <span className="w-6 h-6 bg-brand-red text-white rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <p className="text-sm text-gray-700">Go to <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-brand-red font-medium underline">supabase.com</a> and create a free account</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 bg-brand-red text-white rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <p className="text-sm text-gray-700">Click <strong>"New Project"</strong>, give it a name (e.g. your restaurant name), set a database password</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 bg-brand-red text-white rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <p className="text-sm text-gray-700">Go to <strong>SQL Editor</strong> and paste + run the migration file below</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 bg-brand-red text-white rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                  <div className="text-sm text-gray-700 flex-1">
                    <p>Go to <strong>Authentication → URL Configuration</strong> and set:</p>
                    <div className="mt-2 space-y-2">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-amber-700 uppercase mb-1">Site URL</p>
                        <code className="text-xs text-amber-900 font-mono break-all">{window.location.origin}</code>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-amber-700 uppercase mb-1">Redirect URLs — add this</p>
                        <code className="text-xs text-amber-900 font-mono break-all">{window.location.origin}/auth/callback</code>
                        <CopyButton text={`${window.location.origin}/auth/callback`} />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">⚠️ Without this, magic link emails will redirect to localhost instead of your app.</p>
                  </div>
                </div>
              </ol>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Migration SQL file (for step 3)</p>
                <div className="flex gap-2">
                  <button onClick={downloadSql} className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors font-medium">
                    ⬇ Download migration.sql
                  </button>
                  <button onClick={copySqlLink} className="text-sm border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors">
                    {copied ? '✓ Copied' : '🔗 Copy link'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">Paste the entire file into Supabase SQL Editor and click Run.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium">← Back</button>
                <button onClick={() => setStep(3)} className="flex-1 bg-brand-red hover:bg-red-700 text-white font-semibold py-2 rounded-xl transition-colors text-sm">
                  Done — Connect now →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Connect ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold font-display text-gray-900">Connect your project</h2>
                <p className="text-gray-500 mt-1 text-sm">Find these in Supabase → Project Settings → API</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project URL</label>
                  <input
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://xxxxxxxxxxxx.supabase.co"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Anon / Public Key</label>
                  <input
                    value={key}
                    onChange={e => setKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-1">This key is safe to share — it only allows read/write within your RLS policies.</p>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(2)} className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium">← Back</button>
                <button
                  onClick={handleConnect}
                  disabled={loading}
                  className="flex-1 bg-brand-red hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2 rounded-xl transition-colors text-sm"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Connecting…
                    </span>
                  ) : '✓ Connect & Initialize'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Your credentials are stored only in your browser — we never see them.
        </p>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="mt-1 text-xs text-amber-700 underline hover:no-underline">
      {copied ? '✓ Copied!' : 'Copy'}
    </button>
  );
}
