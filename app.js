'use strict';
/* =====================================================================
   ASSEMBLEIA MUNDIAL — jogo textual (1992 em diante)
   Site 100% estático (GitHub Pages) + Firebase Firestore como banco.
   Sem Firebase configurado, roda em modo local (apenas para testes).
   ===================================================================== */

/* ---------- Configuração do jogo ---------- */
const MAX_TURNS = 25;
const N_INTERNAS = 10;
const N_EXTERNAS = 5;
const MAX_CHARS = 2000;
const ADMIN_USERS = ['mosca', 'vini', 'lucas', 'mathlos', 'toko'];
const ADMIN_PASS = '1234';

/* ---------- Países em 1º de janeiro de 1992 (código da bandeira|nome) ----------
   Para adicionar/remover um país basta editar esta lista.
   Códigos 'cs' e 'yu' têm bandeiras históricas desenhadas abaixo.            */
const COUNTRIES_RAW = `
af|Afeganistão
za|África do Sul
al|Albânia
de|Alemanha
ad|Andorra
ao|Angola
ag|Antígua e Barbuda
sa|Arábia Saudita
dz|Argélia
ar|Argentina
am|Armênia
au|Austrália
at|Áustria
az|Azerbaijão
bs|Bahamas
bh|Bahrein
bd|Bangladesh
bb|Barbados
by|Bielorrússia
be|Bélgica
bz|Belize
bj|Benim
bt|Butão
bo|Bolívia
ba|Bósnia e Herzegovina
bw|Botsuana
br|Brasil
bn|Brunei
bg|Bulgária
bf|Burkina Faso
bi|Burundi
cv|Cabo Verde
cm|Camarões
kh|Camboja
ca|Canadá
qa|Catar
kz|Cazaquistão
td|Chade
cl|Chile
cn|China
cy|Chipre
co|Colômbia
km|Comores
cg|Congo
kp|Coreia do Norte
kr|Coreia do Sul
ci|Costa do Marfim
cr|Costa Rica
hr|Croácia
cu|Cuba
dk|Dinamarca
dj|Djibuti
dm|Dominica
eg|Egito
sv|El Salvador
ae|Emirados Árabes Unidos
ec|Equador
si|Eslovênia
es|Espanha
us|Estados Unidos
ee|Estônia
et|Etiópia
fj|Fiji
ph|Filipinas
fi|Finlândia
fr|França
ga|Gabão
gm|Gâmbia
gh|Gana
ge|Geórgia
gd|Granada
gr|Grécia
gt|Guatemala
gy|Guiana
gn|Guiné
gq|Guiné Equatorial
gw|Guiné-Bissau
ht|Haiti
hn|Honduras
hu|Hungria
ye|Iêmen
mh|Ilhas Marshall
sb|Ilhas Salomão
in|Índia
id|Indonésia
ir|Irã
iq|Iraque
ie|Irlanda
is|Islândia
il|Israel
it|Itália
yu|Iugoslávia (Sérvia e Montenegro)
jm|Jamaica
jp|Japão
jo|Jordânia
ki|Kiribati
kw|Kuwait
la|Laos
ls|Lesoto
lv|Letônia
lb|Líbano
lr|Libéria
ly|Líbia
li|Liechtenstein
lt|Lituânia
lu|Luxemburgo
mk|Macedônia
mg|Madagascar
my|Malásia
mw|Malawi
mv|Maldivas
ml|Mali
mt|Malta
ma|Marrocos
mu|Maurício
mr|Mauritânia
mx|México
mm|Mianmar
fm|Micronésia
mz|Moçambique
md|Moldávia
mc|Mônaco
mn|Mongólia
na|Namíbia
nr|Nauru
np|Nepal
ni|Nicarágua
ne|Níger
ng|Nigéria
no|Noruega
nz|Nova Zelândia
om|Omã
nl|Países Baixos
ps|Palestina
pa|Panamá
pg|Papua-Nova Guiné
pk|Paquistão
py|Paraguai
pe|Peru
pl|Polônia
pt|Portugal
ke|Quênia
kg|Quirguistão
gb|Reino Unido
cf|República Centro-Africana
do|República Dominicana
ro|Romênia
rw|Ruanda
ru|Rússia
ws|Samoa
sm|San Marino
lc|Santa Lúcia
kn|São Cristóvão e Névis
st|São Tomé e Príncipe
vc|São Vicente e Granadinas
sc|Seicheles
sn|Senegal
sl|Serra Leoa
sg|Singapura
sy|Síria
so|Somália
lk|Sri Lanka
sz|Suazilândia
sd|Sudão
se|Suécia
ch|Suíça
sr|Suriname
tj|Tadjiquistão
th|Tailândia
tw|Taiwan
tz|Tanzânia
cs|Tchecoslováquia
tg|Togo
to|Tonga
tt|Trinidad e Tobago
tn|Tunísia
tm|Turcomenistão
tr|Turquia
tv|Tuvalu
ua|Ucrânia
ug|Uganda
uy|Uruguai
uz|Uzbequistão
vu|Vanuatu
va|Vaticano
ve|Venezuela
vn|Vietnã
cd|Zaire
zm|Zâmbia
zw|Zimbábue
`;

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });
const COUNTRIES = COUNTRIES_RAW.trim().split('\n')
  .map(l => { const [code, name] = l.split('|'); return { code: code.trim(), name: name.trim() }; })
  .sort((a, b) => collator.compare(a.name, b.name));
