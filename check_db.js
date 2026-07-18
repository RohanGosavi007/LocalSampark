const { query } = require('./backend/src/config/database.js');
query("SELECT sql FROM sqlite_master WHERE name='society_emergency_alerts'").then(r => console.log(r)).catch(e => console.error(e));
