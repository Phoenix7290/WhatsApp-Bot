const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

console.log("initializing");

const client = new Client({
    authStrategy: new LocalAuth(),
    takeoverOnConflict: true,
});

client.on("qr", (qr) => {
    console.log("qring");
    qrcode.generate(qr, { small: true });
    console.log("qred");
});

client.on("ready", () => {
    console.log("server is running");
});

client.on("message_create", async (message) => {
    if (message.from === "status@broadcast") return;

    const chat = await message.getChat();
    if (!chat.isGroup) return;

    console.log("Group chat:", chat.name);

    if (message.body === "/everyone") {
        const participants = await chat.participants;
        let partic = {};

        for (const participant of participants) {
            if (participant.id._serialized === message._data.id.participant) {
                partic = participant;
                break;
            }
        }
        if (!partic.isAdmin) return;

        let mentions = [];
        let text = "Mensagem para todos:\n";

        for (const participant of participants) {
            const contact = await client.getContactById(participant.id._serialized);
            mentions.push(contact.id._serialized);
            text += `@${contact.id.user} `;
        }

        chat.sendStateTyping();
        await chat.sendMessage(text, { mentions: mentions });
        chat.clearState();
    }

    // Check if the message is "/delete"
    if (message.body === "/delete") {
        const participants = await chat.participants;
        let partic = {};

        // Check if the sender is an Admin
        for (const participant of participants) {
            if (participant.id._serialized === message._data.id.participant) {
                partic = participant;
                break;
            }
        }
        if (!partic.isAdmin) return;

        // Fetch the last 10 messages from the group chat
        let messages = await chat.fetchMessages({ limit: 11 }); // 11 to include the delete command

        // Sort messages by timestamp to ensure the order is correct
        messages.sort((a, b) => b.timestamp - a.timestamp);

        // Filter out the /delete command itself
        const messagesToDelete = messages.filter(msg => msg.id._serialized !== message.id._serialized);

        // Delete each message in order from the oldest to the most recent
        for (const msg of messagesToDelete.slice(0, 10)) {
            try {
                await msg.delete(true);
                console.log(`Deleted message: ${msg.body}`);
            } catch (error) {
                console.error(`Failed to delete message: ${msg.body}`, error);
            }
        }
    }
});

client.initialize();
