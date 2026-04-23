<?php

namespace Database\Seeders;

use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TaskSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'demo@kanban.test'],
            ['name' => 'Demo User', 'password' => Hash::make('password')],
        );

        $tasks = [
            ['title' => 'Setup CI/CD Pipeline',        'description' => 'Configure GitHub Actions for automated deployments.',  'complexity' => 8, 'urgency' => 9,  'status' => 'todo'],
            ['title' => 'Fix Authentication Bug',      'description' => 'Token refresh fails after 24h — users get logged out.','complexity' => 5, 'urgency' => 10, 'status' => 'in_progress'],
            ['title' => 'Write API Documentation',     'description' => 'Document all REST endpoints with examples.',            'complexity' => 3, 'urgency' => 4,  'status' => 'todo'],
            ['title' => 'Database Query Optimisation', 'description' => 'N+1 queries detected in task listing endpoint.',        'complexity' => 7, 'urgency' => 6,  'status' => 'todo'],
            ['title' => 'Deploy to Production',        'description' => 'Release v1.0.0 to production environment.',            'complexity' => 6, 'urgency' => 8,  'status' => 'done'],
        ];

        foreach ($tasks as $data) {
            Task::create(['user_id' => $user->id, ...$data]);
        }
    }
}
