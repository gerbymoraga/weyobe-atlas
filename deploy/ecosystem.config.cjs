/**
 * PM2 ecosystem for ATLAS (API only — web is static nginx /var/www/atlas).
 *
 * On the droplet:
 *   cd /home/deploy/apps/weyobe-atlas
 *   chmod +x deploy/start-api.sh
 *   npm i -g pm2
 *   pm2 start deploy/ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup    # follow the printed sudo command
 *
 * Useful:
 *   pm2 status
 *   pm2 logs atlas-api
 *   pm2 restart atlas-api
 */
module.exports = {
  apps: [
    {
      name: "atlas-api",
      script: "deploy/start-api.sh",
      cwd: __dirname + "/..",
      interpreter: "bash",
      autorestart: true,
      watch: false,
      max_restarts: 20,
      min_uptime: "5s",
      restart_delay: 2000,
      env: {
        API_HOST: "127.0.0.1",
        API_PORT: "8000",
      },
    },
  ],
};
