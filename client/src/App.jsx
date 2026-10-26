import { useState, useEffect } from 'react';
import { api } from './api.js';

const STATUSES = ['Жарамды', 'Жөндеуде', 'Есептен шығарылған'];
const cls = { 'Жарамды': 'b-ok', 'Жөндеуде': 'b-rep', 'Есептен шығарылған': 'b-ret' };

function Login({ onLogin }) {
  const [f, setF] = useState({ login: '', password: '' }); const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try { onLogin(await api('/api/auth/login', 'POST', f)); } catch (x) { setErr(x.message); }
  };
  return (<div className="login">
    <div className="hero"><h1>Bus<span>Park</span></h1><p>Автобус паркін есепке алу жүйесі: автобустар, жүргізушілер және техникалық жағдай бір жерде.</p></div>
    <form onSubmit={submit}><h2>Жүйеге кіру</h2>
      {err && <div className="msg err">{err}</div>}
      <input placeholder="Логин" value={f.login} onChange={(e) => setF({ ...f, login: e.target.value })} />
      <input type="password" placeholder="Құпиясөз" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
      <button>Кіру</button></form></div>);
}

function BusForm({ bus, onClose, onSaved }) {
  const [f, setF] = useState(bus || { plate: '', brand: '', driver: '', status: 'Жарамды' }); const [err, setErr] = useState('');
  const save = async () => {
    try { bus ? await api('/api/buses/' + bus._id, 'PUT', f) : await api('/api/buses', 'POST', f); onSaved(bus ? 'Өзгерістер сақталды' : 'Автобус қосылды'); }
    catch (x) { setErr(x.message); }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (<div className="overlay"><div className="modal"><h3>{bus ? 'Автобусты өзгерту' : 'Жаңа автобус'}</h3>
    {err && <div className="msg err">{err}</div>}
    <label>Мемлекеттік нөмір<input value={f.plate} onChange={set('plate')} placeholder="123 ABC 02" /></label>
    <label>Марка<input value={f.brand} onChange={set('brand')} /></label>
    <label>Жүргізуші<input value={f.driver} onChange={set('driver')} /></label>
    <label>Техникалық жағдай<select value={f.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
    <div className="row"><button className="ghost" onClick={onClose}>Бас тарту</button><button onClick={save}>Сақтау</button></div></div></div>);
}

function Dashboard({ user, onLogout }) {
  const [buses, setBuses] = useState([]); const [search, setSearch] = useState(''); const [filter, setFilter] = useState('');
  const [form, setForm] = useState(null); const [msg, setMsg] = useState(null);
  const load = () => api('/api/buses?search=' + encodeURIComponent(search)).then(setBuses).catch((x) => setMsg({ t: 'err', x: x.message }));
  useEffect(() => { load(); }, [search]);
  const del = async (b) => {
    if (!window.confirm(`${b.plate} автобусын жою керек пе?`)) return;
    try { await api('/api/buses/' + b._id, 'DELETE'); setMsg({ t: 'good', x: 'Автобус өшірілді' }); load(); }
    catch (x) { setMsg({ t: 'err', x: x.message }); }
  };
  const shown = buses.filter((b) => !filter || b.status === filter);
  const count = (s) => buses.filter((b) => b.status === s).length;
  return (<div className="layout">
    <aside className="side"><div className="logo">Bus<span>Park</span></div><div className="item">Автобустар</div>
      <div className="me">{user.login}<br /><span className="role">{user.role}</span><br /><button className="ghost" onClick={onLogout}>Шығу</button></div></aside>
    <main><div className="top"><h2>Автобустар тізімі</h2>{user.role === 'admin' && <button onClick={() => setForm({})}>+ Автобус қосу</button>}</div>
      <div className="stats"><div className="card all">Барлығы<b>{buses.length}</b></div><div className="card ok">Жарамды<b>{count('Жарамды')}</b></div>
        <div className="card rep">Жөндеуде<b>{count('Жөндеуде')}</b></div><div className="card ret">Есептен шығарылған<b>{count('Есептен шығарылған')}</b></div></div>
      {msg && <div className={'msg ' + msg.t}>{msg.x}</div>}
      <div className="tools"><input placeholder="Нөмір бойынша іздеу" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">Барлық күй</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
      <table><thead><tr><th>Нөмір</th><th>Марка</th><th>Жүргізуші</th><th>Жағдайы</th><th></th></tr></thead>
        <tbody>{shown.map((b) => <tr key={b._id}><td><span className="plate">{b.plate}</span></td><td>{b.brand}</td><td>{b.driver}</td>
          <td><span className={'badge ' + cls[b.status]}>{b.status}</span></td>
          <td><div className="btns"><button className="ghost" onClick={() => setForm(b)}>Өзгерту</button>
            {user.role === 'admin' && <button className="danger" onClick={() => del(b)}>Жою</button>}</div></td></tr>)}
          {!shown.length && <tr><td colSpan="5">Автобус жоқ</td></tr>}</tbody></table>
      {form && <BusForm bus={form._id ? form : null} onClose={() => setForm(null)} onSaved={(t) => { setForm(null); setMsg({ t: 'good', x: t }); load(); }} />}
    </main></div>);
}

export default function App() {
  const [user, setUser] = useState(null); const [ready, setReady] = useState(false);
  useEffect(() => { api('/api/auth/me').then(setUser).catch(() => {}).finally(() => setReady(true)); }, []);
  const logout = async () => { await api('/api/auth/logout', 'POST'); setUser(null); };
  if (!ready) return null;
  return user ? <Dashboard user={user} onLogout={logout} /> : <Login onLogin={setUser} />;
}
