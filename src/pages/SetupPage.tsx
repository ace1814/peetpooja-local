import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initSupabase } from '../lib/supabase';
import { seedInitialData } from '../lib/db';
import { useAuth } from '../context/AuthContext';

type Step = 1 | 2 | 3;
type MigrateMode = 'auto' | 'manual';

export function SetupPage() {
  const navigate = useNavigate();
  const { firebaseUser, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };
  const [step, setStep] = useState<Step>(1);

  // Step 2 — auto-migrate
  const [migrateMode, setMigrateMode] = useState<MigrateMode>('auto');
  const [projectUrl, setProjectUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [migrating, setMigrating] = useState(false);
  const [migrateError, setMigrateError] = useState('');
  const [migrateDone, setMigrateDone] = useState(false);
  const [autoAnonKey, setAutoAnonKey] = useState(''); // returned by migrate API

  // Step 3 — manual anon key (if auto failed or manual mode)
  const [manualUrl, setManualUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [copied, setCopied] = useState(false);

  // ─── Auto-migration via our /api/migrate Vercel function ───
  const handleAutoMigrate = async () => {
    if (!projectUrl.trim()) { setMigrateError('Project URL is required'); return; }
    if (!projectUrl.startsWith('https://')) { setMigrateError('URL must start with https://'); return; }
    if (!accessToken.trim()) { setMigrateError('Access token is required'); return; }

    setMigrateError('');
    setMigrating(true);
    try {
      const res = await fetch('/api/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabaseUrl: projectUrl.trim(), accessToken: accessToken.trim() }),
      });

      const data = await res.json() as { success?: boolean; anonKey?: string; error?: string };

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Migration failed — check your token and URL.');
      }

      // API also returns the anon key so the user doesn't have to copy it manually
      if (data.anonKey) {
        setAutoAnonKey(data.anonKey);
        // Auto-connect
        initSupabase(projectUrl.trim(), data.anonKey);
        await seedInitialData();
        navigate('/billing', { replace: true });
      } else {
        // Migration succeeded but anon key wasn't returned — go to manual connect step
        setMigrateDone(true);
        setManualUrl(projectUrl.trim());
        setStep(3);
      }
    } catch (e) {
      setMigrateError(e instanceof Error ? e.message : 'Migration failed. Try manual setup instead.');
    } finally {
      setMigrating(false);
    }
  };

  // ─── Manual connect (step 3) ───
  const handleConnect = async () => {
    const url = manualUrl.trim() || projectUrl.trim();
    const key = anonKey.trim() || autoAnonKey.trim();

    if (!url) { setConnectError('Project URL is required'); return; }
    if (!key) { setConnectError('Anon key is required'); return; }
    if (!url.startsWith('https://')) { setConnectError('URL must start with https://'); return; }

    setConnectError('');
    setConnecting(true);
    try {
      initSupabase(url, key);
      const sb = (await import('../lib/supabase')).getSupabase()!;
      const { error: testErr } = await sb.from('restaurant_settings').select('id').limit(1);
      if (testErr) throw new Error('Could not connect. Have you run the migration SQL?');
      await seedInitialData();
      navigate('/billing', { replace: true });
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const copySqlLink = async () => {
    await navigator.clipboard.writeText(window.location.origin + '/supabase/migration.sql');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadSql = async () => {
    try {
      const res = await fetch('/supabase/migration.sql');
      const text = await res.text();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
      a.download = 'migration.sql';
      a.click();
    } catch {
      window.open('/supabase/migration.sql', '_blank');
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
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
                <h1 className="text-2xl font-bold font-display text-gray-900">One last step 🎉</h1>
                <p className="text-gray-500 mt-2 text-sm">
                  You need a free Supabase database — it's where all your restaurant's billing data will live. Takes about 3 minutes.
                </p>
              </div>
              <div className="space-y-3">
                {[
                  { icon: '🔒', title: 'Your data, your database', desc: 'Only your devices can access it — we never touch your billing data.' },
                  { icon: '📱', title: 'Real-time sync', desc: 'Waiters on their phones see table status the moment it changes.' },
                  { icon: '💸', title: 'Free forever', desc: 'Supabase free tier (500 MB, 50K rows) is more than enough for most restaurants.' },
                ].map(f => (
                  <div key={f.title} className="flex gap-3 p-3 rounded-xl bg-gray-50">
                    <span className="text-2xl shrink-0">{f.icon}</span>
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{f.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setStep(2)} className="w-full bg-brand-red hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-colors">
                Set up my database →
              </button>
            </div>
          )}

          {/* ── Step 2: Create + migrate ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold font-display text-gray-900">Create your Supabase database</h2>
                <p className="text-gray-500 mt-1 text-sm">
                  Supabase is a free Postgres database. Follow the steps below — we'll set it up automatically.
                </p>
              </div>

              {/* Create project instructions */}
              <ol className="space-y-3">
                {[
                  <>Go to <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-brand-red underline font-medium">supabase.com</a> → sign up → click <strong>"New Project"</strong></>,
                  <>Give it a name (e.g. your restaurant name) and set a database password</>,
                  <>Wait ~2 minutes for the project to provision, then copy your <strong>Project URL</strong> from <em>Project Settings → API</em></>,
                ].map((text, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="w-6 h-6 bg-brand-red text-white rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-sm text-gray-700">{text}</p>
                  </div>
                ))}
              </ol>

              {/* Auto vs Manual toggle */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setMigrateMode('auto')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${migrateMode === 'auto' ? 'bg-brand-red text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  ⚡ Auto-setup (recommended)
                </button>
                <button
                  onClick={() => setMigrateMode('manual')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${migrateMode === 'manual' ? 'bg-brand-red text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  🛠 Manual SQL
                </button>
              </div>

              {migrateMode === 'auto' ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    We'll run the database setup automatically. You'll need a one-time <strong>Access Token</strong> from Supabase.
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project URL</label>
                    <input
                      value={projectUrl}
                      onChange={e => setProjectUrl(e.target.value)}
                      placeholder="https://xxxxxxxxxxxx.supabase.co"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Personal Access Token
                      <a
                        href="https://supabase.com/dashboard/account/tokens"
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 text-brand-red text-xs underline font-normal"
                      >
                        Generate one here ↗
                      </a>
                    </label>
                    <input
                      value={accessToken}
                      onChange={e => setAccessToken(e.target.value)}
                      type="password"
                      placeholder="sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red font-mono"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Used once to create tables. Never stored — discarded after setup.
                    </p>
                  </div>

                  {migrateError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                      {migrateError}
                      <button onClick={() => setMigrateMode('manual')} className="block mt-1 text-xs text-red-600 underline">
                        Switch to manual setup instead
                      </button>
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button onClick={() => setStep(1)} className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium">← Back</button>
                    <button
                      onClick={handleAutoMigrate}
                      disabled={migrating}
                      className="flex-1 bg-brand-red hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      {migrating ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Setting up database…
                        </>
                      ) : '⚡ Auto-setup & Connect'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Migration SQL file</p>
                    <div className="flex gap-2">
                      <button onClick={downloadSql} className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors font-medium">
                        ⬇ Download .sql
                      </button>
                      <button onClick={copySqlLink} className="text-sm border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors">
                        {copied ? '✓ Copied' : '🔗 Copy link'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Paste the entire file into Supabase → SQL Editor → Run.</p>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button onClick={() => setStep(1)} className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium">← Back</button>
                    <button onClick={() => setStep(3)} className="flex-1 bg-brand-red hover:bg-red-700 text-white font-semibold py-2 rounded-xl transition-colors text-sm">
                      I've run the SQL →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Manual connect (fallback) ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold font-display text-gray-900">Connect your project</h2>
                <p className="text-gray-500 mt-1 text-sm">
                  {migrateDone
                    ? 'Database is set up! Now paste your anon key to finish connecting.'
                    : 'Find these in Supabase → Project Settings → API'}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project URL</label>
                  <input
                    value={manualUrl || projectUrl}
                    onChange={e => setManualUrl(e.target.value)}
                    placeholder="https://xxxxxxxxxxxx.supabase.co"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Anon / Public Key</label>
                  <input
                    value={anonKey}
                    onChange={e => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-1">Safe to use in the browser — only allows operations within your RLS policies.</p>
                </div>
              </div>

              {connectError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{connectError}</div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep(2)} className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium">← Back</button>
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="flex-1 bg-brand-red hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                >
                  {connecting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Connecting…
                    </>
                  ) : '✓ Connect & Finish'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Your credentials are stored only in your browser — we never see them.
        </p>

        {/* Sign-out / switch account */}
        <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-gray-400">
          {firebaseUser && (
            <>
              <span className="truncate max-w-[160px]">Signed in as {firebaseUser.email}</span>
              <span>·</span>
            </>
          )}
          <button
            onClick={handleSignOut}
            className="text-brand-red hover:underline font-medium"
          >
            {firebaseUser ? 'Sign out / switch account' : 'Back to sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
