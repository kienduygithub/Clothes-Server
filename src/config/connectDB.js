const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('clothes', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false,
  timezone: '+07:00'
});

const connectDB =  async () => {
    try {
        await sequelize.authenticate();
        console.log('>>> Connected to database: clothes');
      } catch (error) {
        console.error('Unable to connect to the database:', error);
      }
}

export default connectDB;