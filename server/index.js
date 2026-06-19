const { createApp } = require('./app');

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '127.0.0.1';

const server = createApp();

server.listen(port, host, () => {
  console.log(`Cash coupon backend listening at http://${host}:${port}`);
  console.log(`Admin dashboard: http://${host}:${port}/admin/`);
});
