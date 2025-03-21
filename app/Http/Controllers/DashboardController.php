<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Memo;
use App\Models\User;
use App\Models\Category;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

class DashboardController extends Controller
{
    public function index()
    {
        $memos = Memo::with(['category', 'author:id,name,avatar'])
            ->where('is_published', true)
            ->orderBy('published_at', 'desc')
            ->get();

        return Inertia::render('Dashboard', [
            'memos' => $memos,
            'canLogin' => Route::has('login'),
            'canRegister' => Route::has('register'),
        ]);
    }

    public function memos()
    {
        $memos = Memo::with(['category', 'author:id,name,avatar'])
            ->where('is_published', true)
            ->orderBy('published_at', 'desc')
            ->get();

        return Inertia::render('Dashboard', [
            'memos' => $memos,
        ]);
    }

}