const BY_CODE = Object.fromEntries(COUNTRIES.map(c => [c.code, c]));

/* Bandeiras históricas (SVG embutido) */
const svgUri = s => 'data:image/svg+xml;utf8,' + encodeURIComponent(s);
const FLAG_OVERRIDE = {
  cs: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="30" fill="#fff"/><rect y="30" width="90" height="30" fill="#d7141a"/><path d="M0 0L45 30L0 60z" fill="#11457e"/></svg>'),
  yu: svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="20" fill="#0c4076"/><rect y="20" width="90" height="20" fill="#fff"/><rect y="40" width="90" height="20" fill="#c6363c"/></svg>')
};
const flagSrc = (code, w = 80) => FLAG_OVERRIDE[code] || `https://flagcdn.com/w${w}/${code}.png`;

/* ---------- Utilidades ---------- */
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  kids.flat(Infinity).forEach(c => {
    if (c == null || c === false) return;
    e.append(c.nodeType ? c : document.createTextNode(String(c)));
  });
  return e;
}
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const fmtDate = ts => new Date(ts).toLocaleString('pt-BR');
const fmtNum = n => Number(n).toLocaleString('pt-BR');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const turnYears = n => [1992 + 2 * (n - 1), 1993 + 2 * (n - 1)];
const turnLabel = n => { const [a, b] = turnYears(n); return `Turno ${n} - ${a}/${b}`; };

function flagImg(code, small) {
  const c = BY_CODE[code];
  return h('img', {
    class: 'flag' + (small ? ' sm' : ''),
    src: flagSrc(code, 80),
    srcset: FLAG_OVERRIDE[code] ? null : `${flagSrc(code, 160)} 2x`,
    alt: c ? `Bandeira: ${c.name}` : '',
    loading: 'lazy',
    onerror: e => { e.target.style.visibility = 'hidden'; }
  });
}

function toast(msg) {
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 3500);
}

