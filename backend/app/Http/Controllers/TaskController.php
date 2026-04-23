<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tasks = $request->user()
            ->tasks()
            ->orderByDesc('priority_score')
            ->get();

        return response()->json($tasks);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'complexity'  => 'required|integer|min:1|max:10',
            'urgency'     => 'required|integer|min:1|max:10',
            'status'      => 'required|in:todo,in_progress,done',
        ]);

        $validated['user_id'] = $request->user()->id;

        return response()->json(Task::create($validated), 201);
    }

    public function show(Request $request, Task $task): JsonResponse
    {
        abort_if($task->user_id !== $request->user()->id, 403);

        return response()->json($task);
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        abort_if($task->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'title'       => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'complexity'  => 'sometimes|required|integer|min:1|max:10',
            'urgency'     => 'sometimes|required|integer|min:1|max:10',
            'status'      => 'sometimes|required|in:todo,in_progress,done',
        ]);

        $task->update($validated);

        return response()->json($task);
    }

    public function destroy(Request $request, Task $task): JsonResponse
    {
        abort_if($task->user_id !== $request->user()->id, 403);

        $task->delete();

        return response()->json(['message' => 'Task deleted successfully']);
    }
}
