<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\WelcomeController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

// Dashboard for authenticated users
Route::get('/', function () {
    return Inertia::render('Dashboard', [
        'memos' => App\Models\Memo::with(['author:id,name,avatar'])
            ->where('is_published', true)
            ->orderBy('published_at', 'desc')
            ->get(),
    ]);
})->name('dashboard');

// Authenticated routes
Route::get('/memos', [DashboardController::class, 'memos'])->name('memos.index');
Route::get('/memos/{memo}', [DashboardController::class, 'show'])->name('memos.show');

// Include auth routes
require __DIR__.'/auth.php';

// Test route that filters out RFC 2606 reserved domains
Route::get('/test-valid-emails-only', function () {
    $memo = \App\Models\Memo::latest()->first();

    if (!$memo) {
        return 'No memo found for testing.';
    }

    try {
        // Get all users
        $users = \App\Models\User::all();

        $invalidDomains = ['example.com', 'example.net', 'example.org', 'test.com', 'localhost.com', 'invalid.com'];

        $sentCount = 0;
        $skippedCount = 0;
        $validEmails = [];

        foreach ($users as $user) {
            if (empty($user->email)) {
                $skippedCount++;
                continue;
            }

            // Check if domain is invalid
            $domain = explode('@', $user->email)[1] ?? '';
            if (in_array($domain, $invalidDomains) || str_contains($domain, 'example') || str_contains($domain, 'test')) {
                \Illuminate\Support\Facades\Log::warning('Skipping RFC 2606 reserved domain email', [
                    'email' => $user->email
                ]);
                $skippedCount++;
                continue;
            }

            // Send directly to valid emails only
            \Illuminate\Support\Facades\Mail::to($user->email)
                ->send(new \App\Mail\MemoPublished($memo));

            $validEmails[] = $user->email;
            $sentCount++;
        }

        return "Emails sent to $sentCount valid addresses. Skipped $skippedCount invalid addresses. Valid emails: " . implode(', ', $validEmails);
    } catch (\Exception $e) {
        \Illuminate\Support\Facades\Log::error('Failed to send emails', [
            'error' => $e->getMessage()
        ]);

        return 'Error: ' . $e->getMessage();
    }
})->middleware(['auth']);

// Test route for sending email only to subscribers
Route::get('/test-subscribers-email', function () {
    $memo = \App\Models\Memo::latest()->first();

    if (!$memo) {
        return 'No memo found for testing.';
    }

    try {
        // Get all active subscribers
        $subscribers = \App\Models\Subscriber::where('is_active', true)->get();

        if ($subscribers->isEmpty()) {
            return 'No active subscribers found. Please add some subscribers first.';
        }

        $sentCount = 0;
        $validEmails = [];

        foreach ($subscribers as $subscriber) {
            \Illuminate\Support\Facades\Mail::to($subscriber->email)
                ->send(new \App\Mail\MemoPublished($memo));

            // Update the last_notified_at timestamp
            $subscriber->update(['last_notified_at' => now()]);

            $validEmails[] = $subscriber->email;
            $sentCount++;
        }

        return "Emails sent to $sentCount subscribers: " . implode(', ', $validEmails);
    } catch (\Exception $e) {
        \Illuminate\Support\Facades\Log::error('Failed to send emails to subscribers', [
            'error' => $e->getMessage()
        ]);

        return 'Error: ' . $e->getMessage();
    }
})->middleware(['auth']);




