<?php

namespace App\Services;

use App\Models\FcmToken;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FcmService
{
    private $serverKey;
    private $sendUrl = 'https://fcm.googleapis.com/fcm/send';

    public function __construct()
    {
        $this->serverKey = config('services.firebase.server_key');

        // Log the key (partial for security)
        if ($this->serverKey) {
            $maskedKey = substr($this->serverKey, 0, 5) . '...' . substr($this->serverKey, -5);
            Log::info('FCM Server Key loaded: ' . $maskedKey);
        } else {
            Log::warning('FCM Server Key not found in config');
        }
    }

    public function sendToTopic($topic, $title, $body, $data = [])
    {
        return $this->sendNotification([
            'to' => "/topics/{$topic}",
            'notification' => [
                'title' => $title,
                'body' => $body,
                'sound' => 'default',
                'badge' => '1',
            ],
            'data' => $data
        ]);
    }

    public function sendToToken($token, $title, $body, $data = [])
    {
        return $this->sendNotification([
            'to' => $token,
            'notification' => [
                'title' => $title,
                'body' => $body,
                'sound' => 'default',
                'badge' => '1',
            ],
            'data' => $data
        ]);
    }

    public function sendToAllUsers($title, $body, $data = [])
    {
        $tokens = FcmToken::where('active', true)->pluck('token')->toArray();

        if (empty($tokens)) {
            return false;
        }

        return $this->sendNotification([
            'registration_ids' => $tokens,
            'notification' => [
                'title' => $title,
                'body' => $body,
                'sound' => 'default',
                'badge' => '1',
            ],
            'data' => $data
        ]);
    }

    private function sendNotification(array $data)
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'key=' . $this->serverKey,
                'Content-Type' => 'application/json'
            ])->post($this->sendUrl, $data);

            if ($response->successful()) {
                Log::info('FCM notification sent successfully', ['response' => $response->json()]);
                return true;
            } else {
                Log::error('FCM notification failed', ['response' => $response->json()]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error('FCM notification exception', ['error' => $e->getMessage()]);
            return false;
        }
    }
}
