self.addEventListener('push', function(event) {
  console.log("Event", event)
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  try {
    // Parse the JSON payload sent from your Next.js backend
    const data = event.data.json();

    const options = {
      body: data.body,
      icon: "https://openshift.grras.com/frontassets/img/logo.png",
      // Store the URL so we can open it when the user clicks
      data: { 
        url: data.url 
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (err) {
    console.error('Error parsing push payload:', err);
  }
});

// Handle the click event to open the specific URL
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and navigate
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});