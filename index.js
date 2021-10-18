const config = require("./lib/Config");
const logs = require("./lib/Logs");

async function startHTTPServer() {
    try {
        await config.init();
        logs.info("Starting ZRepo Server");
        await (require("./minz/MongoDB")).init();
        const zServer = require("./lib/z-server");
        const express = require('express');
        const app = express();
        const bodyParser = require('body-parser');
        const http = require('http');
        const portal = require("./lib/Portal");

        console.log("Initializing ...");
        logs.debug("Initializing dataSets ...");
        await require("./dataSets/DataSets").init();
        logs.debug("Initializing MinZ Core ...");
        await require("./minz/Variables").init();
        logs.debug("Registerin EndPoints ...");
        zServer.registerModule("zrepo", portal);

        app.use("/", express.static(__dirname + "/www"));
        app.use(bodyParser.urlencoded({limit: '50mb', extended:true}));
        app.use(bodyParser.json({limit: '50mb', extended: true}));
        app.use((req, res, next) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
            next();
        });
        
        require("./minz/RestAPI").register(app);
        app.post("/*.*", (req, res) => zServer.resolve(req, res));     
        
        let port = config.httpPort;
        httpServer = http.createServer(app);
        httpServer.listen(port, "0.0.0.0", _ => {
            console.log("[ZRepo HTTP Server 0.67] Listenning at Port " + port);
            logs.info("[ZRepo HTTP Server 0.67] Listenning at Port " + port)
        });
        if (config.mqttPort) {
            const aedes = require("aedes")();
            this.aedesServer = require('net').createServer(aedes.handle);
            aedes.on("publish",  (packet, client) => {
                // DBG:
                //console.log("Publish triggered:", client?("Client: " + client.id):"No client");
                let topic = "NoT", payload = "NoP";
                if (packet.topic) topic = packet.topic;
                if (packet.payload) payload = packet.payload.toString();
                //console.log("  => publish1:", topic, payload, (client && client.dataSetCode)?("DataSet:" + client.dataSetCode):"No CLient or DataSet");
                //
                if (client && packet.payload && packet.topic) {
                    if (packet.topic == client.dataSetCode) {
                        let msg = packet.payload.toString();
                        //console.log("publish", client.dataSetCode + " => " + msg);
                        let json;
                        try {
                            json = JSON.parse(msg);
                        } catch(error) {
                            console.error(error);
                            json = null;
                        }
                        if (json) {
                            let rows = Array.isArray(json)?json:[json];
                            require("./dataSets/DataSets").importBatch(client.dataSetCode, rows)
                                .then(_ => {console.log("registrado")})
                                .catch(error => {
                                    console.error("[MQTT Publish] DataSet " + client.dataSetCode, error);
                                    logs.error("[MQTT Publish] DataSet " + client.dataSetCode + ": " + error.toString());
                                });
                        } else {
                            console.log("  => discard: Invalid json msg");
                        }
                    } else {
                        console.log("  => discard: topic != dataSet");
                    }
                } else {
                    //console.log("  => discard: client, payload or topic missing");
                }
            });
            aedes.authenticate = (client, username, password, callback) => {
                let pwd = password?password.toString():"";
                config.getMQTTPubAuth()
                    .then(auth => {
                        // User cam be null (local subscribers if no mqtt.subUser is configured),
                        // mqtt.subUser if configured or dataSet/token to publish to topic dataSet                        
                        // Check subscribe authorization
                        client.canSubscribe = false;
                        if (!auth) client.canSubscribe = true;
                        if (auth.user == username && auth.pwd == pwd) client.canSubscribe = true;
                        // Check publish authorization
                        client.canPublish = false;
                        if (username) {
                            if (config.config.dataSets && config.config.dataSets[username]) {
                                let dataSet = config.config.dataSets[username];
                                if (config.config.tokens[pwd]) {
                                    let token = config.config.tokens[pwd];
                                    if (token["dataSet-" + username + "-write"]) {
                                        client.canPublish = true;
                                        client.dataSetCode = username;
                                    }
                                }
                            }
                        }
                        console.log("AEDES AUth", username, pwd, client.canSubscribe, client.canPublish, client.dataSetCode);
                        if (client.canPublish || client.canSubscribe) {
                            callback(null, true);
                        } else {
                            callback(new Error("Not Authorized"), false)
                        }
                    })
                    .catch(error => {
                        console.error(error);
                        logs.error(error.toString());
                    });
            }
            this.aedesServer.listen(config.mqttPort, _ => {
                console.log("[ZRepo] Aedes Plain MQTT Server Listenning at Port " + config.mqttPort);
                logs.info("[ZRepo] Aedes Plain MQTT Server Listenning at Port " + config.mqttPort)
            })
        }
    } catch(error) {
        console.error("Can't start HTTP Server", error);
        logs.error("Can't start server:" + error.toString())
    }
}

startHTTPServer();
 