async function hashPass(pass, salt) {
  const str = `${salt}::${pass}`;
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Plano B (página aberta fora de https/localhost)
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 'f' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

/* ---------- Camada de dados ---------- */
function makeFirebaseAdapter(cfg) {
  firebase.initializeApp(cfg);
  const fs = firebase.firestore();
  return {
    mode: 'firebase',
    async getDoc(c, id) { const s = await fs.collection(c).doc(id).get(); return s.exists ? s.data() : null; },
    async setDoc(c, id, d) { await fs.collection(c).doc(id).set(d, { merge: true }); },
    async query(c, f, v) {
      const s = await fs.collection(c).where(f, '==', v).get();
      return s.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    onDoc(c, id, cb) { return fs.collection(c).doc(id).onSnapshot(s => cb(s.exists ? s.data() : null)); },
    onCol(c, cb, f, v) {
      let q = fs.collection(c);
      if (f) q = q.where(f, '==', v);
      return q.onSnapshot(s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    },
    createIfAbsent(c, id, d) {
      return fs.runTransaction(async t => {
        const ref = fs.collection(c).doc(id);
        const s = await t.get(ref);
        if (s.exists) return false;
        t.set(ref, d);
        return true;
      });
    }
  };
}

function makeLocalAdapter() {
  const KEY = 'ag_localdb';
  const subs = new Set();
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const notify = () => subs.forEach(f => f());
  const save = d => { localStorage.setItem(KEY, JSON.stringify(d)); notify(); };
  window.addEventListener('storage', e => { if (e.key === KEY) notify(); });
  const list = (c, f, v) => Object.entries(load()[c] || {})
    .map(([id, d]) => ({ id, ...d })).filter(d => !f || d[f] === v);
  return {
    mode: 'local',
    async getDoc(c, id) { return (load()[c] || {})[id] || null; },
    async setDoc(c, id, d) {
      const db = load(); db[c] = db[c] || {};
      db[c][id] = { ...(db[c][id] || {}), ...d }; save(db);
    },
    async query(c, f, v) { return list(c, f, v); },
    onDoc(c, id, cb) {
      const f = () => cb((load()[c] || {})[id] || null);
      subs.add(f); setTimeout(f, 0); return () => subs.delete(f);
    },
    onCol(c, cb, f, v) {
      const fn = () => cb(list(c, f, v));
      subs.add(fn); setTimeout(fn, 0); return () => subs.delete(fn);
    },
    async createIfAbsent(c, id, d) {
      const db = load(); db[c] = db[c] || {};
      if (db[c][id]) return false;
      db[c][id] = d; save(db); return true;
    }
  };
}

/* ---------- Estado ---------- */
const S = {
  db: null, mode: 'local',
  session: null,            // {role:'admin',name} | {role:'player',countryId}
  players: [],
  currentTurn: 1,
  view: 'home',
  selCountry: null,
  viewTurn: 1,
  section: 'acoes',
  sub: 'meu',
  liveUnsub: null,
  refreshGrid: null, refreshTurnBar: null, refreshAdminPlayers: null, refreshAdminTurn: null
};

const myPlayer = () => S.session && S.session.role === 'player'
  ? S.players.find(p => p.countryId === S.session.countryId) : null;

function cleanupLive() { if (S.liveUnsub) { S.liveUnsub(); S.liveUnsub = null; } }
function persistSession() { localStorage.setItem('ag_session', JSON.stringify(S.session)); }
function logout() {
  S.session = null; localStorage.removeItem('ag_session'); go('home');
}
function go(view) { S.view = view; render(); }

/* ---------- Boot ---------- */
async function boot() {
  const cfg = window.FIREBASE_CONFIG;
  if (cfg && typeof firebase !== 'undefined') {
    try { S.db = makeFirebaseAdapter(cfg); S.mode = 'firebase'; }
    catch (e) { console.error(e); S.db = makeLocalAdapter(); S.mode = 'local'; }
  } else {
    S.db = makeLocalAdapter(); S.mode = 'local';
  }

  let firstPlayers; const ready = new Promise(r => { firstPlayers = r; });
  S.db.onCol('players', list => { S.players = list; onPlayersChanged(); firstPlayers(); });
  S.db.onDoc('meta', 'game', d => { S.currentTurn = (d && d.currentTurn) || 1; onTurnChanged(); });
  await Promise.race([ready, new Promise(r => setTimeout(r, 8000))]);

  try { S.session = JSON.parse(localStorage.getItem('ag_session')); } catch { S.session = null; }
  if (S.session && S.session.role === 'admin') S.view = 'admin';
  else if (S.session && S.session.role === 'player') { S.view = 'game'; S.viewTurn = S.currentTurn; }
  render();
}

function onPlayersChanged() {
  if (S.session && S.session.role === 'player' && S.players.length && !myPlayer()) {
    toast('Sua conta não foi encontrada. Faça login novamente.');
    logout(); return;
  }
  if (S.view === 'home' && S.refreshGrid) S.refreshGrid();
  if (S.view === 'admin' && S.refreshAdminPlayers) S.refreshAdminPlayers();
}

function onTurnChanged() {
  if (S.view === 'game') {
    if (S.viewTurn > S.currentTurn) { S.viewTurn = S.currentTurn; render(); }
    else if (S.refreshTurnBar) S.refreshTurnBar();
  }
  if (S.view === 'admin' && S.refreshAdminTurn) S.refreshAdminTurn();
}

/* ---------- Render raiz ---------- */
function render() {
  cleanupLive();
  S.refreshGrid = S.refreshTurnBar = S.refreshAdminPlayers = S.refreshAdminTurn = null;
  const views = { home: viewHome, login: viewLogin, register: viewRegister, game: viewGame, admin: viewAdmin };
  const app = document.getElementById('app');
  app.replaceChildren(
    header(),
    S.mode === 'local' ? h('div', { class: 'banner' },
      'Modo local de teste: os dados ficam só neste navegador. Configure o Firebase (veja o README) para jogar com outras pessoas.') : null,
    h('main', { class: 'wrap' }, (views[S.view] || viewHome)())
  );
  window.scrollTo(0, 0);
}

function header() {
  const logo = h('span', { class: 'logo' });
  logo.innerHTML = '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="#fff" stroke-width="2"/><ellipse cx="20" cy="20" rx="7" ry="17" fill="none" stroke="#fff" stroke-width="1.6"/><path d="M3 20h34M6 11h28M6 29h28" stroke="#fff" stroke-width="1.6" fill="none"/></svg>';
  const chip = h('div', { class: 'userchip' });
  if (S.session && S.session.role === 'admin') {
    chip.append(h('span', { class: 'who' }, `ADM · ${cap(S.session.name)}`),
      h('button', { class: 'ghost', onclick: () => go('admin') }, 'Painel'),
      h('button', { class: 'ghost', onclick: logout }, 'Sair'));
  } else if (S.session && S.session.role === 'player') {
    const me = myPlayer();
    chip.append(h('span', { class: 'who' }, me ? [flagImg(me.countryId, true), `${me.countryName} · ${me.playerName}`] : 'Jogador'),
      h('button', { class: 'ghost', onclick: () => { S.viewTurn = S.currentTurn; go('game'); } }, 'Jogo'),
      h('button', { class: 'ghost', onclick: logout }, 'Sair'));
  } else {
    chip.append(h('button', { class: 'ghost', onclick: () => go('login') }, 'Entrar'));
  }
  return h('header', { class: 'top' },
    h('div', { class: 'brand', onclick: () => go('home') },
      logo,
      h('div', {}, h('strong', {}, 'Assembleia Mundial'), h('small', {}, 'Jogo textual · 1º de janeiro de 1992'))),
    chip);
}

function needLogin() {
  return h('div', { class: 'card' },
    h('p', {}, 'Você precisa entrar para ver esta página.'),
    h('button', { onclick: () => go('login') }, 'Ir para o login'));
}

/* ---------- HOME: lista de países ---------- */
function viewHome() {
  const stats = h('p', { class: 'stats' });
  const grid = h('div', { class: 'grid' });
  const search = h('input', { type: 'search', class: 'search', placeholder: 'Buscar país…', 'aria-label': 'Buscar país', oninput: fill });

  function pick(c, p, mine) {
    if (mine) { S.viewTurn = S.currentTurn; go('game'); return; }
    if (S.session) { toast('Você já está conectado. Saia da conta para escolher outro país.'); return; }
    S.selCountry = c.code; go('register');
  }

  function fill() {
    const q = norm(search.value.trim());
    const claimed = new Map(S.players.map(p => [p.countryId, p]));
    stats.textContent = `${claimed.size} de ${COUNTRIES.length} países já escolhidos`;
    grid.replaceChildren(...COUNTRIES.filter(c => !q || norm(c.name).includes(q)).map(c => {
      const p = claimed.get(c.code);
      const mine = S.session && S.session.role === 'player' && S.session.countryId === c.code;
      return h('button', {
        type: 'button',
        class: 'country' + (p ? ' taken' : '') + (mine ? ' mine' : ''),
        disabled: !!p && !mine,
        onclick: () => pick(c, p, mine)
      },
        flagImg(c.code),
        h('span', { class: 'info' },
          h('strong', {}, c.name),
          h('span', {}, p ? `Escolhido por ${p.playerName}` : 'Disponível')));
    }));
  }
  S.refreshGrid = fill;
  fill();

  const actions = h('div', { class: 'actions' });
  if (!S.session) {
    actions.append(h('button', { class: 'big secondary', onclick: () => go('login') }, 'Entrar'),
      h('span', { style: 'align-self:center' }, 'ou escolha um país disponível abaixo para criar sua conta.'));
  } else if (S.session.role === 'player') {
    actions.append(h('button', { class: 'big secondary', onclick: () => { S.viewTurn = S.currentTurn; go('game'); } }, 'Ir para o meu jogo'));
  } else {
    actions.append(h('button', { class: 'big secondary', onclick: () => go('admin') }, 'Abrir painel do ADM'));
  }

  return h('div', {},
    h('section', { class: 'hero' },
      h('h1', {}, 'O mundo em 1º de janeiro de 1992'),
      h('p', {}, 'A União Soviética foi dissolvida e uma nova ordem mundial começa. Escolha uma nação, escreva as ações do seu governo e dispute o rumo da história — turno a turno, de 1992 a 2041.'),
      actions),
    h('div', { class: 'toolbar' }, stats, search),
    grid);
}

/* ---------- LOGIN ---------- */
function viewLogin() {
  const err = h('p', { class: 'error', role: 'alert' });
  const id = h('input', { type: 'text', required: true, autocomplete: 'username', placeholder: 'E-mail ou nome de usuário' });
  const pw = h('input', { type: 'password', required: true, autocomplete: 'current-password' });
  const btn = h('button', { type: 'submit' }, 'Entrar');
  const form = h('form', {
    class: 'card form',
    onsubmit: async e => {
      e.preventDefault(); err.textContent = ''; btn.disabled = true;
      try { await doLogin(id.value.trim(), pw.value); }
      catch (ex) { err.textContent = ex.message || 'Erro ao entrar.'; btn.disabled = false; }
    }
  },
    h('h2', {}, 'Entrar'),
    h('label', {}, 'E-mail, nome do jogador ou usuário ADM', id),
    h('label', {}, 'Senha', pw),
    err, btn,
    h('p', { class: 'muted' }, 'Ainda não tem país? ', h('a', { href: '#', onclick: e => { e.preventDefault(); go('home'); } }, 'Escolha um na lista.')));
  return form;
}

async function doLogin(ident, pass) {
  if (!ident) throw new Error('Informe seu e-mail ou usuário.');
  const low = ident.toLowerCase();
  if (ADMIN_USERS.includes(low)) {
    if (pass !== ADMIN_PASS) throw new Error('Senha incorreta.');
    S.session = { role: 'admin', name: low }; persistSession(); go('admin'); return;
  }
  const found = (await S.db.query('players', 'emailLower', low))[0]
    || (await S.db.query('players', 'nameLower', low))[0];
  if (!found) throw new Error('Jogador não encontrado.');
  const hash = await hashPass(pass, found.emailLower);
  if (hash !== found.passHash) throw new Error('Senha incorreta.');
  S.session = { role: 'player', countryId: found.countryId }; persistSession();
  S.viewTurn = S.currentTurn; go('game');
}

/* ---------- CADASTRO DE PLAYER ---------- */
function viewRegister() {
  const c = BY_CODE[S.selCountry];
  if (!c) { setTimeout(() => go('home'), 0); return h('div'); }
  const err = h('p', { class: 'error', role: 'alert' });
  const name = h('input', { type: 'text', required: true, maxlength: 40, autocomplete: 'nickname' });
  const email = h('input', { type: 'email', required: true, autocomplete: 'email' });
  const pw = h('input', { type: 'password', required: true, minlength: 4, autocomplete: 'new-password' });
  const pw2 = h('input', { type: 'password', required: true, minlength: 4, autocomplete: 'new-password' });
  const btn = h('button', { type: 'submit' }, 'Criar conta e assumir o país');

  const form = h('form', {
    class: 'card form',
    onsubmit: async e => {
      e.preventDefault(); err.textContent = ''; btn.disabled = true;
      try {
        const nm = name.value.trim(), em = email.value.trim();
        const nameL = nm.toLowerCase(), emailL = em.toLowerCase();
        if (nm.length < 2) throw new Error('Informe o nome do jogador.');
        if (!/^\S+@\S+\.\S+$/.test(em)) throw new Error('E-mail inválido.');
        if (pw.value.length < 4) throw new Error('A senha precisa ter ao menos 4 caracteres.');
        if (pw.value !== pw2.value) throw new Error('As senhas não conferem.');
        if (ADMIN_USERS.includes(nameL)) throw new Error('Este nome é reservado.');
        const [byEmail, byName] = await Promise.all([
          S.db.query('players', 'emailLower', emailL), S.db.query('players', 'nameLower', nameL)]);
        if (byEmail.length) throw new Error('Este e-mail já está sendo usado por outro país.');
        if (byName.length) throw new Error('Este nome de jogador já está em uso.');
        const doc = {
          countryId: c.code, countryName: c.name,
          playerName: nm, nameLower: nameL, email: em, emailLower: emailL,
          passHash: await hashPass(pw.value, emailL), createdAt: Date.now()
        };
        const ok = await S.db.createIfAbsent('players', c.code, doc);
        if (!ok) throw new Error('Este país acabou de ser escolhido por outro jogador. Escolha outro.');
        if (!S.players.some(p => p.countryId === c.code)) S.players.push({ id: c.code, ...doc });
        S.session = { role: 'player', countryId: c.code }; persistSession();
        S.viewTurn = S.currentTurn; toast(`Bem-vindo(a)! Você assumiu ${c.name}.`); go('game');
      } catch (ex) { err.textContent = ex.message || 'Erro ao criar a conta.'; btn.disabled = false; }
    }
  },
    h('h2', {}, 'Assumir país'),
    h('div', { class: 'country', style: 'cursor:default' }, flagImg(c.code),
      h('span', { class: 'info' }, h('strong', {}, c.name), h('span', {}, 'País selecionado'))),
    h('button', { type: 'button', class: 'secondary', onclick: () => go('home') }, 'Trocar de país'),
    h('label', {}, 'Nome do jogador', name),
    h('label', {}, 'E-mail', email),
    h('label', {}, 'Senha', pw),
    h('label', {}, 'Repita a senha', pw2),
    err, btn,
    h('p', { class: 'muted' }, 'Depois de criada, somente este e-mail/nome poderá entrar com este país.'));
  return form;
}

/* ---------- JOGO (PLAYER) ---------- */
function viewGame() {
  if (!S.session || S.session.role !== 'player') return needLogin();
  const me = myPlayer();
  if (!me) return h('p', { class: 'boot' }, 'Carregando…');
  if (!S.viewTurn || S.viewTurn > S.currentTurn) S.viewTurn = S.currentTurn;

  const turnBar = h('div', { class: 'turnbar', role: 'tablist', 'aria-label': 'Turnos' });
  const head = h('div', { class: 'pagehead' });
  const tabs = h('div', { class: 'tabs' });
  const content = h('div', { class: 'content' });

  function drawBar() {
    turnBar.replaceChildren(...Array.from({ length: MAX_TURNS }, (_, i) => i + 1).map(n => {
      const [a, b] = turnYears(n);
      return h('button', {
        type: 'button',
        class: 'turn' + (n === S.viewTurn ? ' active' : '') + (n === S.currentTurn ? ' now' : ''),
        disabled: n > S.currentTurn,
        title: n > S.currentTurn ? 'Turno ainda não liberado pelo ADM' : turnLabel(n),
        onclick: () => { S.viewTurn = n; S.sub = 'meu'; drawBar(); drawHead(); drawContent(); }
      }, h('span', {}, `Turno ${n}`), h('small', {}, `${a}/${b}`));
    }));
    const act = turnBar.querySelector('.active');
    if (act) act.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  function drawHead() {
    head.replaceChildren(
      h('h2', {}, turnLabel(S.viewTurn)),
      S.viewTurn === S.currentTurn ? h('span', { class: 'badge' }, 'Turno atual') : h('span', { class: 'badge off' }, 'Turno encerrado'));
  }
  function drawTabs() {
    const items = [['acoes', '1 · Ações'], ['noticias', '2 · Notícias'], ['guerras', '3 · Guerras']];
    tabs.replaceChildren(...items.map(([k, label]) => h('button', {
      type: 'button', class: S.section === k ? 'active' : '',
      onclick: () => { S.section = k; drawTabs(); drawContent(); }
    }, label)));
  }
  function drawContent() {
    cleanupLive();
    if (S.section === 'acoes') renderAcoes(content, me);
    else if (S.section === 'noticias') renderTexto(content, 'news', 'Notícias', 'Nenhuma notícia publicada neste turno ainda.');
    else renderTexto(content, 'wars', 'Guerras', 'Nenhuma guerra registrada neste turno ainda.');
  }

  S.refreshTurnBar = () => { drawBar(); drawHead(); };
  drawBar(); drawHead(); drawTabs(); drawContent();
  return h('div', {}, turnBar, head, tabs, content);
}

/* --- Aba AÇÕES --- */
function renderAcoes(container, me) {
  const subs = [['meu', 'Meu turno'], ['enviadas', 'Ações enviadas'], ['resultado', 'Resultado']];
  const subbar = h('div', { class: 'tabs sub' });
  const body = h('div');
  container.replaceChildren(subbar, body);

  function drawSub() {
    cleanupLive();
    subbar.replaceChildren(...subs.map(([k, label]) => h('button', {
      type: 'button', class: S.sub === k ? 'active' : '',
      onclick: () => { S.sub = k; drawSub(); }
    }, label)));
    if (S.sub === 'meu') meuTurno(body, me, drawSub);
    else if (S.sub === 'enviadas') listaEnviadas(body);
    else resultado(body, me);
  }
  drawSub();
}

async function meuTurno(body, me, redraw) {
  body.replaceChildren(h('p', { class: 'muted' }, 'Carregando…'));
  const turn = S.viewTurn;
  const sent = await S.db.getDoc('actions', `${turn}_${me.countryId}`);
  if (turn !== S.viewTurn || S.sub !== 'meu') return; // usuário navegou enquanto carregava
  if (sent) {
    body.replaceChildren(
      h('div', { class: 'notice ok' }, `Turno enviado em ${fmtDate(sent.submittedAt)}. As ações já estão visíveis para os outros jogadores na aba "Ações enviadas".`),
      sheet(sent));
    return;
  }
  if (turn !== S.currentTurn) {
    body.replaceChildren(h('div', { class: 'notice' }, 'Você não enviou ações neste turno.'));
    return;
  }
  body.replaceChildren(buildForm(me, turn, redraw));
}

function buildForm(me, turn, redraw) {
  const key = `ag_draft_${turn}_${me.countryId}`;
  let draft = {};
  try { draft = JSON.parse(localStorage.getItem(key)) || {}; } catch { draft = {}; }
  const refs = { internal: [], external: [] };
  const status = h('span', { class: 'status' }, 'Seu rascunho é salvo automaticamente neste navegador.');
  const msg = h('p', { class: 'error', role: 'alert' });
  let timer;

  const collect = () => ({
    internal: refs.internal.map(r => r.get()),
    external: refs.external.map(r => r.get())
  });
  const saveDraft = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try { localStorage.setItem(key, JSON.stringify(collect())); status.textContent = 'Rascunho salvo neste navegador.'; } catch { /* sem espaço */ }
    }, 400);
  };

  function block(kind, i) {
    const d = (draft[kind] || [])[i] || {};
    const t = h('input', { type: 'text', maxlength: 120, placeholder: 'Título da ação', 'aria-label': `Título da ação ${i + 1}`, oninput: saveDraft });
    t.value = d.title || '';
    const cn = h('span', { class: 'count' });
    const x = h('textarea', {
      maxlength: MAX_CHARS, rows: 6, 'aria-label': `Texto da ação ${i + 1}`,
      placeholder: `Descreva a ação (até ${MAX_CHARS} caracteres)`,
      oninput: () => { cnt(); saveDraft(); }
    });
    x.value = d.text || '';
    const cnt = () => {
      cn.textContent = `${x.value.length}/${MAX_CHARS}`;
      cn.classList.toggle('warn', x.value.length > MAX_CHARS - 100);
    };
    cnt();
    const b = h('input', { type: 'number', min: 0, step: 'any', inputmode: 'decimal', placeholder: '0', 'aria-label': `Orçamento da ação ${i + 1}`, oninput: saveDraft });
    b.value = d.budget == null ? '' : d.budget;
    refs[kind].push({
      get: () => ({ title: t.value.trim(), text: x.value.trim(), budget: b.value === '' ? null : Number(b.value) })
    });
    return h('div', { class: 'act-form' },
      h('div', { class: 'act-head' }, h('span', { class: 'num' }, `${i + 1}-`), t),
      x,
      h('div', { class: 'act-foot' }, cn, h('label', { class: 'budget-label' }, 'ORÇAMENTO: ', b)));
  }

  const btn = h('button', { type: 'button', class: 'big' }, 'Enviar turno');
  btn.addEventListener('click', async () => {
    msg.textContent = '';
    const data = collect();
    const filled = [...data.internal, ...data.external].filter(a => a.title || a.text || a.budget != null);
    if (!filled.length) { msg.textContent = 'Preencha ao menos uma ação antes de enviar.'; return; }
    if (filled.some(a => !a.title)) { msg.textContent = 'Toda ação preenchida precisa de um título.'; return; }
    if (filled.some(a => a.budget != null && (!isFinite(a.budget) || a.budget < 0))) {
      msg.textContent = 'O orçamento precisa ser um número maior ou igual a zero.'; return;
    }
    if (turn !== S.currentTurn) { msg.textContent = 'O ADM já avançou o turno; não é mais possível enviar este.'; return; }
    if (!confirm('Enviar o turno?\n\nDepois de enviado ele não poderá mais ser editado e ficará visível para os outros jogadores.')) return;
    btn.disabled = true;
    try {
      const id = `${turn}_${me.countryId}`;
      if (await S.db.getDoc('actions', id)) throw new Error('Este turno já foi enviado.');
      await S.db.setDoc('actions', id, {
        turn, countryId: me.countryId, countryName: me.countryName, playerName: me.playerName,
        internal: data.internal, external: data.external, submittedAt: Date.now()
      });
      try { localStorage.removeItem(key); } catch { /* ignore */ }
      toast('Turno enviado com sucesso!');
      redraw();
    } catch (ex) { msg.textContent = ex.message || 'Falha ao enviar. Tente novamente.'; btn.disabled = false; }
  });

  return h('div', {},
    h('div', { class: 'sheet-head' }, flagImg(me.countryId), h('h3', {}, me.countryName)),
    h('div', { class: 'section-bar' }, 'AÇÕES INTERNAS'),
    Array.from({ length: N_INTERNAS }, (_, i) => block('internal', i)),
    h('div', { class: 'section-bar' }, 'AÇÕES EXTERNAS'),
    Array.from({ length: N_EXTERNAS }, (_, i) => block('external', i)),
    h('div', { class: 'submitbar' }, btn, status),
    msg);
}

/* Leitura de um turno enviado */
function sheet(doc) {
  const part = (title, list) => {
    const items = (list || []).map((a, i) => ({ ...a, n: i + 1 }))
      .filter(a => a.title || a.text || (a.budget != null && a.budget !== ''));
    return h('section', {},
      h('h4', { class: 'part-title' }, title),
      items.length ? items.map(a => h('article', { class: 'act' },
        h('h5', {}, `${a.n}- ${a.title || '(sem título)'}`),
        h('p', { class: 'prewrap' }, a.text || ''),
        h('p', { class: 'budget' }, 'ORÇAMENTO: ', h('b', {}, a.budget == null || a.budget === '' ? '—' : fmtNum(a.budget)))))
        : h('p', { class: 'muted' }, 'Nenhuma ação.'));
  };
  return h('div', { class: 'sheet' },
    h('h3', { class: 'sheet-country' }, flagImg(doc.countryId), doc.countryName),
    part('AÇÕES INTERNAS', doc.internal),
    part('AÇÕES EXTERNAS', doc.external));
}

function listaEnviadas(body) {
  const turn = S.viewTurn;
  const opened = new Set();
  body.replaceChildren(h('p', { class: 'muted' }, 'Carregando…'));
  S.liveUnsub = S.db.onCol('actions', list => {
    list = list.slice().sort((a, b) => collator.compare(a.countryName || '', b.countryName || ''));
    body.replaceChildren(
      h('p', { class: 'stats' }, `${list.length} de ${S.players.length} países já enviaram o turno.`),
      list.length ? list.map(d => {
        const det = h('details', { class: 'sent', open: opened.has(d.countryId) },
          h('summary', {}, flagImg(d.countryId, true), h('strong', {}, d.countryName),
            h('span', { class: 'meta' }, `${d.playerName} · ${fmtDate(d.submittedAt)}`)),
          h('div', { class: 'inner' }, sheet(d)));
        det.addEventListener('toggle', () => { det.open ? opened.add(d.countryId) : opened.delete(d.countryId); });
        return det;
      }) : h('div', { class: 'notice' }, 'Nenhum país enviou ações neste turno ainda.'));
  }, 'turn', turn);
}

function resultado(body, me) {
  const turn = S.viewTurn;
  S.liveUnsub = S.db.onDoc('results', `${turn}_${me.countryId}`, d => {
    body.replaceChildren(h('div', { class: 'card' },
      h('h3', {}, `Resultado — ${turnLabel(turn)}`),
      d && d.text
        ? h('div', { class: 'prewrap textpage' }, d.text)
        : h('p', { class: 'muted' }, 'Aguardando o julgamento do ADM. Somente você pode ver o resultado do seu país.')));
  });
}

/* --- Abas NOTÍCIAS e GUERRAS (somente leitura para o player) --- */
function renderTexto(container, col, titulo, vazio) {
  const turn = S.viewTurn;
  container.replaceChildren(h('p', { class: 'muted' }, 'Carregando…'));
  S.liveUnsub = S.db.onDoc(col, String(turn), d => {
    container.replaceChildren(h('div', { class: 'card' },
      h('h3', {}, `${titulo} — ${turnLabel(turn)}`),
      d && d.text ? h('div', { class: 'prewrap textpage' }, d.text) : h('p', { class: 'muted' }, vazio)));
  });
}

/* ---------- PAINEL DO ADM (versão inicial) ----------
   Já inclui: troca de turno, edição de Notícias/Guerras e lista de jogadores.
   O julgamento (Resultados) e demais ferramentas entram na próxima etapa.   */
function viewAdmin() {
  if (!S.session || S.session.role !== 'admin') return needLogin();

  /* Turno atual */
  const sel = h('select', { 'aria-label': 'Turno atual' },
    Array.from({ length: MAX_TURNS }, (_, i) => h('option', { value: i + 1 }, turnLabel(i + 1))));
  sel.value = S.currentTurn;
  const turnMsg = h('p', { class: 'muted' });
  const saveTurn = h('button', { type: 'button' }, 'Definir turno atual');
  saveTurn.addEventListener('click', async () => {
    saveTurn.disabled = true;
    try {
      await S.db.setDoc('meta', 'game', { currentTurn: Number(sel.value) });
      toast(`Turno atual: ${turnLabel(Number(sel.value))}`);
    } catch (e) { toast('Falha ao salvar o turno.'); }
    saveTurn.disabled = false;
  });
  S.refreshAdminTurn = () => { sel.value = S.currentTurn; turnMsg.textContent = `Turno liberado para os jogadores: ${turnLabel(S.currentTurn)}`; };
  S.refreshAdminTurn();

  /* Editor de Notícias / Guerras */
  const edTurn = h('select', { 'aria-label': 'Turno a editar' },
    Array.from({ length: MAX_TURNS }, (_, i) => h('option', { value: i + 1 }, turnLabel(i + 1))));
  edTurn.value = S.currentTurn;
  const news = h('textarea', { rows: 8, placeholder: 'Notícias deste turno…' });
  const wars = h('textarea', { rows: 8, placeholder: 'Guerras deste turno…' });
  async function loadEd() {
    const n = edTurn.value;
    const [a, b] = await Promise.all([S.db.getDoc('news', n), S.db.getDoc('wars', n)]);
    if (n !== edTurn.value) return;
    news.value = (a && a.text) || ''; wars.value = (b && b.text) || '';
  }
  edTurn.addEventListener('change', loadEd);
  loadEd();
  const mkSave = (col, ta, label) => {
    const b = h('button', { type: 'button' }, `Salvar ${label}`);
    b.addEventListener('click', async () => {
      b.disabled = true;
      try { await S.db.setDoc(col, edTurn.value, { text: ta.value, updatedAt: Date.now(), updatedBy: S.session.name }); toast(`${cap(label)} salvas.`); }
      catch (e) { toast('Falha ao salvar.'); }
      b.disabled = false;
    });
    return b;
  };

  /* Jogadores */
  const tbody = h('tbody');
  const countEl = h('p', { class: 'stats' });
  S.refreshAdminPlayers = () => {
    const list = S.players.slice().sort((a, b) => collator.compare(a.countryName, b.countryName));
    countEl.textContent = `${list.length} de ${COUNTRIES.length} países com jogador.`;
    tbody.replaceChildren(...list.map(p => h('tr', {},
      h('td', {}, h('span', { class: 'row' }, flagImg(p.countryId, true), p.countryName)),
      h('td', {}, p.playerName), h('td', {}, p.email))));
  };
  S.refreshAdminPlayers();

  return h('div', {},
    h('div', { class: 'pagehead' }, h('h2', {}, 'Painel do ADM'),
      h('span', { class: 'badge' }, `Logado como ${cap(S.session.name)}`)),
    h('div', { class: 'cols' },
      h('div', { class: 'card' },
        h('h3', {}, 'Turno atual'),
        h('p', { class: 'muted' }, 'Os jogadores só enxergam os turnos até o atual.'),
        h('div', { class: 'row' }, sel, saveTurn), turnMsg),
      h('div', { class: 'card' },
        h('h3', {}, 'Notícias e Guerras'),
        h('label', { class: 'row' }, 'Turno: ', edTurn),
        h('h4', { style: 'margin-top:.8rem' }, 'Notícias'), news, mkSave('news', news, 'notícias'),
        h('h4', { style: 'margin-top:.8rem' }, 'Guerras'), wars, mkSave('wars', wars, 'guerras'))),
    h('div', { class: 'card' },
      h('h3', {}, 'Jogadores'), countEl,
      h('div', { style: 'overflow-x:auto' },
        h('table', { class: 'list' },
          h('thead', {}, h('tr', {}, h('th', {}, 'País'), h('th', {}, 'Jogador'), h('th', {}, 'E-mail'))), tbody))));
}

/* ---------- Início ---------- */
boot();
