import { existsSync, rmSync, readdir } from 'fs'
import P from 'pino'
import { join } from 'path'
import makeWASocket, {
    delay,
    makeWALegacySocket,
    useSingleFileLegacyAuthState,
    useMultiFileAuthState,
    makeInMemoryStore,
    Browsers,
    DisconnectReason,
    downloadMediaMessage,
    fetchLatestBaileysVersion
} from '@adiwajshing/baileys'
import { toDataURL } from 'qrcode'
import __dirname from './dirname.js'
import response from './response.js'
import axios from 'axios'
import { writeFile } from 'fs/promises'
import { io } from './app.js'
import { SocksProxyAgent } from 'socks-proxy-agent';

const sessions = new Map()
const retries = new Map()

const sessionsDir = (sessionId = '') => {
    return join(__dirname, 'sessions', sessionId ? `${sessionId}.json` : '')
}

const isSessionExists = (sessionId) => {
    return sessions.has(sessionId)
}

const shouldReconnect = (sessionId) => {
    let maxRetries = parseInt(process.env.MAX_RETRIES ?? 0)
    let attempts = retries.get(sessionId) ?? 0

    maxRetries = maxRetries < 1 ? 1 : maxRetries

    if (attempts < maxRetries) {
        ++attempts

        console.log('Reconnecting...', { attempts, sessionId })
        retries.set(sessionId, attempts)

        return true
    }

    return false
}

const createSession = async (sessionId, isLegacy = false, res = null) => {
    const sessionFile = (isLegacy ? 'legacy_' : 'md_') + sessionId + (isLegacy ? '.json' : '')

    const logger = P({ level: 'warn' })
    const store = makeInMemoryStore({ logger })
    let _info = null
    let agent = null

    try {
        const info = await axios.get(process.env.SERVER_URL + '/api/proxy');
        _info =  info.data.length > 0 ?  info.data[getRandomInt(info.data.length - 1)]: false;

        agent = _info ? null : new SocksProxyAgent({
            hostname: _info.host,
            port: _info.port,
            userId: _info.username,
            password: _info.password,
        });
    } catch (error) {
        agent = null
    }

    console.log(_info)


    let state, saveState

    if (isLegacy) {
        ;({ state, saveState } = useSingleFileLegacyAuthState(sessionsDir(sessionFile)))
    } else {
        ;({ state, saveCreds: saveState } = await useMultiFileAuthState(sessionsDir(sessionFile)))
    }

    /**
     * @type {import('@adiwajshing/baileys').CommonSocketConfig}
     */
    const { version } = await fetchLatestBaileysVersion()
    const waConfig = agent != null ? {
        auth: state,
        printQRInTerminal: false,
        logger,
        browser: Browsers.macOS('Safari'),
        version,
        agent:agent
    } :  {
        auth: state,
        printQRInTerminal: false,
        logger,
        browser: Browsers.macOS('Safari'),
        version
    }


    /**
     * @type {import('@adiwajshing/baileys').AnyWASocket}
     */
    const wa = isLegacy ? makeWALegacySocket(waConfig) : makeWASocket.default(waConfig)

    if (!isLegacy) {
        store.readFromFile(sessionsDir(`${sessionId}_store.json`))
        store.bind(wa.ev)
    }

    sessions.set(sessionId, { ...wa, store, isLegacy })

    wa.ev.on('creds.update', saveState)

    wa.ev.on('chats.set', ({ chats }) => {
        if (isLegacy) {
            store.chats.insertIfAbsent(...chats)
        }
    })

    wa.ev.on('messages.upsert', async (m) => {
        const caMin = 4000
        const caMax = 10000
        const ranca = Math.floor(Math.random() * (caMax - caMin) + caMin)

        const message = m.messages[0]
        const messageType = Object.keys(message.message)[0]

        console.log(JSON.stringify(message))

        var data = {
            number: message.key.remoteJid,
            text: message.message.conversation,
            id_device: sessionId,
            time: message.messageTimestamp,
            push_name: message.pushName,
            link: null,
            me: 0,
        }


        if (message.message.extendedTextMessage) data.text = message.message.extendedTextMessage.text
        if (message.message.templateButtonReplyMessage)
            data.text = message.message.templateButtonReplyMessage.selectedDisplayText
        if (message.message.imageMessage)
            data.text = message.message.imageMessage.caption

        if (message.key.fromMe) data.me = 1

        if (messageType === 'imageMessage') {
            // download the message
            const buffer = await downloadMediaMessage(
                message,
                'buffer',
                {},
                {
                    logger: P().child({ level: 'debug', stream: 'store' }),
                    // pass this so that baileys can request a reupload of media
                    // that has been deleted
                    reuploadRequest: wa.updateMediaMessage,
                }
            )
            // save to file
            await writeFile('./media/' + message.key.id + '.jpg', buffer)
            data.link = message.key.id + '.jpg'
        }

        if (data.number.endsWith('@s.whatsapp.net'))
            axios
                .post(process.env.SERVER_URL + '/api/inbox', data)
                .then(function (response) {
                    console.log(response.data.data)
                    if (data.me != 1) io.to(parseInt(sessionId)).emit('pesan-baru', { message: response.data.data })
                })
                .catch(function (error) {
                    console.log(error)
                })
            await delay(ranca);
            await wa.readMessages([message.key])
    })

    wa.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        const statusCode = lastDisconnect?.error?.output?.statusCode

        // console.log(update)
        // console.log(sessionId)

        if (connection === 'open') {
            axios
                .post(process.env.SERVER_URL + '/api/device/status-update/' + sessionId, {
                    status: 'connected',
                    qrcode: ' ',
                    proxy: _info ? (_info.host + ":" + _info.port) : null
                })
                .then(function (response) {
                    // console.log(response)
                })
                .catch(function (error) {
                    // console.log(error)
                })
            retries.delete(sessionId)
        }

        if (connection === 'close') {
            if (statusCode === DisconnectReason.loggedOut || !shouldReconnect(sessionId)) {
                if (res && !res.headersSent) {
                    response(res, 500, false, 'Unable to create session.')
                }

                axios
                    .post(process.env.SERVER_URL + '/api/device/status-update/' + sessionId, {
                        status: 'disconnected',
                        qrcode: ' ',
                        proxy: null
                    })
                    .then(function (response) {
                        // console.log(response)
                    })
                    .catch(function (error) {
                        // console.log(error)
                    })
                return deleteSession(sessionId, isLegacy)
            }

            setTimeout(
                () => {
                    console.log('reconnecting')
                    createSession(sessionId, isLegacy, res)
                },
                statusCode === DisconnectReason.restartRequired ? 0 : parseInt(process.env.RECONNECT_INTERVAL ?? 0)
            )
        }

        if (update.qr) {
            if (res && !res.headersSent) {
                try {
                    const qr = await toDataURL(update.qr, {
                        type: 'image/webp',
                        rendererOpts: {
                            quality: 0.8,
                        },
                        width: 200,
                    })

                    axios
                        .post(process.env.SERVER_URL + '/api/device/status-update/' + sessionId, {
                            status: 'disconnected',
                            qrcode: qr,
                            proxy: _info ? (_info.host + ":" + _info.port) : null
                        })
                        .then(function (response) {
                            // console.log(response)
                        })
                        .catch(function (error) {
                            // console.log(error)
                        })
                    response(res, 200, true, 'QR code received, please scan the QR code.', { qr })
                } catch {
                    response(res, 500, false, 'Unable to create QR code.')
                }

                return
            }

            try {
                await wa.logout()
            } catch {
            } finally {
                deleteSession(sessionId, isLegacy)
            }
        }
    })
}

