<?php

namespace App\Notifications;

use App\Models\Memo;
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

class MemoNotification extends Notification
{
    protected $memo;
    protected $action;

    /**
     * Create a new notification instance.
     */
    public function __construct(Memo $memo, string $action = 'published')
    {
        $this->memo = $memo;
        $this->action = $action;
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
        $title = $this->getTitle();
        $body = $this->getBody();

        $message = FcmMessage::create()
            ->setNotification([
                'title' => $title,
                'body' => $body,
                'image' => $this->memo->image ? url('/storage/' . $this->memo->image) : null,
            ])
            ->setData([
                'memo_id' => (string)$this->memo->id,
                'action' => $this->action,
                'url' => url('/memos/' . $this->memo->id),
                'timestamp' => now()->timestamp,
            ]);

        // Add Android configuration
        $message->setAndroid(
            AndroidConfig::create()
                ->setNotification(
                    AndroidNotification::create()
                        ->setClickAction(url('/memos/' . $this->memo->id))
                        ->setTitle($title)
                        ->setBody($body)
                        ->setIcon('/images/logo.png')
                )
                ->setFcmOptions(
                    AndroidFcmOptions::create()
                        ->setAnalyticsLabel('memo_notification')
                )
        );

        // Add Web Push configuration
        $message->setWebpush(
            WebpushConfig::create()
                ->setNotification([
                    'title' => $title,
                    'body' => $body,
                    'icon' => '/images/logo.png',
                    'click_action' => url('/memos/' . $this->memo->id),
                ])
                ->setFcmOptions(
                    WebpushFcmOptions::create()
                        ->setAnalyticsLabel('memo_notification')
                )
        );

        // Add APNS (iOS) configuration
        $message->setApns(
            ApnsConfig::create()
                ->setPayload([
                    'aps' => [
                        'alert' => [
                            'title' => $title,
                            'body' => $body,
                        ],
                        'sound' => 'default',
                        'badge' => 1,
                    ]
                ])
                ->setFcmOptions(
                    ApnsFcmOptions::create()
                        ->setAnalyticsLabel('memo_notification')
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
            'memo_id' => $this->memo->id,
            'title' => $this->getTitle(),
            'body' => $this->getBody(),
            'action' => $this->action,
        ];
    }

    /**
     * Get notification title based on action
     */
    protected function getTitle(): string
    {
        switch ($this->action) {
            case 'published':
                return 'New SPUP eMemo Update';
            case 'updated':
                return 'SPUP eMemo Update';
            default:
                return 'SPUP eMemo Notification';
        }
    }

    /**
     * Get notification body based on action
     */
    protected function getBody(): string
    {
        $title = $this->memo->title;

        switch ($this->action) {
            case 'published':
                return "New memo published: {$title}";
            case 'updated':
                return "A memo has been updated: {$title}";
            default:
                return $title;
        }
    }
}
