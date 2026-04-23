<?php

namespace App\Models;

use App\Observers\TaskObserver;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[ObservedBy([TaskObserver::class])]
class Task extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'description',
        'complexity',
        'urgency',
        'status',
    ];

    protected $casts = [
        'complexity'     => 'integer',
        'urgency'        => 'integer',
        'priority_score' => 'float',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
