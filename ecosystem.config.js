{
  "apps": [
    {
      "name": "football-marketplace",
      "script": "./bin/www",
      "cwd": "/var/www/footbalmarketplace",
      "instances": "max",
      "exec_mode": "cluster",
      "env": {
        "NODE_ENV": "production",
        "PORT": 3000
      },
      "env_production": {
        "NODE_ENV": "production",
        "PORT": 3000
      },
      "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
      "error_file": "/var/log/football-marketplace/pm2-error.log",
      "out_file": "/var/log/football-marketplace/pm2-out.log",
      "log_file": "/var/log/football-marketplace/pm2-combined.log",
      "merge_logs": true,
      "max_memory_restart": "500M",
      "restart_delay": 4000,
      "max_restarts": 10,
      "min_uptime": "10s",
      "watch": false,
      "ignore_watch": [
        "node_modules",
        "uploads",
        "logs",
        ".git"
      ],
      "kill_timeout": 5000,
      "wait_ready": true,
      "listen_timeout": 10000,
      "source_map_support": false,
      "instance_var": "INSTANCE_ID",
      "autorestart": true,
      "vizion": false,
      "post_update": ["npm install"],
      "force": true
    }
  ],
  "deploy": {
    "production": {
      "user": "your-user",
      "host": "your-vps-ip",
      "ref": "origin/main",
      "repo": "https://github.com/Mujanati13/marketplacefootball.git",
      "path": "/var/www/footbalmarketplace",
      "post-deploy": "npm ci --production && npm run migrate && pm2 reload ecosystem.config.js --env production",
      "pre-setup": "mkdir -p /var/www/footbalmarketplace /var/log/football-marketplace",
      "ssh_options": "StrictHostKeyChecking=no"
    }
  }
}
