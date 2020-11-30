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
            console.log("[ZRepo HTTP Server] Listenning at Port " + port);
            logs.info("[ZRepo HTTP Server] Listenning at Port " + port)
        });
    } catch(error) {
        console.error("Can't start HTTP Server", error);
        logs.error("Can't start server:" + error.toString())
    }
}

startHTTPServer();
 