require('express-async-errors');
const express = require('express'), cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken'), bcrypt = require('bcryptjs'), mongoose = require('mongoose');
const { User, Bus } = require('./models'), log = require('./logger');
const SECRET = process.env.JWT_SECRET || 'buspark_dev_secret';
const PLATE = /^\d{3} [A-Z]{3} \d{2}$/;
const STATUSES = ['Жарамды', 'Жөндеуде', 'Есептен шығарылған'];
const MOVES = { 'Жарамды': ['Жөндеуде', 'Есептен шығарылған'], 'Жөндеуде': ['Жарамды', 'Есептен шығарылған'], 'Есептен шығарылған': [] };

const app = express();
app.use(express.json()); app.use(cookieParser());
app.use((req, res, next) => {
  const t = Date.now();
  res.on('finish', () => log.info(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - t} ms)`));
  next();
});

const who = (...roles) => (req, res, next) => {
  try { req.user = jwt.verify(req.cookies.token, SECRET); }
  catch (e) { return res.status(401).json({ message: 'Алдымен жүйеге кіріңіз' }); }
  if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ message: 'Бұл әрекетке рұқсат жоқ' });
  next();
};

// ---- auth (token httpOnly cookie ішінде сақталады) ----
app.post('/api/auth/login', async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) return res.status(400).json({ message: 'Логин мен құпиясөзді енгізіңіз' });
  const u = await User.findOne({ login });
  if (!u || !(await bcrypt.compare(password, u.password))) return res.status(401).json({ message: 'Логин немесе құпиясөз қате' });
  const token = jwt.sign({ id: u._id, login: u.login, role: u.role }, SECRET, { expiresIn: '2h' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 2 * 3600 * 1000 });
  res.json({ login: u.login, role: u.role });
});
app.post('/api/auth/logout', (req, res) => { res.clearCookie('token'); res.json({ message: 'Шықтыңыз' }); });
app.get('/api/auth/me', who(), (req, res) => res.json({ login: req.user.login, role: req.user.role }));

// ---- buses ----
function check(b) {
  if (!b.plate) return 'Мемлекеттік нөмір бос болмауы керек';
  if (typeof b.plate !== 'string' || !PLATE.test(b.plate)) return 'Нөмір форматы қате (мысалы: 123 ABC 02)';
  if (typeof b.brand !== 'string' || b.brand.length < 1 || b.brand.length > 30) return 'Марка 1–30 таңба болуы керек';
  if (!b.driver || typeof b.driver !== 'string') return 'Жүргізуші бос болмауы керек';
  if (!STATUSES.includes(b.status)) return 'Техникалық жағдай қате';
}
const pick = (b) => ({ plate: b.plate, brand: b.brand, driver: b.driver, status: b.status });
const find = async (id) => (mongoose.isValidObjectId(id) ? Bus.findById(id) : null);

app.get('/api/buses', who(), async (req, res) => {
  const q = req.query.search ? { plate: new RegExp(req.query.search.replace(/[^\w ]/g, ''), 'i') } : {};
  res.json(await Bus.find(q).sort({ createdAt: -1 }));
});
app.get('/api/buses/:id', who(), async (req, res) => {
  const bus = await find(req.params.id);
  bus ? res.json(bus) : res.status(404).json({ message: 'Автобус табылмады' });
});
app.post('/api/buses', who('admin'), async (req, res) => {
  const err = check(req.body); if (err) return res.status(400).json({ message: err });
  if (await Bus.findOne({ plate: req.body.plate })) return res.status(409).json({ message: 'Мұндай нөмір бар' });
  res.status(201).json(await Bus.create(pick(req.body)));
});
app.put('/api/buses/:id', who('admin', 'dispatcher', 'mechanic'), async (req, res) => {
  const bus = await find(req.params.id);
  if (!bus) return res.status(404).json({ message: 'Автобус табылмады' });
  const err = check(req.body); if (err) return res.status(400).json({ message: err });
  const same = await Bus.findOne({ plate: req.body.plate, _id: { $ne: bus._id } });
  if (same) return res.status(409).json({ message: 'Мұндай нөмір бар' });
  if (req.body.status !== bus.status && !MOVES[bus.status].includes(req.body.status))
    return res.status(400).json({ message: `«${bus.status}» күйінен «${req.body.status}» күйіне өтуге болмайды` });
  Object.assign(bus, pick(req.body)); await bus.save(); res.json(bus);
});
app.delete('/api/buses/:id', who('admin'), async (req, res) => {
  const bus = await find(req.params.id);
  if (!bus) return res.status(404).json({ message: 'Автобус табылмады' });
  await bus.deleteOne(); res.json({ message: 'Автобус өшірілді' });
});

app.use((err, req, res, next) => {
  log.error(`${req.method} ${req.originalUrl}\n${err.stack}`);
  res.status(500).json({ message: 'Серверлік қате' });
});
module.exports = app;
