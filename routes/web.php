<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\WelcomeController;
use App\Http\Controllers\FcmController;
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


// // Test route for sending emails to ALL users
// Route::get('/test-all-users-email', function () {
//     $memo = \App\Models\Memo::latest()->first();

//     if (!$memo) {
//         return 'No memo found for testing.';
//     }

//     try {
//         Log::info('Starting test email to ALL users');

//         // Get all users
//         $users = \App\Models\User::all();

//         Log::info('Found users to notify', [
//             'count' => $users->count()
//         ]);

//         $sentCount = 0;
//         $errorCount = 0;
//         $skippedCount = 0;

//         foreach ($users as $user) {
//             // Skip if user has no email
//             if (empty($user->email)) {
//                 Log::warning('Skipping user - no email address', [
//                     'user_id' => $user->id,
//                     'user_name' => $user->name
//                 ]);
//                 $skippedCount++;
//                 continue;
//             }

//             try {
//                 Log::info('Sending test email to user', [
//                     'user_id' => $user->id,
//                     'email' => $user->email
//                 ]);

//                 \Illuminate\Support\Facades\Mail::to($user->email)
//                     ->send(new \App\Mail\MemoPublished($memo));

//                 Log::info('Successfully sent test email to user', [
//                     'email' => $user->email
//                 ]);

//                 $sentCount++;

//                 // Optional: Add some delay between emails
//                 if ($users->count() > 10) {
//                     usleep(200000); // 0.2 seconds
//                 }
//             } catch (\Exception $e) {
//                 $errorCount++;
//                 Log::error('Failed to send test email to user', [
//                     'email' => $user->email,
//                     'error' => $e->getMessage()
//                 ]);
//             }
//         }

//         return "Test complete. Emails sent to $sentCount users, skipped $skippedCount, errors $errorCount. Check logs for details.";
//     } catch (\Exception $e) {
//         Log::error('Error in test-all-users-email route', [
//             'error' => $e->getMessage(),
//             'trace' => $e->getTraceAsString()
//         ]);

//         return 'Error testing all-users email: ' . $e->getMessage();
//     }
// })->middleware(['auth']);

// // Test route for sending emails to a limited number of users
// Route::get('/test-limited-users-email/{limit?}', function ($limit = 3) {
//     $memo = \App\Models\Memo::latest()->first();

//     if (!$memo) {
//         return 'No memo found for testing.';
//     }

//     try {
//         Log::info('Starting test email to limited users');

//         // Get limited number of users
//         $users = \App\Models\User::take($limit)->get();

//         Log::info('Found users to notify', [
//             'count' => $users->count(),
//             'limit' => $limit
//         ]);

//         $emails = [];

//         foreach ($users as $user) {
//             if (!empty($user->email)) {
//                 \Illuminate\Support\Facades\Mail::to($user->email)
//                     ->send(new \App\Mail\MemoPublished($memo));

//                 $emails[] = $user->email;
//                 Log::info('Sent test email to: ' . $user->email);
//             }
//         }

//         return "Test emails sent to: " . implode(', ', $emails);
//     } catch (\Exception $e) {
//         Log::error('Test limited users email failed', [
//             'error' => $e->getMessage()
//         ]);

//         return 'Error: ' . $e->getMessage();
//     }
// })->middleware(['auth']);

// // Route to check user emails
// Route::get('/check-user-emails', function () {
//     $users = \App\Models\User::all(['id', 'name', 'email']);

//     $invalidDomains = ['example.com', 'example.net', 'example.org', 'test.com', 'localhost.com', 'invalid.com'];

//     $problematicEmails = [];
//     foreach ($users as $user) {
//         if (!$user->email) continue;

//         $domain = explode('@', $user->email)[1] ?? '';

//         if (in_array($domain, $invalidDomains) || str_contains($domain, 'example') || str_contains($domain, 'test')) {
//             $problematicEmails[] = [
//                 'id' => $user->id,
//                 'name' => $user->name,
//                 'email' => $user->email,
//                 'issue' => 'Reserved domain by RFC 2606'
//             ];
//         }
//     }

//     return [
//         'total_users' => $users->count(),
//         'problematic_emails' => $problematicEmails,
//         'count_problematic' => count($problematicEmails)
//     ];
// })->middleware(['auth']);

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
                Log::warning('Skipping RFC 2606 reserved domain email', [
                    'email' => $user->email
                ]);
                $skippedCount++;
                continue;
            }

            // Send to valid emails only
            \Illuminate\Support\Facades\Mail::to($user->email)
                ->send(new \App\Mail\MemoPublished($memo));

            $validEmails[] = $user->email;
            $sentCount++;
        }

        return "Emails sent to $sentCount valid addresses. Skipped $skippedCount invalid addresses. Valid emails: " . implode(', ', $validEmails);
    } catch (\Exception $e) {
        Log::error('Failed to send filtered emails', [
            'error' => $e->getMessage()
        ]);

        return 'Error: ' . $e->getMessage();
    }
})->middleware(['auth']);

Route::get('/notification-test', function () {
    return Inertia::render('NotificationTest');
})->name('notification.test');

Route::prefix('fcm')->group(function () {
    Route::post('/register-token', [FcmController::class, 'registerToken']);
    Route::post('/unregister-token', [FcmController::class, 'unregisterToken']);
    Route::post('/test-notification', [FcmController::class, 'sendTestNotification']);
});




