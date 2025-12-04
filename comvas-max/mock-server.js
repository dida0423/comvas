// ws-server.js
const maxAPI = require("max-api");

// Notify Max that the script has started
maxAPI.post("Mock server started");

// Example test dictionary
const testData = {
    red_stroke: [
        { note: 60, velocity: 90, duration: 300 },
        { note: 62, velocity: 85, duration: 250 }
    ],
    blue_stroke: [
        { note: 65, velocity: 80, duration: 200 },
        { note: 67, velocity: 95, duration: 300 }
    ],
    green_stroke: [
        { note: 69, velocity: 100, duration: 400 }
    ]
};

// Send the dictionary to Max
maxAPI.outlet("dictionary", { name: "incoming", value: testData });

// Optional: send again every 5 seconds for testing
setInterval(() => {
    maxAPI.outlet("dictionary", { name: "incoming", value: testData });
}, 5000);
