console.log("Starting safe server…");

const maxAPI = require("max-api");
const http = require("http");

const server = http.createServer((req, res) => {
    console.log("Request method:", req.method);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");

    if (req.method === "OPTIONS") {
        res.end();
        return;
    }

    if (req.method === "POST") {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", () => {
            console.log("Body:", body);

            try {
                const json = JSON.parse(body);
                maxAPI.outlet(json);
            } catch (err) {
                console.log("JSON error:", err.message);
                maxAPI.outlet("JSON error");
            }

            res.end("OK");
        });
        return;
    }

    res.end("OK");
});

server.listen(2112, () => {
    console.log("Safe server running on 2112");
});
