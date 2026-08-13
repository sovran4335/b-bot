// EC2에서 `pm2 startOrReload ecosystem.config.js` 로 기동/배포. packages/server 안에서 실행 기준.
module.exports = {
  apps: [
    {
      name: 'bbot-server',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
