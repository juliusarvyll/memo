<?php

return [
    /*
     * Your Firebase project credentials
     */
    'credentials' => [
        'file' => storage_path('memo-auth.json'),
    ],

    /*
     * Default project ID if not specified in the notification
     */
    'project_id' => env('FIREBASE_PROJECT_ID', 'memo-notifications'),

    /*
     * Default VAPID key for web push notifications
     */
    'vapid_key' => env('FIREBASE_VAPID_KEY', 'BGZrqo2reX29cRLUfpir0-hsHGqA0zEeNcHbggbeVcaVg2tvdfTw55bKZQpdRsDSe3hvwvivmMViIRvKCzA7k3o'),

    /*
     * If you want to re-use an existing Firebase app instance,
     * set the name of the app here. Otherwise, leave it null.
     */
    'firebase_app' => 'app',

    /*
     * When using the FCM HTTP V1 API, this is an optional service URL
     * to override the default production environment.
     */
    'service_url' => null,
];
