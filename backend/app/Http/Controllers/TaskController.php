<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Task::orderByDesc('priority_score')->get());
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

        return response()->json(Task::create($validated), 201);
    }

    public function show(Task $task): JsonResponse
    {
        return response()->json($task);
    }

    public function update(Request $request, Task $task): JsonResponse
    {
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

    public function destroy(Task $task): JsonResponse
    {
        $task->delete();

        return response()->json(['message' => 'Task deleted successfully']);
    }
}
