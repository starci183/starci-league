import {
    createServer
} from "node:http"
import {
    Server,
    matchMaker
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

interface PhaseState {
    phase?: string
}

/** Trận đang diễn ra (draft/playing) có ít nhất một người thật; phòng chỉ có bot coi như rảnh. */
async function countActiveHumanRooms(): Promise<number> {
    const listings = await matchMaker.query({
        name: "card"
    })
    let active = 0
    for (const listing of listings) {
        const room = matchMaker.getLocalRoomById(listing.roomId)
        if (!room || room.clients.length === 0) continue
        const phase = (room.state as PhaseState | undefined)?.phase
        if (phase === "draft" || phase === "playing") active++
    }
    return active
}

const port = Number(process.env.PORT ?? 2567)
const httpServer = createServer((req, res) => {
    if (req.method === "GET" && req.url?.split("?")[0] === "/__host/rooms") {
        countActiveHumanRooms().then((active) => {
            res.writeHead(200,
                {
                    "content-type": "application/json",
                    "cache-control": "no-store"
                })
            res.end(JSON.stringify({
                active
            }))
        }).catch(() => {
            res.writeHead(500,
                {
                    "content-type": "application/json"
                })
            res.end(JSON.stringify({
                error: "query failed"
            }))
        })
        return
    }
    res.writeHead(404)
    res.end()
})
const server = new Server({
    transport: new WebSocketTransport({
        server: httpServer
    })
})
server.define("duel",
    DuelRoom)
server.define("card",
    CardRoom)
server.listen(port).then(() => console.log(`StarCi League server: ws://localhost:${port}`))
