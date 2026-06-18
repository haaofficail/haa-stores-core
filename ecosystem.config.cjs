// PM2 process manager config for haastores.com production
module.exports = {
  apps: [
    {
      name: 'api',
      script: '/home/haa/app/repo/apps/api/dist/index.js',
      cwd: '/home/haa/app/repo/apps/api',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      env_production: {
        NODE_ENV: 'production',
        // Values come from /home/haa/app/.env.production (loaded by dotenv in app)
      },
      error_file: '/home/haa/logs/api-error.log',
      out_file: '/home/haa/logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