const getSession = (sessionId) => {
    return sessions.get(sessionId) ?? null
}

const deleteSession = (sessionId, isLegacy = false) => {
    const sessionFile = (isLegacy ? 'legacy_' : 'md_') + sessionId + (isLegacy ? '.json' : '')
    const storeFile = `${sessionId}_store.json`
    const rmOptions = { force: true, recursive: true }

    rmSync(sessionsDir(sessionFile), rmOptions)
    rmSync(sessionsDir(storeFile), rmOptions)

    sessions.delete(sessionId)
    retries.delete(sessionId)
}

const getChatList = (sessionId, isGroup = false) => {
    const filter = isGroup ? '@g.us' : '@s.whatsapp.net'

    return getSession(sessionId).store.chats.filter((chat) => {
        return chat.id.endsWith(filter)
    })
}

const isExists = async (session, jid, isGroup = false) => {
    try {
        let result

        if (isGroup) {
            result = await session.groupMetadata(jid)

            return Boolean(result.id)
        }

        if (session.isLegacy) {
            result = await session.onWhatsApp(jid)
        } else {
            ;[result] = await session.onWhatsApp(jid)
        }

        return result.exists
    } catch {
        return false
    }
}

const sendMessage = async (session, receiver, message) => {
    try {
        await delay(100);
        await session.sendPresenceUpdate('composing', receiver)
        await delay(700);
        await session.sendPresenceUpdate('paused', receiver)
        await delay(600);
        await session.sendPresenceUpdate('composing', receiver)
        await delay(500);
        await session.sendPresenceUpdate('composing', receiver)
        return session.sendMessage(receiver, message)
    } catch {
        return Promise.reject(null)
    }
}

const getProfile = async (session, receiver) => {
    try {
        return await session.profilePictureUrl(receiver)
    } catch {
        return Promise.reject(null)
    }
}

const formatPhone = (phone) => {
    if (phone.endsWith('@s.whatsapp.net')) {
        return phone
    }

    let formatted = phone.replace(/\D/g, '')

    return (formatted += '@s.whatsapp.net')
}

const formatGroup = (group) => {
    if (group.endsWith('@g.us')) {
        return group
    }

    let formatted = group.replace(/[^\d-]/g, '')

    return (formatted += '@g.us')
}

const cleanup = () => {
    console.log('Running cleanup before exit.')

    sessions.forEach((session, sessionId) => {
        if (!session.isLegacy) {
            session.store.writeToFile(sessionsDir(`${sessionId}_store.json`))
        }
    })
}

const init = () => {
    readdir(sessionsDir(), (err, files) => {
        if (err) {
            throw err
        }

        for (const file of files) {
            if ((!file.startsWith('md_') && !file.startsWith('legacy_')) || file.endsWith('_store')) {
                continue
            }

            const filename = file.replace('.json', '')
            const isLegacy = filename.split('_', 1)[0] !== 'md'
            const sessionId = filename.substring(isLegacy ? 7 : 3)

            createSession(sessionId, isLegacy)
        }
    })
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

export {
    isSessionExists,
    createSession,
    getSession,
    deleteSession,
    getChatList,
    isExists,
    sendMessage,
    formatPhone,
    formatGroup,
    getProfile,
    cleanup,
    init,
}
