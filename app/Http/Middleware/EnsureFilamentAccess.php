<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureFilamentAccess
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // First check if the user is authenticated
        if (! $request->user()) {
            // User is not logged in - redirect to login or show auth error
            return redirect()->route('welcome')->with('message', 'You must be logged in to access the admin panel');
        }

        // Then check if the authenticated user has permission
        if (! $request->user()->can('access_filament')) {
            abort(403, 'You do not have permission to access the admin panel.');
        }

        return $next($request);
    }
}
