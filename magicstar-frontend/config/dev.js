module.exports = {
  env: {
    NODE_ENV: '"development"'
  },
  defineConstants: {
    API_BASE_URL: '"http://localhost:3000"',
    APP_ENV: '"development"'
  },
  mini: {},
  h5: {
    devServer: {
      port: 10086,
      host: 'localhost'
    }
  }
}