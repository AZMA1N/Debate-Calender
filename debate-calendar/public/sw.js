self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();

  const title = data.title || "Debate reminder";
  const options = {
    body: data.body || "",
    data: { url: data.url || "/" },
    icon: "/favicon.ico",
    badge: "/favicon.ico",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
      return undefined;
    }),
  );
});
