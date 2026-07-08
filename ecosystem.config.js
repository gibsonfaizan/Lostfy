module.exports = {
    apps: [
        {
            name: "lostfy-backend",
            script: "./backend/server.js",
            instances: "max",
            exec_mode: "cluster",
            env: {
                NODE_ENV: "production",
                PORT: 5000
            },
            env_development: {
                NODE_ENV: "development",
                PORT: 5000
            }
        },
        {
            name: "lostfy-ai-service",
            script: "python",
            args: "./ai-service/app.py",
            instances: 1,
            exec_mode: "fork",
            env: {
                ENV: "production",
                PORT: 8000
            },
            env_development: {
                ENV: "development",
                PORT: 8000
            }
        }
    ]
};
