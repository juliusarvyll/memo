Route::middleware(['cors'])->prefix('fcm')->group(function () {
    Route::post('/register-token', [FcmController::class, 'registerToken']);
    Route::post('/unregister-token', [FcmController::class, 'unregisterToken']);
    Route::post('/test-notification', [FcmController::class, 'sendTestNotification']);
});
