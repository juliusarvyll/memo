<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;
use NotificationChannels\Fcm\FcmChannel;
use NotificationChannels\Fcm\FcmMessage;
use NotificationChannels\Fcm\Resources\AndroidConfig;
use NotificationChannels\Fcm\Resources\AndroidFcmOptions;
use NotificationChannels\Fcm\Resources\AndroidNotification;
use NotificationChannels\Fcm\Resources\ApnsConfig;
use NotificationChannels\Fcm\Resources\ApnsFcmOptions;
use NotificationChannels\Fcm\Resources\WebpushConfig;
use NotificationChannels\Fcm\Resources\WebpushFcmOptions;

class FcmNotification extends Notification
{
    protected $title;
    protected $body;
    protected $data;
    protected $image;

    /**
     * Create a new notification instance.
     */
    public function __construct($title = null, $body = null, $data = [], $image = null)
    {
        $this->title = $title ?? 'New Notification';
        $this->body = $body ?? 'You have received a new notification';
        $this->data = $data;
        $this->image = $image;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return [FcmChannel::class];
    }

    /**
     * Get the FCM representation of the notification.
     */
    public function toFcm(object $notifiable)
    {
        $message = FcmMessage::create()
            ->setNotification([
                'title' => $this->title,
                'body' => $this->body,
                'image' => $this->image,
            ])
            ->setData($this->data);

        // Add Android configuration
        $message->setAndroid(
            AndroidConfig::create()
                ->setNotification(
                    AndroidNotification::create()
                        ->setClickAction(url('/'))
                        ->setTitle($this->title)
                        ->setBody($this->body)
                        ->setIcon('/images/logo.png')
                )
                ->setFcmOptions(
                    AndroidFcmOptions::create()
                        ->setAnalyticsLabel('notification')
                )
        );

        // Add Web Push configuration
        $message->setWebpush(
            WebpushConfig::create()
                ->setNotification([
                    'title' => $this->title,
                    'body' => $this->body,
                    'icon' => '/images/logo.png',
                    'click_action' => url('/'),
                ])
                ->setFcmOptions(
                    WebpushFcmOptions::create()
                        ->setAnalyticsLabel('notification')
                )
        );

        // Add APNS (iOS) configuration
        $message->setApns(
            ApnsConfig::create()
                ->setPayload([
                    'aps' => [
                        'alert' => [
                            'title' => $this->title,
                            'body' => $this->body,
                        ],
                        'sound' => 'default',
                        'badge' => 1,
                    ]
                ])
                ->setFcmOptions(
                    ApnsFcmOptions::create()
                        ->setAnalyticsLabel('notification')
                )
        );

        return $message;
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'body' => $this->body,
            'data' => $this->data,
        ];
    }
}
