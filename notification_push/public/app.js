document
    .getElementById("subscribe")
    .addEventListener("click", subscribeToNotifications);
document
    .getElementById("notificationForm")
    .addEventListener("submit", sendNotification);
document
    .getElementById("unsubscribe")
    .addEventListener("click", unsubscribeFromNotifications);

document.getElementById("maxNotifications").addEventListener("input", function () {
    const maxNotifications = parseInt(this.value, 10);
    document.getElementById("max-notifications").textContent = maxNotifications;
});


async function subscribeToNotifications() {
    try {
        const registration = await navigator.serviceWorker.register(
            "service-worker.js"
        );
        console.log("Service Worker registered with scope:", registration.scope);
        const permission = await Notification.requestPermission();

        if (permission === "granted") {
            updateUIForPushEnabled();
            const vapidPublicKey = await getVapidPublicKey();
            const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
            const pushSubscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey,
            });
            console.log(
                "Received PushSubscription:",
                JSON.stringify(pushSubscription)
            );
            await sendSubscriptionToBackEnd(pushSubscription);

            registration.showNotification("Service Worker", {
                body: "Le Service Worker est prêt !",
                icon: "./images/bell.png",
                badge: "./images/badge.png",
            });
        } else {
            updateUIForPushPermissionRequired();
        }
    } catch (error) {
        console.error("Failed:", error);
    }
}
async function updateNotificationCountUI() {
    try {
        const response = await fetch("/notification-count");
        const data = await response.json();
        const { count } = data;
        const maxNotifications = parseInt(document.getElementById("maxNotifications").value, 10);

        document.getElementById("notification-count").textContent = count;
        document.getElementById("max-notifications").textContent = maxNotifications;

        if (count >= maxNotifications) {
            updateUIForMaxNotificationsReached();
        }
    } catch (error) {
        console.error("Failed to fetch notification count:", error);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await updateNotificationCountUI();
});

function sendNotification(event) {
    event.preventDefault();

    const count = parseInt(document.getElementById("notification-count").textContent, 3);
    const maxNotifications = parseInt(document.getElementById("maxNotifications").value, 3);

    if (count >= maxNotifications) {
        alert("Maximum notification limit reached!");
        return;
    }
    const title = document.getElementById("title").value;
    const message = document.getElementById("message").value;

    fetch("/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message }),
    })
        .then((response) => {
            if (!response.ok) {
                return response.json().then((data) => {
                    throw new Error(data.error || "Failed to send notification");
                });
            }
            event.target.reset();
            updateNotificationCountUI(); // Update UI after sending notification
        })
        .catch((err) => {
            console.error("Failed to send notification:", err);
            alert(err.message || "Failed to send notification.");
        });
}
function sendSubscriptionToBackEnd(subscription) {
    return fetch("/subscribe", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription),
    })
        .then(function (response) {
            if (!response.ok) {
                throw new Error("Bad status code from server.");
            }
            return response.json();
        })
        .then(function (responseData) {
            if (!(responseData.data && responseData.data.success)) {
                console.log("🚀 ~ file: app.js:93 ~ responseData:", responseData);
                throw new Error("Bad response from server.");
            }
        });
}

async function unsubscribeFromNotifications() {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            await subscription.unsubscribe();

            await fetch("/unsubscribe", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(subscription),
            });
            console.log("User is unsubscribed.");

            document.getElementById("unsubscribe").classList.add("hidden");
            document.getElementById("subscribe").classList.remove("hidden");

            document.getElementById("subscription-status").textContent =
                "Statut : Non abonné";
            document.getElementById("form-container").style.display = "none";
        }
    } catch (error) {
        console.error("Error unsubscribing", error);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch("/notification-count");
        const data = await response.json();
        const { count } = data;
        const maxNotifications = parseInt(document.getElementById("maxNotifications").value, 10);

        document.getElementById("notification-count").textContent = count;
        document.getElementById("max-notifications").textContent = maxNotifications;

        if (count >= maxNotifications) {
            updateUIForMaxNotificationsReached();
        }
    } catch (error) {
        console.error("Failed to fetch notification count:", error);
    }
});

function updateUIForMaxNotificationsReached() {
    const subscribeButton = document.getElementById("subscribe");
    subscribeButton.disabled = true;
    subscribeButton.textContent = "Max Notifications Reached";
}

function updateUIForPushEnabled() {
    const subscribeButton = document.getElementById("subscribe");
    const unsubscribeButton = document.getElementById("unsubscribe");
    const subscriptionStatus = document.getElementById("subscription-status");
    const formContainer = document.getElementById("form-container");

    subscribeButton.textContent = "Notifications activées";
    subscriptionStatus.textContent = "Statut : Abonné";

    subscribeButton.classList.add("hidden");
    unsubscribeButton.classList.remove("hidden");

    formContainer.style.display = "block";
}

function updateUIForPushPermissionRequired() {
    const subscribeButton = document.getElementById("subscribe");
    const unsubscribeButton = document.getElementById("unsubscribe");
    const subscriptionStatus = document.getElementById("subscription-status");

    subscribeButton.textContent = "Notifications rejetées";
    subscriptionStatus.textContent = "Statut : Bloqué";

    subscribeButton.disabled = true;
    subscribeButton.classList.add("rejected");
    unsubscribeButton.classList.add("hidden");
}

async function getVapidPublicKey() {
    try {
        const response = await fetch("/vapidPublicKey");
        const data = await response.json();
        return data.publicKey;
    } catch (error) {
        console.error("Error fetching VAPID public key:", error);
    }
}

/**
 * Conversion de la clef VAPID pour la subscription
 * @param base64String
 * @returns {Uint8Array}
 */
function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, "+")
        .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
