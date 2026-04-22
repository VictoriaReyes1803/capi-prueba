<?php

namespace App\Observers;

use App\Models\Task;
use Illuminate\Support\Facades\Log;

class TaskObserver
{
    public function creating(Task $task): void
    {
        $this->recalculate($task);
        Log::channel('crud')->info('Task creating', ['title' => $task->title]);
    }

    public function created(Task $task): void
    {
        Log::channel('crud')->info('Task created', [
            'id'             => $task->id,
            'priority_score' => $task->priority_score,
        ]);
    }

    public function updating(Task $task): void
    {
        if ($task->isDirty(['complexity', 'urgency'])) {
            $this->recalculate($task);
        }
        Log::channel('crud')->info('Task updating', ['id' => $task->id]);
    }

    public function updated(Task $task): void
    {
        Log::channel('crud')->info('Task updated', [
            'id'             => $task->id,
            'priority_score' => $task->priority_score,
        ]);
    }

    public function deleting(Task $task): void
    {
        Log::channel('crud')->info('Task deleting', ['id' => $task->id]);
    }

    public function deleted(Task $task): void
    {
        Log::channel('crud')->info('Task deleted', ['id' => $task->id]);
    }

    // priority_score = (complexity * 0.4) + (urgency * 0.6)
    private function recalculate(Task $task): void
    {
        $task->priority_score = ($task->complexity * 0.4) + ($task->urgency * 0.6);
    }
}
