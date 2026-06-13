import { useState, useEffect, useRef } from 'react';

const API_URL      = import.meta.env.VITE_API_URL ?? '';
const GUILD_KEY    = 'dc_guild';
const FILTERS_KEY  = 'dc_game_filters';
const CALENDAR_URL = 'https://calendar.42p.uk';
const TODAY        = new Date();

const PLATFORM_OPTIONS = [
  { id: 'windows', name: 'PC' },
  { id: 'mac',     name: 'Mac' },
  { id: 'linux',   name: 'Linux' },
];

const TYPE_OPTIONS = [
  { value: 'all',          label: 'All games' },
  { value: 'coming_soon',  label: 'Coming soon' },
  { value: 'early_access', label: 'Early Access' },
];

const DEFAULT_FILTERS = {
  search:    '',
  platforms: [],
  type:      'all',
};

// ─── Helpers ─────────────────────────────────────────────────

async function apiFetch(method, path, body, guildId) {
  var headers = {};
  if (body)    headers['Content-Type'] = 'application/json';
  if (guildId) headers['X-Guild-ID']   = guildId;
  var res = await fetch(API_URL + path, {
    method, credentials: 'include', headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  var data = await res.json().catch(function() { return {}; });
  if (!res.ok) throw new Error(data.error || 'Request failed (' + res.status + ')');
  return data;
}

function parseReleaseDate(str) {
  if (!str) return null;
  var d = new Date(str);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function normalizeSteamApp(appid, data, meta) {
  var plats = data.platforms || {};
  var platformStr = [
    plats.windows && 'PC',
    plats.mac     && 'Mac',
    plats.linux   && 'Linux',
  ].filter(Boolean).join(' · ');

  var comingSoon  = !!(data.release_date && data.release_date.coming_soon);
  var releaseDate = comingSoon ? null : parseReleaseDate(data.release_date && data.release_date.date);

  // Steam genre id 70 = Early Access
  var isEarlyAccess = (data.genres || []).some(function(g) { return g.id === '70'; });
  var genres = (data.genres || [])
    .filter(function(g) { return g.id !== '70'; })
    .map(function(g) { return g.description; })
    .join(', ');

  var price = '';
  if (data.is_free) price = 'Free';
  else if (data.price_overview) price = data.price_overview.final_formatted;

  return {
    steamId:       String(appid),
    name:          data.name || '',
    coverUrl:      data.header_image || null,
    releaseDate,
    comingSoon,
    isEarlyAccess,
    genres,
    platforms:     platformStr,
    price,
    metascore:     (meta && meta.metascore) || null,
    steamUrl:      'https://store.steampowered.com/app/' + appid,
  };
}

function toggleItem(arr, id) {
  return arr.includes(id) ? arr.filter(function(x) { return x !== id; }) : arr.concat(id);
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

// ─── Multi-select chip group ──────────────────────────────────
function ChipGroup({ items, selected, onToggle }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {items.map(function(item) {
        var active = selected.includes(item.id);
        return (
          <button key={item.id} onClick={function() { onToggle(item.id); }}
            style={{ padding: '4px 10px', borderRadius: 20, border: active ? '0.5px solid #6366f1' : '0.5px solid #2a2b36', background: active ? '#6366f1' : '#1a1b22', color: active ? '#fff' : '#8b8ca8', fontSize: 11, fontWeight: active ? 600 : 400, cursor: 'pointer', transition: 'all 0.12s' }}>
            {item.name}
          </button>
        );
      })}
    </div>
  );
}

// ─── Filter panel ─────────────────────────────────────────────
function FilterPanel({ filters, onChange, onReset, resultCount, loading }) {
  var hasFilters = filters.platforms.length > 0 || filters.type !== 'all';

  return (
    <aside style={{ width: 220, flexShrink: 0, background: '#111116', borderRight: '0.5px solid #2a2b36', overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 18 }} className="scroll-thin">

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#e8e9f3' }}>Filters</p>
        {hasFilters && (
          <button onClick={onReset} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 11, padding: 0 }}>Reset all</button>
        )}
      </div>

      <p style={{ margin: 0, fontSize: 11, color: '#6b6b7a' }}>
        {loading ? 'Loading…' : resultCount.toLocaleString() + ' games'}
      </p>

      {/* Type */}
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#6b6b7a', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Type</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {TYPE_OPTIONS.map(function(opt) {
            var active = filters.type === opt.value;
            return (
              <button key={opt.value} onClick={function() { onChange({ type: opt.value }); }}
                style={{ padding: '6px 10px', borderRadius: 7, border: active ? '0.5px solid #6366f1' : '0.5px solid #2a2b36', background: active ? '#6366f122' : 'transparent', color: active ? '#a5b4fc' : '#8b8ca8', fontSize: 12, fontWeight: active ? 600 : 400, cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s' }}>
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Platforms */}
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#6b6b7a', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Platform {filters.platforms.length > 0 && <span style={{ color: '#6366f1' }}>({filters.platforms.length})</span>}
        </p>
        <ChipGroup items={PLATFORM_OPTIONS} selected={filters.platforms} onToggle={function(id) { onChange({ platforms: toggleItem(filters.platforms, id) }); }} />
      </div>

      {/* Steam link */}
      <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '0.5px solid #1e1f28' }}>
        <p style={{ margin: 0, fontSize: 10, color: '#3a3a52' }}>Powered by Steam</p>
      </div>
    </aside>
  );
}

// ─── Auth screen ──────────────────────────────────────────────
function AuthScreen() {
  var [busy,  setBusy]  = useState(false);
  var [error, setError] = useState('');
  useEffect(function() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('auth_error')) { window.history.replaceState({}, '', window.location.pathname); setError('Discord sign-in failed. Please try again.'); }
  }, []);
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 60% 20%, #2e1065 0%, #0f1015 60%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <div style={{ display: 'inline-block', marginBottom: 20 }}><Logo42p size={64} /></div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#f5f3ff', margin: '0 0 6px', letterSpacing: '-0.03em' }}>42p Games</h1>
        <p style={{ fontSize: 13, color: '#a78bfa', margin: '0 0 32px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Game Discovery</p>
        <div style={{ background: 'rgba(26,27,34,0.85)', border: '0.5px solid #3b1f6e', borderRadius: 20, padding: '2rem', backdropFilter: 'blur(12px)', boxShadow: '0 24px 64px rgba(124,58,237,0.2)' }}>
          <p style={{ fontSize: 13, color: '#8b8ca8', margin: '0 0 20px' }}>Sign in with Discord to browse games and add them to your server's calendar.</p>
          <button onClick={function() { setBusy(true); window.location.href = API_URL + '/auth/discord'; }} disabled={busy}
            style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: busy ? '#3a3d8a' : 'linear-gradient(135deg,#5865f2,#7c3aed)', color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: busy ? 'not-allowed' : 'pointer' }}>
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
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f1015', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#8b8ca8' }}>
      <i className="ti ti-loader" style={{ fontSize: 20, color: '#6366f1', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}`}</style>
    </div>
  );
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
                onMouseLeave={function(e) { e.currentTarget.style.background = '#1a1b22'; e.currentTarget.style.borderColor = '#2a2b36'; }}>
                {g.iconUrl
                  ? <img src={g.iconUrl} alt={g.name} style={{ width: 46, height: 46, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 46, height: 46, borderRadius: 14, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{g.name[0].toUpperCase()}</div>}
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e8e9f3', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</p>
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
  var releaseDate  = game.releaseDate ? new Date(game.releaseDate) : null;
  var daysUntil    = releaseDate ? Math.ceil((releaseDate - TODAY) / (1000 * 60 * 60 * 24)) : null;
  var [hoverRemove, setHoverRemove] = useState(false);

  var badgeLabel = null;
  var badgeBg    = '#6366f1';
  if (game.isEarlyAccess) { badgeLabel = 'Early Access'; badgeBg = '#0369a1'; }
  else if (game.comingSoon && !releaseDate) { badgeLabel = 'TBA'; badgeBg = '#7c3aed'; }
  else if (daysUntil !== null) {
    badgeLabel = daysUntil <= 0 ? 'OUT NOW' : daysUntil === 1 ? 'TOMORROW' : daysUntil + 'd';
    badgeBg    = daysUntil <= 0 ? '#16a34a' : daysUntil <= 7 ? '#ef4444' : daysUntil <= 30 ? '#f97316' : '#6366f1';
  }

  return (
    <div style={{ background: '#1a1b22', border: '0.5px solid #2a2b36', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.15s, border-color 0.15s', animation: 'fadeIn 0.3s ease' }}
      onMouseEnter={function(e) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#363748'; }}
      onMouseLeave={function(e) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#2a2b36'; }}>

      {/* Cover */}
      <div style={{ position: 'relative', paddingTop: '47%', background: '#111116', overflow: 'hidden' }}>
        {game.coverUrl
          ? <img src={game.coverUrl} alt={game.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, background: 'linear-gradient(135deg,#1e1f28,#2a1f4e)' }}>🎮</div>}

        {badgeLabel && (
          <div style={{ position: 'absolute', top: 8, right: 8, borderRadius: 8, padding: '4px 8px', fontSize: 11, fontWeight: 700, color: '#fff', background: badgeBg, boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
            {badgeLabel}
          </div>
        )}

        {game.metascore && (
          <div style={{ position: 'absolute', top: 8, left: 8, borderRadius: 6, padding: '3px 7px', fontSize: 10, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', gap: 3 }}>
            MC {game.metascore}
          </div>
        )}

        <a href={game.steamUrl} target="_blank" rel="noopener noreferrer"
          title="View on Steam" onClick={function(e) { e.stopPropagation(); }}
          style={{ position: 'absolute', bottom: 8, right: 8, width: 26, height: 26, borderRadius: 6, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, textDecoration: 'none' }}>
          🔗
        </a>
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#e8e9f3', lineHeight: 1.3 }}>{game.name}</p>
        <p style={{ margin: 0, fontSize: 12, color: releaseDate ? '#a78bfa' : '#6b6b7a', fontWeight: releaseDate ? 600 : 400 }}>
          {releaseDate
            ? releaseDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
            : (game.comingSoon ? 'Coming soon' : 'TBC')}
        </p>
        {game.genres && <p style={{ margin: 0, fontSize: 11, color: '#52536a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{game.genres}</p>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
          {game.platforms && <p style={{ margin: 0, fontSize: 10, color: '#3a3a52' }}>{game.platforms}</p>}
          {game.price && <p style={{ margin: 0, fontSize: 11, color: '#6b6b7a', fontWeight: 600 }}>{game.price}</p>}
        </div>
      </div>

      {/* Action */}
      <div style={{ padding: '0 14px 12px' }}>
        {isAdded ? (
          <button
            onClick={function() { onRemove(game); }}
            onMouseEnter={function() { setHoverRemove(true); }}
            onMouseLeave={function() { setHoverRemove(false); }}
            style={{ width: '100%', padding: '7px', borderRadius: 8, border: hoverRemove ? '0.5px solid #ff555544' : '0.5px solid #16a34a55', background: hoverRemove ? '#ff000015' : '#16a34a15', color: hoverRemove ? '#ff7070' : '#86efac', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all 0.15s' }}>
            {hoverRemove ? <><i className="ti ti-x" style={{ fontSize: 12 }} />Remove</> : <><i className="ti ti-check" style={{ fontSize: 12 }} />Added to calendar</>}
          </button>
        ) : (
          <button onClick={function() { onAdd(game); }} disabled={isAdding}
            style={{ width: '100%', padding: '7px', borderRadius: 8, border: 'none', background: isAdding ? '#3730a3' : '#6366f1', color: '#fff', cursor: isAdding ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'background 0.15s' }}>
            {isAdding
              ? <><i className="ti ti-loader" style={{ fontSize: 12, animation: 'spin 1s linear infinite' }} />Adding…</>
              : <><i className="ti ti-calendar-plus" style={{ fontSize: 12 }} />Add to calendar</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Mobile filter sheet ─────────────────────────────────────
function MobileFilterSheet({ filters, onChange, onReset, onClose, resultCount, loading }) {
  var hasFilters = filters.platforms.length > 0 || filters.type !== 'all';

  var S = {
    overlay: { position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' },
    sheet:   { position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 900, background: '#111116', borderRadius: '20px 20px 0 0', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 40px rgba(0,0,0,0.5)' },
    pill:    { width: 36, height: 4, borderRadius: 99, background: '#2a2b36', margin: '12px auto 0' },
    hdr:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px 10px' },
    body:    { overflowY: 'auto', padding: '0 18px 24px', display: 'flex', flexDirection: 'column', gap: 20 },
    label:   { margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#6b6b7a', textTransform: 'uppercase', letterSpacing: '0.07em' },
    done:    { margin: '8px 18px 16px', height: 48, borderRadius: 14, background: '#6366f1', color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer' },
  };

  return (
    <>
      <div style={S.overlay} onClick={onClose} />
      <div style={S.sheet}>
        <div style={S.pill} />
        <div style={S.hdr}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#e8e9f3' }}>Filters</span>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#52536a' }}>
              {loading ? 'Loading…' : resultCount.toLocaleString() + ' games'}
            </span>
            {hasFilters && <button onClick={onReset} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 12, cursor: 'pointer', padding: 0, fontWeight: 600 }}>Reset</button>}
          </div>
        </div>

        <div style={S.body}>
          {/* Type */}
          <div>
            <p style={S.label}>Type</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TYPE_OPTIONS.map(function(opt) {
                var active = filters.type === opt.value;
                return (
                  <button key={opt.value} onClick={function() { onChange({ type: opt.value }); }}
                    style={{ padding: '6px 12px', borderRadius: 99, border: active ? '0.5px solid #6366f1' : '0.5px solid #2a2b36', background: active ? '#6366f1' : '#1a1b22', color: active ? '#fff' : '#8b8ca8', fontSize: 12, fontWeight: active ? 700 : 400, cursor: 'pointer' }}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Platforms */}
          <div>
            <p style={S.label}>Platform {filters.platforms.length > 0 && <span style={{ color: '#6366f1' }}>({filters.platforms.length})</span>}</p>
            <ChipGroup items={PLATFORM_OPTIONS} selected={filters.platforms} onToggle={function(id) { onChange({ platforms: toggleItem(filters.platforms, id) }); }} />
          </div>
        </div>

        <button style={S.done} onClick={onClose}>Done</button>
      </div>
    </>
  );
}

// ─── Mobile game card (compact) ──────────────────────────────
function MobileGameCard({ game, isAdded, isAdding, onAdd, onRemove }) {
  var releaseDate = game.releaseDate ? new Date(game.releaseDate) : null;
  var daysUntil   = releaseDate ? Math.ceil((releaseDate - TODAY) / (1000 * 60 * 60 * 24)) : null;
  var [hoverRemove, setHoverRemove] = useState(false);

  var badgeLabel = null;
  var badgeBg    = '#6366f1';
  if (game.isEarlyAccess) { badgeLabel = 'EA'; badgeBg = '#0369a1'; }
  else if (game.comingSoon && !releaseDate) { badgeLabel = 'TBA'; badgeBg = '#7c3aed'; }
  else if (daysUntil !== null) {
    badgeLabel = daysUntil <= 0 ? 'OUT' : daysUntil === 1 ? 'TMW' : daysUntil + 'd';
    badgeBg    = daysUntil <= 0 ? '#16a34a' : daysUntil <= 7 ? '#ef4444' : daysUntil <= 30 ? '#f97316' : '#6366f1';
  }

  return (
    <div style={{ background: '#1a1b22', border: '0.5px solid #2a2b36', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', paddingTop: '47%', background: '#111116' }}>
        {game.coverUrl
          ? <img src={game.coverUrl} alt={game.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, background: 'linear-gradient(135deg,#1e1f28,#2a1f4e)' }}>🎮</div>}
        {badgeLabel && (
          <div style={{ position: 'absolute', top: 6, right: 6, borderRadius: 6, padding: '3px 7px', fontSize: 10, fontWeight: 700, color: '#fff', background: badgeBg }}>
            {badgeLabel}
          </div>
        )}
        {game.metascore && (
          <div style={{ position: 'absolute', top: 6, left: 6, borderRadius: 5, padding: '2px 6px', fontSize: 10, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.75)' }}>
            MC {game.metascore}
          </div>
        )}
      </div>

      <div style={{ padding: '10px 10px 4px', flex: 1 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 12, color: '#e8e9f3', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{game.name}</p>
        <p style={{ margin: '3px 0 0', fontSize: 10, color: releaseDate ? '#a78bfa' : '#52536a', fontWeight: releaseDate ? 600 : 400 }}>
          {releaseDate ? releaseDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : (game.comingSoon ? 'Coming soon' : 'TBC')}
        </p>
        {game.price && <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6b6b7a' }}>{game.price}</p>}
      </div>

      <div style={{ padding: '6px 10px 10px' }}>
        {isAdded ? (
          <button
            onClick={function() { onRemove(game); }}
            onMouseEnter={function() { setHoverRemove(true); }}
            onMouseLeave={function() { setHoverRemove(false); }}
            style={{ width: '100%', padding: '6px', borderRadius: 8, border: hoverRemove ? '0.5px solid #ff555544' : '0.5px solid #16a34a55', background: hoverRemove ? '#ff000015' : '#16a34a15', color: hoverRemove ? '#ff7070' : '#86efac', cursor: 'pointer', fontSize: 11, fontWeight: 600, transition: 'all 0.15s' }}>
            {hoverRemove ? '✕ Remove' : '✓ Added'}
          </button>
        ) : (
          <button onClick={function() { onAdd(game); }} disabled={isAdding}
            style={{ width: '100%', padding: '6px', borderRadius: 8, border: 'none', background: isAdding ? '#3730a3' : '#6366f1', color: '#fff', cursor: isAdding ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700, transition: 'background 0.15s' }}>
            {isAdding ? '…' : '＋ Add to calendar'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────
export default function App() {
  var [screen,        setScreen]        = useState('loading');
  var [user,          setUser]          = useState(null);
  var [guilds,        setGuilds]        = useState([]);
  var [guildsLoading, setGuildsLoading] = useState(false);
  var [guildsError,   setGuildsError]   = useState('');
  var [currentGuild,  setCurrentGuild]  = useState(null);

  var [games,         setGames]         = useState([]);
  var [trackedGames,  setTrackedGames]  = useState([]);
  var [gamesLoading,  setGamesLoading]  = useState(false);
  var [totalCount,    setTotalCount]    = useState(0);
  var [addingId,      setAddingId]      = useState(null);

  var [filters, setFilters] = useState(function() {
    try { return Object.assign({}, DEFAULT_FILTERS, JSON.parse(localStorage.getItem(FILTERS_KEY))); }
    catch (e) { return DEFAULT_FILTERS; }
  });

  var [mobileFilterSheet, setMobileFilterSheet] = useState(false);
  var [isMobile,          setIsMobile]          = useState(function() { return window.innerWidth < 768; });
  var fetchTimeout = useRef(null);

  useEffect(function() {
    function onResize() { setIsMobile(window.innerWidth < 768); }
    window.addEventListener('resize', onResize);
    return function() { window.removeEventListener('resize', onResize); };
  }, []);

  // Bootstrap
  useEffect(function() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') window.history.replaceState({}, '', window.location.pathname);
    apiFetch('GET', '/auth/me')
      .then(function(u) {
        setUser(u);
        var saved = null;
        try { saved = JSON.parse(localStorage.getItem(GUILD_KEY)); } catch (e) {}
        if (saved) loadGamesForGuild(saved);
        else loadGuilds();
      })
      .catch(function() { setScreen('auth'); });
  }, []);

  // Auto-refresh tracked games list every 60 seconds
  useEffect(function() {
    if (screen !== 'games' || !currentGuild) return;
    var gId = currentGuild.id;
    var refreshing = false;
    async function refreshTracked() {
      if (document.visibilityState !== 'visible' || refreshing) return;
      refreshing = true;
      try {
        var tracked = await apiFetch('GET', '/api/games', null, gId);
        setTrackedGames(tracked);
      } catch (e) { /* silent */ }
      finally { refreshing = false; }
    }
    var id = setInterval(refreshTracked, 60000);
    document.addEventListener('visibilitychange', refreshTracked);
    return function() {
      clearInterval(id);
      document.removeEventListener('visibilitychange', refreshTracked);
    };
  }, [screen, currentGuild]);

  // Refetch when filters change — debounce search, instant for other changes
  useEffect(function() {
    if (screen !== 'games' || !currentGuild) return;
    localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
    clearTimeout(fetchTimeout.current);
    var delay = (filters.search && filters.search.length > 0) ? 600 : 0;
    fetchTimeout.current = setTimeout(function() { fetchGames(filters); }, delay);
  }, [filters, screen]);

  async function loadGuilds() {
    setGuildsLoading(true); setGuildsError(''); setScreen('guild-pick');
    try { var g = await apiFetch('GET', '/api/guilds'); setGuilds(g); }
    catch (err) { setGuildsError(err.message); }
    finally { setGuildsLoading(false); }
  }

  async function loadGamesForGuild(guild) {
    setCurrentGuild(guild);
    localStorage.setItem(GUILD_KEY, JSON.stringify(guild));
    setScreen('games');
    setGamesLoading(true);
    try {
      var tracked = await apiFetch('GET', '/api/games', null, guild.id);
      setTrackedGames(tracked);
    } catch (err) { console.error('Failed to load tracked games:', err.message); }
    await fetchGames(filters, guild.id);
    setGamesLoading(false);
  }

  async function fetchGames(f, guildOverride) {
    var gId = guildOverride || (currentGuild && currentGuild.id);
    setGamesLoading(true);
    try {
      var rawItems = [];
      var metaMap  = {};

      if (f.search && f.search.trim().length >= 2) {
        // Search via Steam storesearch
        var searchData = await apiFetch('GET', '/api/steam/search?term=' + encodeURIComponent(f.search.trim()), null, gId);
        var items = (searchData.items || []).filter(function(i) { return i.type === 'app'; });
        items.forEach(function(item) {
          rawItems.push(String(item.id));
          metaMap[String(item.id)] = item;
        });
      } else {
        // Default: Steam featured coming soon
        var featured = await apiFetch('GET', '/api/steam/featured', null, gId);
        var csItems = ((featured.coming_soon && featured.coming_soon.items) || []).slice(0, 24);
        csItems.forEach(function(item) {
          rawItems.push(String(item.id));
          metaMap[String(item.id)] = {
            metascore: null,
            platforms: { windows: item.windows_available, mac: item.mac_available, linux: item.linux_available },
          };
        });
      }

      if (!rawItems.length) {
        setGames([]); setTotalCount(0); setGamesLoading(false); return;
      }

      // Batch appdetails for full game info
      var detailsMap = await apiFetch('GET', '/api/steam/details?appids=' + rawItems.join(','), null, gId);

      var games = [];
      rawItems.forEach(function(id) {
        var entry = detailsMap[id];
        if (!entry || !entry.success || !entry.data) return;
        var data = entry.data;
        // Skip non-games (DLC, soundtracks, etc.)
        if (data.type && data.type !== 'game') return;

        var game = normalizeSteamApp(id, data, metaMap[id]);

        // Apply type filter
        if (f.type === 'coming_soon'  && !game.comingSoon)  return;
        if (f.type === 'early_access' && !game.isEarlyAccess) return;

        // Apply platform filter
        if (f.platforms.length) {
          var plats = data.platforms || {};
          if (!f.platforms.some(function(p) { return plats[p]; })) return;
        }

        games.push(game);
      });

      setGames(games);
      setTotalCount(games.length);
    } catch (err) {
      console.error('fetchGames failed:', err.message);
    } finally {
      setGamesLoading(false);
    }
  }

  function updateFilters(patch) {
    setFilters(function(prev) { return Object.assign({}, prev, patch); });
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    localStorage.removeItem(FILTERS_KEY);
  }

  function handleGuildSelect(guild) {
    setGames([]); setTrackedGames([]);
    loadGamesForGuild(guild);
  }

  async function handleAdd(game) {
    setAddingId(game.steamId);
    try {
      var saved = await apiFetch('POST', '/api/games', {
        rawgId:      game.steamId,
        name:        game.name,
        releaseDate: game.releaseDate,
        coverUrl:    game.coverUrl,
        platforms:   game.platforms,
        steamUrl:    game.steamUrl,
      }, currentGuild.id);
      setTrackedGames(function(prev) { return prev.concat(saved); });
    } catch (err) { alert(err.message); }
    finally { setAddingId(null); }
  }

  async function handleRemove(game) {
    var tracked = trackedGames.find(function(g) { return g.rawgId === game.steamId; });
    if (!tracked) return;
    try {
      await apiFetch('DELETE', '/api/games/' + tracked.id, null, currentGuild.id);
      setTrackedGames(function(prev) { return prev.filter(function(g) { return g.id !== tracked.id; }); });
    } catch (err) { alert(err.message); }
  }

  function isTracked(steamId) { return trackedGames.some(function(g) { return g.rawgId === steamId; }); }

  // ── Screens ───────────────────────────────────────────────
  if (screen === 'loading') return (
    <div style={{ minHeight: '100vh', background: '#0f1015', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#8b8ca8' }}>
      <i className="ti ti-loader" style={{ fontSize: 20, color: '#6366f1', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}`}</style>
    </div>
  );
  if (screen === 'auth')       return <AuthScreen />;
  if (screen === 'guild-pick') return <GuildPicker guilds={guilds} loading={guildsLoading} error={guildsError} onSelect={handleGuildSelect} />;

  var activeFilterCount = filters.platforms.length + (filters.type !== 'all' ? 1 : 0);

  // ── Mobile layout ─────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ minHeight: '100dvh', background: '#0f1015', display: 'flex', flexDirection: 'column', color: '#e8e9f3', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
        <style>{`
          @keyframes spin { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
          @keyframes fadeIn { from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:translateY(0);} }
          .mob-game-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; padding: 0 12px 24px; }
        `}</style>

        <header style={{ position: 'sticky', top: 0, zIndex: 100, background: '#111116', borderBottom: '0.5px solid #2a2b36', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo42p size={28} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#f5f3ff', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>42p Games</p>
            <p style={{ margin: 0, fontSize: 9, color: '#6b6b7a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentGuild ? currentGuild.name : 'No server'}</p>
          </div>
          <button onClick={function() { setMobileFilterSheet(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 10, border: activeFilterCount > 0 ? '0.5px solid #6366f1' : '0.5px solid #2a2b36', background: activeFilterCount > 0 ? '#6366f122' : 'transparent', color: activeFilterCount > 0 ? '#a5b4fc' : '#8b8ca8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ⚙ Filters{activeFilterCount > 0 ? ' (' + activeFilterCount + ')' : ''}
          </button>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            {user && (user.avatar || (user.name && user.name[0].toUpperCase()))}
          </div>
        </header>

        {/* Search bar */}
        <div style={{ padding: '10px 12px 6px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', color: '#6b6b7a', fontSize: 15, pointerEvents: 'none' }}>🔍</span>
          <input
            value={filters.search}
            onChange={function(e) { updateFilters({ search: e.target.value }); }}
            placeholder="Search Steam…"
            style={{ width: '100%', boxSizing: 'border-box', background: '#1a1b22', border: '0.5px solid #3a3a42', borderRadius: 12, color: '#e8e9f3', padding: '11px 36px 11px 40px', fontSize: 14, outline: 'none' }}
          />
          {filters.search && (
            <button onClick={function() { updateFilters({ search: '' }); }}
              style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b6b7a', cursor: 'pointer', fontSize: 16, padding: 0 }}>✕</button>
          )}
        </div>

        {/* Quick type chip strip */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '4px 12px 10px', scrollbarWidth: 'none' }}>
          {TYPE_OPTIONS.map(function(opt) {
            var active = filters.type === opt.value;
            return (
              <button key={opt.value} onClick={function() { updateFilters({ type: opt.value }); }}
                style={{ flex: 'none', padding: '5px 12px', borderRadius: 99, border: active ? '0.5px solid #6366f1' : '0.5px solid #2a2b36', background: active ? '#6366f1' : '#1a1b22', color: active ? '#fff' : '#8b8ca8', fontSize: 11, fontWeight: active ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Result count */}
        <div style={{ padding: '0 14px 8px', fontSize: 11, color: '#52536a' }}>
          {gamesLoading ? 'Loading…' : totalCount.toLocaleString() + ' games'}
        </div>

        {/* Games grid */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {gamesLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 10, color: '#8b8ca8' }}>
              <i className="ti ti-loader" style={{ fontSize: 24, animation: 'spin 1s linear infinite', color: '#6366f1' }} /> Loading…
            </div>
          ) : games.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#6b6b7a' }}>
              <p style={{ fontSize: 36, margin: '0 0 10px' }}>🎮</p>
              <p style={{ fontSize: 15, color: '#8b8ca8', margin: '0 0 6px' }}>
                {filters.search ? 'No results for "' + filters.search + '"' : 'No games found'}
              </p>
              <p style={{ fontSize: 12 }}>{filters.search ? 'Try a different search term.' : 'Try adjusting the filters.'}</p>
              {activeFilterCount > 0 && <button onClick={resetFilters} style={{ marginTop: 12, padding: '8px 18px', borderRadius: 9, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Reset filters</button>}
            </div>
          ) : (
            <div className="mob-game-grid">
              {games.map(function(game) {
                return (
                  <MobileGameCard key={game.steamId} game={game}
                    isAdded={isTracked(game.steamId)}
                    isAdding={addingId === game.steamId}
                    onAdd={handleAdd} onRemove={handleRemove} />
                );
              })}
            </div>
          )}
        </div>

        {mobileFilterSheet && (
          <MobileFilterSheet
            filters={filters}
            onChange={updateFilters}
            onReset={function() { resetFilters(); setMobileFilterSheet(false); }}
            onClose={function() { setMobileFilterSheet(false); }}
            resultCount={totalCount}
            loading={gamesLoading}
          />
        )}
      </div>
    );
  }

  // ── Desktop layout ────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0f1015', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes spin   { from{transform:rotate(0deg);}  to{transform:rotate(360deg);} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:translateY(0);} }
        .scroll-thin::-webkit-scrollbar{width:5px;}
        .scroll-thin::-webkit-scrollbar-track{background:#111116;}
        .scroll-thin::-webkit-scrollbar-thumb{background:#2a2b36;border-radius:99px;}
      `}</style>

      <header style={{ background: '#111116', borderBottom: '0.5px solid #2a2b36', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo42p size={34} />
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#f5f3ff', letterSpacing: '-0.02em' }}>42p Games</p>
            <p style={{ margin: 0, fontSize: 10, color: '#6b6b7a' }}>Powered by Steam</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={loadGuilds}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 9, border: '0.5px solid #2a2b36', background: 'transparent', cursor: 'pointer', color: '#8b8ca8', fontSize: 12 }}>
            {currentGuild && currentGuild.iconUrl
              ? <img src={currentGuild.iconUrl} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'cover' }} />
              : <div style={{ width: 18, height: 18, borderRadius: 4, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>{currentGuild && currentGuild.name[0].toUpperCase()}</div>}
            <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentGuild && currentGuild.name}</span>
            <i className="ti ti-chevron-down" style={{ fontSize: 11 }} />
          </button>

          <a href={CALENDAR_URL} style={{ padding: '7px 14px', borderRadius: 9, border: '0.5px solid #2a2b36', background: 'transparent', color: '#8b8ca8', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-calendar-event" style={{ fontSize: 14 }} />Calendar
          </a>

          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 9, background: '#6366f115', border: '0.5px solid #6366f133' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
              {user && (user.avatar || (user.name && user.name[0].toUpperCase()))}
            </div>
            <span style={{ fontSize: 12, color: '#a5b4fc', fontWeight: 600 }}>@{user && user.username}</span>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <FilterPanel
          filters={filters}
          onChange={updateFilters}
          onReset={resetFilters}
          resultCount={totalCount}
          loading={gamesLoading}
        />

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }} className="scroll-thin">

          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6b6b7a', fontSize: 16, pointerEvents: 'none' }} />
            <input
              value={filters.search}
              onChange={function(e) { updateFilters({ search: e.target.value }); }}
              placeholder="Search Steam…"
              style={{ width: '100%', boxSizing: 'border-box', background: '#1a1b22', border: '0.5px solid #3a3a42', borderRadius: 12, color: '#e8e9f3', padding: '12px 14px 12px 42px', fontSize: 14, outline: 'none' }}
            />
            {filters.search && (
              <button onClick={function() { updateFilters({ search: '' }); }}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b6b7a', cursor: 'pointer', fontSize: 16, padding: 0 }}>✕</button>
            )}
          </div>

          {/* Active filter summary */}
          {activeFilterCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#6b6b7a' }}>Active filters:</span>
              {filters.type !== 'all' && (
                <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: '#6366f133', color: '#a5b4fc', border: '0.5px solid #6366f155' }}>
                  {TYPE_OPTIONS.find(function(o) { return o.value === filters.type; })?.label}
                </span>
              )}
              {filters.platforms.map(function(id) {
                var p = PLATFORM_OPTIONS.find(function(x) { return x.id === id; });
                return p ? <span key={id} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: '#0e7490', color: '#a5f3fc', border: '0.5px solid #06b6d455' }}>{p.name}</span> : null;
              })}
              <button onClick={resetFilters} style={{ fontSize: 11, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 4 }}>Clear all</button>
            </div>
          )}

          {/* Games grid */}
          {gamesLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <i className="ti ti-loader" style={{ fontSize: 32, animation: 'spin 1s linear infinite', color: '#6366f1' }} />
            </div>
          ) : games.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b6b7a' }}>
              <p style={{ fontSize: 40, margin: '0 0 12px' }}>🎮</p>
              <p style={{ fontSize: 16, color: '#8b8ca8', margin: '0 0 6px' }}>
                {filters.search ? 'No results for "' + filters.search + '"' : 'No games found'}
              </p>
              <p style={{ fontSize: 13 }}>{filters.search ? 'Try a different search term.' : 'Try adjusting the filters.'}</p>
              {activeFilterCount > 0 && <button onClick={resetFilters} style={{ marginTop: 12, padding: '8px 18px', borderRadius: 9, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Reset filters</button>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14 }}>
              {games.map(function(game) {
                return (
                  <GameCard key={game.steamId} game={game}
                    isAdded={isTracked(game.steamId)}
                    isAdding={addingId === game.steamId}
                    onAdd={handleAdd} onRemove={handleRemove} />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
