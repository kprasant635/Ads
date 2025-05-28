const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://172.105.62.110:8000',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '', // remove /api from the URL before sending to target
      },
    })
  );
};
