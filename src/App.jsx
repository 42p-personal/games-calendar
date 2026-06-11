import { useState, useEffect, useRef } from 'react';

const API_URL       = import.meta.env.VITE_API_URL ?? '';
const GUILD_KEY     = 'dc_guild'; // same key as calendar.42p.uk
const CALENDAR_URL  = 'https://calendar.42p.uk';

// ─── Helpers ─────────────────────────────────────────────────

async function apiFetch(method, path, body, guildId) {
  var headers = {};
  if (body)    headers['Content-Type'] = 'application/json';
  if (guildId) headers['X-Guild-ID']   = guildId;
  var res = await fetch(API_URL + path, {
    method:      method,
    credentials: 'include',
    headers:     headers,
    body:        body ? JSON.stringify(body) : undefined,
  });
  var data = await res.json().catch(function() { return {}; });
  if (!res.ok) throw new Error(data.error || 'Request failed (' + res.status + ')');
  return data;
}

function newId() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

// ─── 42p Logo ────────────────────────────────────────────────
function Logo42p({ size }) {
  size = size || 40;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
      style={{ transform: 'rotate(-8deg)', filter: 'drop-shadow(0 2px 8px #7c3aed66)' }}>
      <rect x="2" y="2" width="60" height="60" rx="18" fill="url(#lg1)"/>
      <rect x="2" y="2" width="60" height="60" rx="18" stroke="url(#lg2)" strokeWidth="1.5" fill="none"/>
      <text x="4" y="44" fontFamily="'Arial Black',Arial,sans-serif" fontWeight="900" fontSize="34" fill="#fff" letterSpacing="-2">4</text>
      <text x="26" y="44" fontFamily="'Arial Black',Arial,sans-serif" fontWeight="900" fontSize="34" fill="url(#lg3)" letterSpacing="-2">2</text>
      <text x="46" y="52" fontFamily="'Arial Black',Arial,sans-serif" fontWeight="900" fontSize="20" fill="#c4b5fd">p</text>
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4c1d95"/><stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
        <linearGradient id="lg2" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.6"/><stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="lg3" x1="26" y1="10" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e9d5ff"/><stop offset="100%" stopColor="#a78bfa"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Auth screen ──────────────────────────────────────────────
function AuthScreen() {
  var [busy, setBusy] = useState(false);
  var [error, setError] = useState('');

  useEffect(function() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('auth_error')) {
      window.history.replaceState({}, '', window.location.pathname);
      setError('Discord sign-in failed. Please try again.');
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 60% 20%, #2e1065 0%, #0f1015 60%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <div style={{ display: 'inline-block', marginBottom: 20 }}><Logo42p size={64} /></div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#f5f3ff', margin: '0 0 6px', letterSpacing: '-0.03em' }}>42p Games</h1>
        <p style={{ fontSize: 13, color: '#a78bfa', margin: '0 0 32px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Upcoming Releases
        </p>
        <div style={{ background: 'rgba(26,27,34,0.85)', border: '0.5px solid #3b1f6e', borderRadius: 20, padding: '2rem', boxShadow: '0 24px 64px rgba(124,58,237,0.2)', backdropFilter: 'blur(12px)' }}>
          <p style={{ fontSize: 13, color: '#8b8ca8', margin: '0 0 20px' }}>
            Sign in with Discord to browse upcoming games and add them to your server's calendar.
          </p>
          <button
            onClick={function() { setBusy(true); window.location.href = API_URL + '/auth/discord'; }}
            disabled={busy}
            style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: busy ? '#3a3d8a' : 'linear-gradient(135deg,#5865f2,#7c3aed)', color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: busy ? 'not-allowed' : 'pointer', boxShadow: '0 4px 20px rgba(88,101,242,0.4)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
            {busy ? 'Connecting…' : 'Continue with Discord'}
          </button>
          {error && <p style={{ fontSize: 13, color: '#f87171', marginTop: 14 }}>{error}</p>}
        </div>
        <a href={CALENDAR_URL} style={{ display: 'inline-block', marginTop: 20, fontSize: 12, color: '#6b6b7a', textDecoration: 'none' }}>← Back to Discord Calendar</a>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}

// ─── Guild picker ─────────────────────────────────────────────
function GuildPicker({ guilds, loading, error, onSelect }) {
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f1015', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#8b8ca8' }}>
        <i className="ti ti-loader" style={{ fontSize: 20, color: '#6366f1', animation: 'spin 1s linear infinite' }} />
        Loading your servers…
      </div>
    );
  }
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 60% 20%, #2e1065 0%, #0f1015 60%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 500 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-block', marginBottom: 16 }}><Logo42p size={56} /></div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e8e9f3', margin: '0 0 6px' }}>Select a server</h1>
          <p style={{ fontSize: 13, color: '#8b8ca8', margin: 0 }}>Games you add will appear on that server's calendar.</p>
        </div>
        {error && <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: '#ff000015', border: '0.5px solid #ff000044', fontSize: 13, color: '#f87171', textAlign: 'center' }}>{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {guilds.map(function(g) {
            return (
              <button key={g.id} onClick={function() { onSelect(g); }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, border: '0.5px solid #2a2b36', background: '#1a1b22', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                onMouseEnter={function(e) { e.currentTarget.style.background = '#22232c'; e.currentTarget.style.borderColor = '#6366f1'; }}
                onMouseLeave={function(e) { e.currentTarget.style.background = '#1a1b22'; e.currentTarget.style.borderColor = '#2a2b36'; }}
              >
                {g.iconUrl
                  ? <img src={g.iconUrl} alt={g.name} style={{ width: 46, height: 46, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 46, height: 46, borderRadius: 14, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{g.name[0].toUpperCase()}</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e8e9f3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</p>
                </div>
                <i className="ti ti-chevron-right" style={{ fontSize: 16, color: '#52536a' }} />
              </button>
            );
          })}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}

// ─── Game card ────────────────────────────────────────────────
function GameCard({ game, isAdded, isAdding, onAdd, onRemove }) {
  var today       = new Date();
  var releaseDate = game.releaseDate ? new Date(game.releaseDate) : null;
  var daysUntil   = releaseDate ? Math.ceil((releaseDate - today) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div style={{ background: '#1a1b22', border: '0.5px solid #2a2b36', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.15s', animation: 'fadeIn 0.3s ease' }}
      onMouseEnter={function(e) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#363748'; }}
      onMouseLeave={function(e) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#2a2b36'; }}
    >
      {/* Cover */}
      <div style={{ position: 'relative', paddingTop: '56.25%', background: '#111116', overflow: 'hidden' }}>
        {game.coverUrl
          ? <img src={game.coverUrl} alt={game.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, background: 'linear-gradient(135deg,#1e1f28,#2a1f4e)' }}>🎮</div>
        }
        {daysUntil !== null && (
          <div style={{ position: 'absolute', top: 8, right: 8, borderRadius: 8, padding: '4px 8px', fontSize: 11, fontWeight: 700, color: '#fff', background: daysUntil <= 7 ? '#ef4444' : daysUntil <= 30 ? '#f97316' : '#6366f1', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            {daysUntil <= 0 ? 'OUT NOW' : daysUntil === 1 ? 'TOMORROW' : daysUntil + 'd'}
          </div>
        )}
        {/* RAWG link */}
        <a href={'https://rawg.io/games/' + game.slug} target="_blank" rel="noopener noreferrer"
          title="View on RAWG" onClick={function(e) { e.stopPropagation(); }}
          style={{ position: 'absolute', bottom: 8, right: 8, width: 26, height: 26, borderRadius: 6, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, textDecoration: 'none' }}>
          🔗
        </a>
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#e8e9f3', lineHeight: 1.3 }}>{game.name}</p>
        <p style={{ margin: 0, fontSize: 12, color: game.releaseDate ? '#a78bfa' : '#6b6b7a', fontWeight: game.releaseDate ? 600 : 400 }}>
          {releaseDate ? releaseDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Release date TBC'}
        </p>
        {game.platforms && (
          <p style={{ margin: 0, fontSize: 11, color: '#4a4a5a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{game.platforms}</p>
        )}
      </div>

      {/* Action */}
      <div style={{ padding: '0 14px 12px' }}>
        {isAdded ? (
          <button onClick={function() { onRemove(game); }}
            style={{ width: '100%', padding: '7px', borderRadius: 8, border: '0.5px solid #16a34a55', background: '#16a34a15', color: '#86efac', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all 0.15s' }}
            onMouseEnter={function(e) { e.currentTarget.style.background = '#ff000015'; e.currentTarget.style.borderColor = '#ff555544'; e.currentTarget.style.color = '#ff7070'; e.currentTarget.textContent = '✕ Remove from calendar'; }}
            onMouseLeave={function(e) { e.currentTarget.style.background = '#16a34a15'; e.currentTarget.style.borderColor = '#16a34a55'; e.currentTarget.style.color = '#86efac'; e.currentTarget.innerHTML = '<span>✓ Added to calendar</span>'; }}
          >
            <span>✓ Added to calendar</span>
          </button>
        ) : (
          <button onClick={function() { onAdd(game); }} disabled={isAdding}
            style={{ width: '100%', padding: '7px', borderRadius: 8, border: 'none', background: isAdding ? '#3730a3' : '#6366f1', color: '#fff', cursor: isAdding ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            {isAdding
              ? <><i className="ti ti-loader" style={{ fontSize: 12, animation: 'spin 1s linear infinite' }} />Adding…</>
              : <><i className="ti ti-calendar-plus" style={{ fontSize: 12 }} />Add to calendar</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────
export default function App() {
  var [screen,      setScreen]      = useState('loading'); // loading|auth|guild-pick|games
  var [user,        setUser]        = useState(null);
  var [guilds,      setGuilds]      = useState([]);
  var [guildsLoading,setGuildsLoading] = useState(false);
  var [guildsError, setGuildsError] = useState('');
  var [currentGuild,setCurrentGuild]= useState(null);

  var [rawgGames,   setRawgGames]   = useState([]);
  var [trackedGames,setTrackedGames]= useState([]); // games already added to this guild
  var [gamesLoading,setGamesLoading]= useState(false);
  var [addingId,    setAddingId]    = useState(null);
  var [removingId,  setRemovingId]  = useState(null);
  var [page,        setPage]        = useState(1);
  var [hasMore,     setHasMore]     = useState(false);
  var [filter,      setFilter]      = useState('upcoming'); // upcoming|all
  var [searchQuery, setSearchQuery] = useState('');
  var [searchResults,setSearchResults] = useState([]);
  var [searching,   setSearching]   = useState(false);
  var searchTimeout                 = useRef(null);

  // Bootstrap — check session
  useEffect(function() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
    }

    apiFetch('GET', '/auth/me')
      .then(function(u) {
        setUser(u);
        // Try to load guild from shared localStorage key
        var saved = null;
        try { saved = JSON.parse(localStorage.getItem(GUILD_KEY)); } catch (e) {}
        if (saved) {
          loadGamesForGuild(saved, u);
        } else {
          loadGuilds();
        }
      })
      .catch(function() { setScreen('auth'); });
  }, []);

  async function loadGuilds() {
    setGuildsLoading(true);
    setGuildsError('');
    setScreen('guild-pick');
    try {
      var g = await apiFetch('GET', '/api/guilds');
      setGuilds(g);
    } catch (err) {
      setGuildsError(err.message);
    } finally {
      setGuildsLoading(false);
    }
  }

  async function loadGamesForGuild(guild, u) {
    setCurrentGuild(guild);
    localStorage.setItem(GUILD_KEY, JSON.stringify(guild));
    setScreen('games');
    setGamesLoading(true);

    // Load already-tracked games for this guild
    try {
      var tracked = await apiFetch('GET', '/api/games', null, guild.id);
      setTrackedGames(tracked);
    } catch (err) {
      console.error('Failed to load tracked games:', err.message);
    }

    // Load upcoming survival multiplayer games from RAWG via Worker
    await loadRawgPage(1, guild.id);
    setGamesLoading(false);
  }

  async function loadRawgPage(p, guildId) {
    try {
      var gId  = guildId || (currentGuild && currentGuild.id);
      var data = await apiFetch('GET', '/api/rawg/upcoming?page=' + p, null, gId);
      if (p === 1) {
        setRawgGames(data.results || []);
      } else {
        setRawgGames(function(prev) { return prev.concat(data.results || []); });
      }
      setHasMore(!!data.next);
      setPage(p);
    } catch (err) {
      console.error('Failed to load RAWG games:', err.message);
    }
  }

  function handleGuildSelect(guild) {
    setRawgGames([]);
    setTrackedGames([]);
    setSearchResults([]);
    setSearchQuery('');
    loadGamesForGuild(guild, user);
  }

  async function handleAdd(game) {
    setAddingId(game.rawgId);
    try {
      var saved = await apiFetch('POST', '/api/games', {
        rawgId:      game.rawgId,
        name:        game.name,
        releaseDate: game.releaseDate,
        coverUrl:    game.coverUrl,
        platforms:   game.platforms,
      }, currentGuild.id);
      setTrackedGames(function(prev) { return prev.concat(saved); });
    } catch (err) {
      alert(err.message);
    } finally {
      setAddingId(null);
    }
  }

  async function handleRemove(game) {
    // Find the tracked entry by rawgId
    var tracked = trackedGames.find(function(g) { return g.rawgId === game.rawgId; });
    if (!tracked) return;
    setRemovingId(game.rawgId);
    try {
      await apiFetch('DELETE', '/api/games/' + tracked.id, null, currentGuild.id);
      setTrackedGames(function(prev) { return prev.filter(function(g) { return g.id !== tracked.id; }); });
    } catch (err) {
      alert(err.message);
    } finally {
      setRemovingId(null);
    }
  }

  function isTracked(rawgId) {
    return trackedGames.some(function(g) { return g.rawgId === rawgId; });
  }

  // Search
  function handleSearchInput(e) {
    var q = e.target.value;
    setSearchQuery(q);
    clearTimeout(searchTimeout.current);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async function() {
      setSearching(true);
      try {
        var res = await apiFetch('GET', '/api/games/search?q=' + encodeURIComponent(q.trim()), null, currentGuild.id);
        setSearchResults(res.map(function(g) { return Object.assign({}, g, { slug: g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') }); }));
      } catch (err) {
        console.error('Search failed:', err.message);
      } finally {
        setSearching(false);
      }
    }, 500);
  }

  var today       = new Date();
  var displayGames = (searchQuery.trim().length >= 2 ? searchResults : rawgGames).map(function(g) {
    return Object.assign({}, g, { slug: g.slug || g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') });
  });

  if (filter === 'upcoming' && !searchQuery) {
    displayGames = displayGames.filter(function(g) { return g.releaseDate && new Date(g.releaseDate) > today; });
  }

  // ── Screens ───────────────────────────────────────────────

  if (screen === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#0f1015', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#8b8ca8' }}>
        <i className="ti ti-loader" style={{ fontSize: 20, color: '#6366f1', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}`}</style>
      </div>
    );
  }

  if (screen === 'auth')       return <AuthScreen />;
  if (screen === 'guild-pick') return <GuildPicker guilds={guilds} loading={guildsLoading} error={guildsError} onSelect={handleGuildSelect} />;

  // ── Games screen ──────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#0f1015' }}>
      <style>{`
        @keyframes spin   { from{transform:rotate(0deg);}  to{transform:rotate(360deg);} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
        .scroll-thin::-webkit-scrollbar{width:5px;}
        .scroll-thin::-webkit-scrollbar-track{background:#1a1b22;}
        .scroll-thin::-webkit-scrollbar-thumb{background:#3a3a42;border-radius:99px;}
      `}</style>

      {/* Header */}
      <header style={{ background: '#111116', borderBottom: '0.5px solid #2a2b36', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo42p size={36} />
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f5f3ff', letterSpacing: '-0.02em' }}>42p Games</p>
            <p style={{ margin: 0, fontSize: 11, color: '#6b6b7a' }}>Upcoming survival multiplayer releases</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Server indicator + switch */}
          <button onClick={loadGuilds}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 9, border: '0.5px solid #2a2b36', background: 'transparent', cursor: 'pointer', color: '#8b8ca8', fontSize: 12 }}>
            {currentGuild && currentGuild.iconUrl
              ? <img src={currentGuild.iconUrl} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'cover' }} />
              : <div style={{ width: 18, height: 18, borderRadius: 4, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>{currentGuild && currentGuild.name[0].toUpperCase()}</div>
            }
            <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentGuild && currentGuild.name}</span>
            <i className="ti ti-chevron-down" style={{ fontSize: 11 }} />
          </button>

          {/* Calendar link */}
          <a href={CALENDAR_URL} style={{ padding: '7px 14px', borderRadius: 9, border: '0.5px solid #2a2b36', background: 'transparent', color: '#8b8ca8', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-calendar-event" style={{ fontSize: 14 }} />
            Calendar
          </a>

          {/* User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 9, background: '#6366f115', border: '0.5px solid #6366f133' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
              {user && (user.avatar || (user.name && user.name[0].toUpperCase()))}
            </div>
            <span style={{ fontSize: 12, color: '#a5b4fc', fontWeight: 600 }}>@{user && user.username}</span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6b6b7a', fontSize: 16, pointerEvents: 'none' }} />
          <input
            value={searchQuery}
            onChange={handleSearchInput}
            placeholder="Search for any game on RAWG to add to your calendar…"
            style={{ width: '100%', boxSizing: 'border-box', background: '#1a1b22', border: '0.5px solid #3a3a42', borderRadius: 12, color: '#e8e9f3', padding: '12px 14px 12px 42px', fontSize: 14, outline: 'none' }}
          />
          {searching && <i className="ti ti-loader" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#6b6b7a', fontSize: 16, animation: 'spin 1s linear infinite' }} />}
          {searchQuery && <button onClick={function() { setSearchQuery(''); setSearchResults([]); }}
            style={{ position: 'absolute', right: searching ? 38 : 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b6b7a', cursor: 'pointer', fontSize: 16, padding: 0 }}>✕</button>}
        </div>

        {/* Filter tabs — only shown when not searching */}
        {!searchQuery && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 4, background: '#1a1b22', borderRadius: 10, padding: 4 }}>
              {[['upcoming', 'Upcoming'], ['all', 'All']].map(function(pair) {
                var val = pair[0]; var label = pair[1];
                return (
                  <button key={val} onClick={function() { setFilter(val); }}
                    style={{ padding: '6px 16px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: filter === val ? 600 : 400, background: filter === val ? '#6366f1' : 'transparent', color: filter === val ? '#fff' : '#8b8ca8', cursor: 'pointer', transition: 'all 0.15s' }}>
                    {label}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 12, color: '#6b6b7a', margin: 0 }}>
              {trackedGames.length} game{trackedGames.length !== 1 ? 's' : ''} added to <strong style={{ color: '#a5b4fc' }}>{currentGuild && currentGuild.name}</strong>'s calendar
            </p>
          </div>
        )}

        {searchQuery && searchQuery.trim().length >= 2 && !searching && (
          <p style={{ fontSize: 12, color: '#6b6b7a', marginBottom: 16 }}>
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
          </p>
        )}

        {/* Games grid */}
        {gamesLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <i className="ti ti-loader" style={{ fontSize: 32, animation: 'spin 1s linear infinite', color: '#6366f1' }} />
          </div>
        ) : displayGames.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b6b7a' }}>
            <p style={{ fontSize: 40, margin: '0 0 12px' }}>🎮</p>
            <p style={{ fontSize: 16, color: '#8b8ca8', margin: '0 0 6px' }}>
              {searchQuery ? 'No games found for "' + searchQuery + '"' : 'No upcoming games found'}
            </p>
            <p style={{ fontSize: 13 }}>Try searching for a specific game above.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {displayGames.map(function(game) {
                return (
                  <GameCard
                    key={game.rawgId}
                    game={game}
                    isAdded={isTracked(game.rawgId)}
                    isAdding={addingId === game.rawgId}
                    onAdd={handleAdd}
                    onRemove={handleRemove}
                  />
                );
              })}
            </div>

            {/* Load more — only for browse mode */}
            {!searchQuery && hasMore && (
              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <button
                  onClick={function() { loadRawgPage(page + 1); }}
                  style={{ padding: '10px 28px', borderRadius: 10, border: '0.5px solid #6366f155', background: '#6366f122', color: '#a5b4fc', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
