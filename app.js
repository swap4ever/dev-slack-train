const { App } = require("@slack/bolt");
require("dotenv").config();

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true
});

const CHANNEL_ID = process.env.CHANNEL_ID;

let queue = [];
let current = null;

(async () => {

    await app.start(process.env.PORT);

    app.command("/up", async (props) => {
        try {
            await props.ack();

            const txt = props.command.text.toUpperCase().trim();
            const user_id = props.command.user_id;
            const user_name = props.command.user_name;
            const channel_id = props.command.channel_id;
            const channel_name = props.command.channel_name;

            const isInQueue = queue.findIndex(e => e.txt == txt && e.user_id == user_id);
            if (isInQueue >= 0) return;

            queue.push({
                txt,
                user_id,
                user_name,
                channel_id,
                channel_name,
                created_at: new Date(),
            });

            await app.client.chat.postMessage({
                channel: CHANNEL_ID,
                text: `<@${user_name}> 🤠 se ha subido al tren de dev! chu-chu! número de asiento ${queue.length}`
            });

            await attendTrain();

        } catch (error) {
            console.log("err")
            console.error(error);
        }
    });

    app.command("/down", async (props) => {
        try {
            await props.ack();

            const txt = props.command.text.toUpperCase().trim();
            const user_id = props.command.user_id;
            const user_name = props.command.user_name;

            if (current) {
                if (current.user_id == user_id &&
                    current.txt == txt) {
                    current = null;
                    await app.client.chat.postMessage({
                        channel: CHANNEL_ID,
                        text: `<@${user_name}> 🦾 ha terminado tu viaje, gracias por viajar con nosotros ✌️! chu-chu!`
                    });
                    await attendTrain();
                    return;
                }
            }

            const isInQueue = queue.findIndex(e => e.txt == txt && e.user_id == user_id);
            if (isInQueue >= 0) {
                queue.splice(isInQueue, 1);
                await app.client.chat.postMessage({
                    channel: CHANNEL_ID,
                    text: `<@${user_name}> 🤡 se ha bajado del tren de dev! coff-coff`
                });
                await nextPassengers();
                return;
            }

        } catch (error) {
            console.log("err")
            console.error(error);
        }
    });

    async function attendTrain() {
        if (queue.length && current == null) {
            current = queue.shift();
            await attendCurrent();
        }
        await nextPassengers();
    }

    async function attendCurrent() {
        await app.client.chat.postMessage({
            channel: CHANNEL_ID,
            text: `<@${current.user_name}> 🔥 el tren ha llegado para ti! directo sin escalas a ${current.txt} chu-chu!`,
        });
        // bash script
        // 
    }

    async function nextPassengers() {
        const passengers = [];
        for (let index = 0; index < 3; index++) {
            const next = queue[index];
            if (next)
                passengers.push(`<@${next.user_name}>`);
            else
                break;
        }
        if (passengers.length) {
            await app.client.chat.postMessage({
                channel: CHANNEL_ID,
                text: `Alistense señor@s! son los siguientes! chu-chu! ` + passengers.join(' ~ ')
            });
        } else {
            if (current == null) {
                await app.client.chat.postMessage({
                    channel: CHANNEL_ID,
                    text: `Ya no hay pasajeros 😎 buen trabajo equipo! nos merecemos un descanso! 🍺`
                });
            }
        }
    }

    console.log(`⚡️ Slack Bolt app is running on port ${process.env.PORT}!`);

})(app);