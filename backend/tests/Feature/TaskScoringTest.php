<?php

use App\Models\Task;
use App\Models\User;

uses(Illuminate\Foundation\Testing\RefreshDatabase::class);

it('calculates priority score: complexity=5, urgency=10 yields exactly 8.0', function () {
    $task = Task::create([
        'title'      => 'Score Test Task',
        'complexity' => 5,
        'urgency'    => 10,
        'status'     => 'todo',
    ]);

    // (5 * 0.4) + (10 * 0.6) = 2.0 + 6.0 = 8.0
    expect((float) $task->priority_score)->toBe(8.0);
});

it('calculates score for all edge combinations', function (int $complexity, int $urgency, float $expected) {
    $task = Task::create([
        'title'      => "c={$complexity} u={$urgency}",
        'complexity' => $complexity,
        'urgency'    => $urgency,
        'status'     => 'todo',
    ]);

    expect((float) $task->priority_score)->toBe($expected);
})->with([
    [1,  1,  1.0],   // (1*0.4)+(1*0.6)   = 0.4+0.6 = 1.0
    [10, 10, 10.0],  // (10*0.4)+(10*0.6) = 4.0+6.0 = 10.0
    [10, 1,  4.6],   // (10*0.4)+(1*0.6)  = 4.0+0.6 = 4.6
    [1,  10, 6.4],   // (1*0.4)+(10*0.6)  = 0.4+6.0 = 6.4
]);

it('recalculates score when complexity or urgency is updated', function () {
    $task = Task::create([
        'title'      => 'Recalc Test',
        'complexity' => 5,
        'urgency'    => 5,
        'status'     => 'todo',
    ]);

    expect((float) $task->priority_score)->toBe(5.0); // (5*0.4)+(5*0.6) = 5.0

    $task->update(['urgency' => 10]);

    expect((float) $task->fresh()->priority_score)->toBe(8.0); // (5*0.4)+(10*0.6) = 8.0
});

it('does NOT recalculate score when only status changes', function () {
    $task = Task::create([
        'title'      => 'Status Only Test',
        'complexity' => 5,
        'urgency'    => 10,
        'status'     => 'todo',
    ]);

    $scoreBefore = (float) $task->priority_score;

    $task->update(['status' => 'in_progress']);

    expect((float) $task->fresh()->priority_score)->toBe($scoreBefore);
});

it('rejects unauthenticated requests to task endpoints', function () {
    $this->getJson('/api/tasks')->assertStatus(401);
    $this->postJson('/api/tasks', [])->assertStatus(401);
});

it('allows authenticated users to create tasks via API', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->postJson('/api/tasks', [
            'title'      => 'Auth Task Test',
            'complexity' => 7,
            'urgency'    => 8,
            'status'     => 'todo',
        ]);

    // (7*0.4)+(8*0.6) = 2.8+4.8 = 7.6
    $response->assertStatus(201)
        ->assertJsonPath('priority_score', 7.6);
});

it('returns tasks ordered by priority score descending', function () {
    $user = User::factory()->create();

    Task::create(['title' => 'Low',    'complexity' => 1, 'urgency' => 1, 'status' => 'todo']);
    Task::create(['title' => 'High',   'complexity' => 9, 'urgency' => 9, 'status' => 'todo']);
    Task::create(['title' => 'Medium', 'complexity' => 5, 'urgency' => 5, 'status' => 'todo']);

    $response = $this->actingAs($user)->getJson('/api/tasks');
    $response->assertStatus(200);

    $scores = collect($response->json())->pluck('priority_score')->values();
    expect($scores[0])->toBeGreaterThan($scores[1]);
    expect($scores[1])->toBeGreaterThan($scores[2]);
});
