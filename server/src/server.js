const mongoose = require('mongoose'), app = require('./app'), log = require('./logger');
mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/buspark')
  .then(() => app.listen(5000, () => console.log('Сервер: http://localhost:5000')))
  .catch((e) => { log.error('MongoDB қосылмады: ' + e.message); console.error('MongoDB қосылмады, оны іске қосыңыз'); });
