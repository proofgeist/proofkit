// Environment variables are injected by doppler run
console.log("SetupEnv: DIFFERENT_FM_SERVER=", process.env.DIFFERENT_FM_SERVER ? "Loaded" : "Not Loaded");
console.log("SetupEnv: DIFFERENT_FM_DATABASE=", process.env.DIFFERENT_FM_DATABASE ? "Loaded" : "Not Loaded");
console.log("SetupEnv: DIFFERENT_OTTO_API_KEY=", process.env.DIFFERENT_OTTO_API_KEY ? "Loaded" : "Not Loaded");
