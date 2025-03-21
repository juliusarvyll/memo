<!DOCTYPE html>
<html>
<head>
    <title>Service Worker Test</title>
    <meta charset="UTF-8">
</head>
<body>
    <h1>Service Worker Test</h1>
    <div id="output"></div>

    <script>
        const output = document.getElementById('output');

        function log(message) {
            const p = document.createElement('p');
            p.textContent = message;
            output.appendChild(p);
            console.log(message);
        }

        if ('serviceWorker' in navigator) {
            log('Service Worker is supported');

            window.addEventListener('load', function() {
                navigator.serviceWorker.register('/firebase-messaging-sw.js')
                    .then(function(registration) {
                        log('ServiceWorker registration successful with scope: ' + registration.scope);
                    })
                    .catch(function(error) {
                        log('ServiceWorker registration failed: ' + error);
                    });
            });
        } else {
            log('Service Worker is not supported');
        }
    </script>
</body>
</html>
