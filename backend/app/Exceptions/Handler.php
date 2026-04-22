<?php

namespace App\Exceptions;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

class Handler extends ExceptionHandler
{
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    public function register(): void
    {
        $this->renderable(function (NotFoundHttpException $e, Request $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'error'   => 'Not Found',
                    'message' => 'The requested resource does not exist.',
                ], 404);
            }
        });

        $this->renderable(function (AuthenticationException $e, Request $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'error'   => 'Unauthenticated',
                    'message' => 'A valid Bearer token is required.',
                ], 401);
            }
        });

        $this->renderable(function (ValidationException $e, Request $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'error'    => 'Validation Failed',
                    'messages' => $e->errors(),
                ], 422);
            }
        });

        $this->renderable(function (Throwable $e, Request $request) {
            if ($request->expectsJson() && ! ($e instanceof ValidationException)) {
                return response()->json([
                    'error'   => 'Server Error',
                    'message' => config('app.debug') ? $e->getMessage() : 'An unexpected error occurred.',
                ], 500);
            }
        });
    }
}
