<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedTinyInteger('complexity')->default(5);
            $table->unsignedTinyInteger('urgency')->default(5);
            $table->decimal('priority_score', 5, 2)->default(0.00);
            $table->enum('status', ['todo', 'in_progress', 'done'])->default('todo');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
