import {
    Server
} from "@colyseus/core"
import {
    WebSocketTransport
} from "@colyseus/ws-transport"
import {
    DuelRoom
} from "./DuelRoom"
import {
    CardRoom
} from "./CardRoom"

const port = Number(process.env.PORT ?? 2567)
const server = new Server({
    transport: new WebSocketTransport()
})
server.define("duel",
    DuelRoom)
server.define("card",
    CardRoom)
server.listen(port).then(() => console.log(`StarCi League server: ws://localhost:${port}`))
