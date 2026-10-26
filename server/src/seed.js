const mongoose = require('mongoose'), bcrypt = require('bcryptjs'), { User, Bus } = require('./models');
(async () => {
  await mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/buspark');
  await User.deleteMany({}); await Bus.deleteMany({});
  const h = (p) => bcrypt.hashSync(p, 10);
  await User.create([{ login: 'admin', password: h('admin123'), role: 'admin' },
    { login: 'dispatcher', password: h('disp123'), role: 'dispatcher' },
    { login: 'mechanic', password: h('mech123'), role: 'mechanic' }]);
  await Bus.create([{ plate: '101 KZB 02', brand: 'MAN', driver: 'Ермек Асанов', status: 'Жарамды' },
    { plate: '202 KZB 02', brand: 'Yutong', driver: 'Нұрлан Сейіт', status: 'Жөндеуде' },
    { plate: '303 KZB 02', brand: 'Volgabus', driver: 'Дәурен Қали', status: 'Есептен шығарылған' }]);
  console.log('Дайын. admin/admin123, dispatcher/disp123, mechanic/mech123'); process.exit();
})();
