var WebSocketServer = require('ws').Server
    , http = require('http')
    , express = require('express')
    , app = express();

app.use(express.static(__dirname + '/'));
var server = http.createServer(app);
var wss = new WebSocketServer({server:server});

//Websocket接続を保存しておく
var connections = [];

//接続時
wss.on('connection', function (ws) {
    //配列にWebSocket接続を保存
    connections.push(ws);
    //切断時
    ws.on('close', function () {
        connections = connections.filter(function (conn, i) {
            return (conn === ws) ? false : true;
        });
    });

    ws.on("message", message => {
        console.log("Received: " + message);
    });

    function intervalFunc() {
        ws.send('Server sending message!');
    }

    setInterval(intervalFunc, 1500);

});

server.listen(3000);