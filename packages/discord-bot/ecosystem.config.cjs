// EC2에서 `pm2 startOrReload ecosystem.config.cjs`로 기동. packages/discord-bot 안에서 실행 기준.
// 빌드 단계 없이 tsx로 바로 실행 (server처럼 nest build 거치는 게 아니라 소규모 봇이라 단순하게).
module.exports = {
  apps: [
    {
      name: 'bbot-discord',
      script: 'src/index.ts',
      interpreter: './node_modules/.bin/tsx',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
