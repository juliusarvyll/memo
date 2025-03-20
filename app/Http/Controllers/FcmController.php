<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\FcmToken;
use App\Services\FcmService;
use Inertia\Inertia;

class FcmController extends Controller
{
    public function registerToken(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
            'user_id' => 'nullable|exists:users,id'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Store the token
        FcmToken::updateOrCreate(
            ['token' => $request->token],
            [
                'user_id' => $request->user_id,
                'device_type' => 'web',
                'active' => true
            ]
        );

        return response()->json(['success' => true]);
    }

    public function unregisterToken(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Delete the token
        FcmToken::where('token', $request->token)->delete();

        return response()->json(['success' => true]);
    }

    public function sendTestNotification(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
            'user_id' => 'nullable|exists:users,id'
        ]);

        if ($validator->fails()) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            return Inertia::render('NotificationTest', [
                'testResult' => [
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ]
            ]);
        }

        try {
            // Inject the FcmService
            $fcmService = app(FcmService::class);

            // Send a test notification to the specific token
            $result = $fcmService->sendToToken(
                $request->token,
                'SPUP eMemo Test Notification',
                'This is a test notification from SPUP eMemo.',
                [
                    'test' => true,
                    'timestamp' => now()->toDateTimeString(),
                    'url' => url('/')
                ]
            );

            if ($result) {
                if ($request->wantsJson()) {
                    return response()->json([
                        'success' => true,
                        'message' => 'Test notification sent successfully'
                    ]);
                }

                return Inertia::render('NotificationTest', [
                    'testResult' => [
                        'success' => true,
                        'message' => 'Test notification sent successfully'
                    ]
                ]);
            } else {
                if ($request->wantsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Failed to send test notification'
                    ]);
                }

                return Inertia::render('NotificationTest', [
                    'testResult' => [
                        'success' => false,
                        'message' => 'Failed to send test notification'
                    ]
                ]);
            }
        } catch (\Exception $e) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error sending test notification: ' . $e->getMessage()
                ], 500);
            }

            return Inertia::render('NotificationTest', [
                'testResult' => [
                    'success' => false,
                    'message' => 'Error sending test notification: ' . $e->getMessage()
                ]
            ]);
        }
    }
}
