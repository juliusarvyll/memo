<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Try to drop the foreign key constraint
        try {
            Schema::table('memos', function (Blueprint $table) {
                $table->dropForeign(['category_id']);
            });
        } catch (\Exception $e) {
            // Foreign key might not exist, continue
        }

        // Drop the column if it exists
        if (Schema::hasColumn('memos', 'category_id')) {
            Schema::table('memos', function (Blueprint $table) {
                $table->dropColumn('category_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasColumn('memos', 'category_id')) {
            Schema::table('memos', function (Blueprint $table) {
                $table->foreignId('category_id')->nullable()->constrained()->cascadeOnDelete();
            });
        }
    }
};
