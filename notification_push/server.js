require("dotenv").config();
const express = require("express");
const webPush = require("web-push");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 5000;
let db = new sqlite3.Database("./subscriptions.db");

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS subscriptions (endpoint TEXT, p256dh TEXT, auth TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS notificationCount (count INTEGER)");
    db.run("INSERT INTO notificationCount (count) VALUES (0)", [], (err) => {
        if (err) console.error("Failed to initialize count:", err);
    });
});


const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

webPush.setVapidDetails(
    "mailto:sohaib.elmediouni23@gmail.com",
    vapidPublicKey,
    vapidPrivateKey
);

app.use(express.static("public"));
app.use(bodyParser.json());

app.get("/vapidPublicKey", (req, res) => {
    res.status(200).json({ publicKey: vapidPublicKey });
});

app.post("/subscribe", (req, res) => {
    const subscription = req.body;
    db.run(
        "INSERT INTO subscriptions (endpoint, p256dh, auth) VALUES (?, ?, ?)",
        [subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth],
        (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Failed to subscribe" });
            }
            res.status(201).json({ data: { success: true } });
        }
    );
});

app.get("/notification-count", (req, res) => {
    db.get("SELECT count FROM notificationCount LIMIT 1", [], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Failed to retrieve count" });
        }
        res.json(row ? row : { count: 0 });
    });
});

app.post("/send-notification", (req, res) => {
    const { maxNotifications, title, message } = req.body;

    db.get("SELECT count FROM notificationCount LIMIT 1", [], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Failed to retrieve count" });
        }

        if (row && row.count >= maxNotifications) {
            return res.status(400).json({ error: "Max notifications reached" });
        }

        const notificationPayload = {
            notification: {
                title: req.body.title,
                body: req.body.message,
                icon: "./images/bell.png",
                badge: "./images/badge.png",
            },
        };

        db.all("SELECT * FROM subscriptions", [], (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Failed to retrieve subscriptions" });
            }

            const promises = rows.map((row) => {
                const subscription = {
                    endpoint: row.endpoint,
                    keys: {
                        p256dh: row.p256dh,
                        auth: row.auth,
                    },
                };

                return webPush
                    .sendNotification(subscription, JSON.stringify(notificationPayload))
                    .catch((err) => {
                        console.error("Failed to send notification:", err);
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            return new Promise((resolve, reject) => {
                                db.run(
                                    "DELETE FROM subscriptions WHERE endpoint = ?",
                                    [row.endpoint],
                                    (deleteErr) => {
                                        if (deleteErr) {
                                            console.error("Failed to delete subscription:", deleteErr);
                                            reject(deleteErr);
                                        } else {
                                            console.log(`Subscription ${row.endpoint} deleted.`);
                                            resolve();
                                        }
                                    }
                                );
                            });
                        } else {
                            return Promise.reject(err);
                        }
                    });
            });

            Promise.all(promises)
                .then(() => {
                    db.run("UPDATE notificationCount SET count = count + 1 WHERE rowid = 1", [], (err) => {
                        if (err) {
                            console.error("Failed to update count:", err);
                        }
                    });
                    res.sendStatus(200);
                })
                .catch((err) => {
                    console.error("Error sending notifications:", err);
                    res.sendStatus(500);
                });
        });
    });
});


app.get("/subscriptions", (req, res) => {
    db.all("SELECT * FROM subscriptions", [], (err, rows) => {
        if (err) {
            console.error(err);
            return res
                .status(500)
                .json({ error: "Failed to retrieve subscriptions" });
        }
        res.json(rows);
    });
});

app.post('/unsubscribe', (req, res) => {
    const subscription = req.body;
    db.run("DELETE FROM subscriptions WHERE endpoint = ?", [subscription.endpoint], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to unsubscribe' });
        }
        res.status(200).json({ data: { success: true } });
    });
});

app.post('/reset-count', async (req, res) => {
    try {

        await db.collection('notifications').updateOne({}, { $set: { count: 0 } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reset the count' });
    }
});


app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
