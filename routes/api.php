<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\FCMController;
use App\Http\Controllers\FirebaseController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// FCM Routes
Route::post('/fcm/validate-token', function (Request $request) {
    try {
        // Get Firebase instance from the service container
        $firebase = app('firebase.messaging');

        // Validate the token by trying to send a dry run message
        // This tests if the kreait/firebase PHP package is properly configured
        $message = \Kreait\Firebase\Messaging\CloudMessage::withTarget('token', $request->token)
            ->withNotification(['title' => 'Test', 'body' => 'This is a test'])
            ->withData(['test' => 'true']);

        // Use dry run to avoid actually sending a message
        $firebase->send($message);

        return response()->json(['success' => true, 'message' => 'Firebase integration is working properly']);
    } catch (\Exception $e) {
        return response()->json(
            ['success' => false, 'message' => 'Firebase integration error: ' . $e->getMessage()],
            500
        );
    }
});

// Firebase Cloud Messaging Routes
Route::prefix('fcm')->group(function () {
    Route::post('register-token', [FirebaseController::class, 'registerToken'])
        ->middleware('auth:sanctum');
    Route::post('unregister-token', [FirebaseController::class, 'unregisterToken'])
        ->middleware('auth:sanctum');
    Route::post('test-notification', [FirebaseController::class, 'sendTestNotification'])
        ->middleware('auth:sanctum');
    Route::post('validate-token', [FirebaseController::class, 'validateToken'])
        ->middleware('auth:sanctum');
});
