const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const axios = require("axios");
const settings = require("./settings");

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        auth: state,
        version
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages[0];
        if (!m.message || !m.key.remoteJid) return;
        const from = m.key.remoteJid;
        const text = m.message.conversation || m.message.extendedTextMessage?.text;

        if (!text) return;

        // .hack command
        if (text.startsWith(".hack") && settings.hackPrank) {
            let reply = `🔐 Starting hack...\n💻 Bypassing security...\n📂 Cracking password...\n✅ Hacked successfully! 😂`;
            await sock.sendMessage(from, { text: reply });
        }

        // .weather command
        if (text.startsWith(".weather") && settings.weather) {
            let city = text.replace(".weather", "").trim();
            if (!city) return sock.sendMessage(from, { text: "🌍 Please enter a city name!" });
            try {
                let res = await axios.get(`https://wttr.in/${city}?format=3`);
                await sock.sendMessage(from, { text: `☁️ Weather in ${city}: ${res.data}` });
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ Couldn't fetch weather info." });
            }
        }

        // Settings menu
        if (text === ".settings") {
            let msg = `⚙️ Bot Settings:\n\nHack Prank: ${settings.hackPrank ? "✅ On" : "❌ Off"}\nWeather: ${settings.weather ? "✅ On" : "❌ Off"}\nDeleted Voices Inbox: ${settings.deletedVoices ? "✅ On" : "❌ Off"}`;
            await sock.sendMessage(from, { text: msg });
        }
    });

    // Anti-delete (voice notes into inbox)
    sock.ev.on("messages.delete", async (item) => {
        if (!settings.deletedVoices) return;
        const msg = item.keys[0];
        if (msg && msg.remoteJid) {
            await sock.sendMessage(msg.remoteJid, { text: "🎙️ Someone deleted a voice note, but I saved it in inbox! 😉" });
        }
    });
}

startBot();
