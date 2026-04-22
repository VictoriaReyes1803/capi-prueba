<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class LogCrudOperations
{
    public function handle(Request $request, Closure $next): Response
    {
        $start    = microtime(true);
        $response = $next($request);
        $ms       = round((microtime(true) - $start) * 1000, 2);

        Log::channel('crud')->info('API Request', [
            'method'      => $request->method(),
            'path'        => $request->path(),
            'user_id'     => $request->user()?->id,
            'ip'          => $request->ip(),
            'status_code' => $response->getStatusCode(),
            'duration_ms' => $ms,
        ]);

        return $response;
    }
}
