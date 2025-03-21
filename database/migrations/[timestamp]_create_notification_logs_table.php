<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('notification_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('token', 255)->nullable(); // Truncated token for reference
            $table->string('type')->default('general');
            $table->string('title');
            $table->text('body')->nullable();
            $table->string('message_id')->nullable();
            $table->boolean('success')->default(false);
            $table->text('error')->nullable();
            $table->json('data')->nullable();
            $table->timestamps();

            // Add indexes
            $table->index('type');
            $table->index('success');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_logs');
    }
};
