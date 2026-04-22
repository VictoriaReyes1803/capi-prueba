<?php

namespace App\Models;

use App\Observers\TaskObserver;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Model;

#[ObservedBy([TaskObserver::class])]
class Task extends Model
{
    protected $fillable = [
        'title',
        'description',
        'complexity',
        'urgency',
        'priority_score',
        'status',
    ];

    protected $casts = [
        'complexity'     => 'integer',
        'urgency'        => 'integer',
        'priority_score' => 'float',
    ];
}
