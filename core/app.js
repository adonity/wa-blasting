import 'dotenv/config'
import express from 'express'
import nodeCleanup from 'node-cleanup'
import routes from './routes.js'
import { init, cleanup, getSession, isExists, formatPhone } from './whatsapp.js'
import { Server } from 'socket.io'
import axios from 'axios'
import { delay, fetchLatestBaileysVersion } from '@adiwajshing/baileys'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const host = process.env.HOST ?? '0.0.0.0'
const port = parseInt(process.env.PORT ?? 3000)

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use('/media', express.static(__dirname + '/media'))
app.use('/', routes)

const { version, isLatest } = await fetchLatestBaileysVersion()
console.log(`using WA web v${version.join('.')}, isLatest: ${isLatest}`)

export const io = new Server(
    app.listen(port, host, () => {
        init()
        console.log(`Server is listening on http://${host}:${port}`)
    }),
    {
        cors: {
            origin: '*',
        },
    }
)

io.on('connection', function (socket) {

    if (socket.handshake.query.ids) {
        const _ids = JSON.parse(socket.handshake.query.ids)

        socket.join(_ids)
    }

    socket.on('disconnect', (reason) => {
    })

    socket.on('broadcast', async ({ devices, contacts, message, id, delay: bdelay }) => {
        console.log(`broadcast ${id} start`)
        let i = 0

        console.log(devices)

        for (const contact of contacts) {
            const device = devices[i]
            const session = getSession(device.id + '')
            const _delay = bdelay.split('-')
            let delaystart = 0
            let delayend = 0

            if (_delay.length > 1) {
                delaystart = parseInt(_delay[0]) / 100
                delayend = parseInt(_delay[1]) / 100
            } else if (_delay.length == 1) {
                delayend = parseInt(_delay[0]) / 100
            }

            const randelay = Math.floor(Math.random() * delayend - delaystart) + delaystart

            if (session != null) {
                try {
                    const number = formatPhone(contact.contact.number)

                    const exists = await isExists(session, number)

                    if (!exists) {
                        updateBlastStatus({ id, device_id: device.id, contact_id: contact.id, status: '0' })
                        continue
                    }

                    await delay(randelay * 100)
                    session.sendMessage(number, message)
                    updateBlastStatus({ id, device_id: device.id, contact_id: contact.id, status: '1' })
                } catch {
                    updateBlastStatus({ id, device_id: device.id, contact_id: contact.id, status: '0' })
                }
            } else {
                updateBlastStatus({ id, device_id: device.id, contact_id: contact.id, status: '0' })
            }

            i = i == devices.length - 1 ? 0 : i + 1
        }
    })

    socket.on('broadcast-new', async ({ blasts, id, delay: bdelay }) => {
        console.log(`broadcast ${id} start`)

        var _break = false
        socket.on('broadcast-break', async ({ id_blast }) => {
            if (id_blast === id) {
                _break = true
            }
        })

        for (const blast of blasts) {
            const session = getSession(blast.device_id + '')
            const _delay = bdelay.split('-')
            let delaystart = 0
            let delayend = 0

            if (_delay.length > 1) {
                delaystart = parseInt(_delay[0]) / 100
                delayend = parseInt(_delay[1]) / 100
            } else if (_delay.length == 1) {
                delayend = parseInt(_delay[0]) / 100
            }

            const randelay = Math.floor(Math.random() * delayend - delaystart) + delaystart

            if (session != null) {
                try {
                    const number = formatPhone(blast.number)

                    const exists = await isExists(session, number)

                    if (!exists) {
                        updateBlastStatus({
                            id,
                            device_id: blast.device_id,
                            contact_id: blast.contact_id,
                            status: '0',
                        })
                        continue
                    }

                    await delay(randelay * 100)

                    if (_break) {
                        break
                    }

                    session.sendMessage(number, blast.message)
                    updateBlastStatus({ id, device_id: blast.device_id, contact_id: blast.contact_id, status: '1' })
                } catch {
                    updateBlastStatus({ id, device_id: blast.device_id, contact_id: blast.contact_id, status: '0' })
                }
            } else {
                updateBlastStatus({ id, device_id: blast.device_id, contact_id: blast.contact_id, status: '0' })
            }
        }
    })
})

const updateBlastStatus = ({ id, device_id, contact_id, status }) => {
    axios
        .post(process.env.SERVER_URL + '/api/blast/status-update', { contact_id, status, device_id, id })
        .then(function (response) {
            io.emit('blast-' + id, { message: { contact_id, status, device_id, id } })
        })
        .catch(function (error) {
            console.log(error)
        })
}

nodeCleanup(cleanup)

export default app
