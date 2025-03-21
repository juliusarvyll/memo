<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Team;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        $this->call([
            RolesAndPermissionsSeeder::class,
        ]);

        // Create 3 editors
        User::factory(3)->create()->each(function ($user) {
            $user->assignRole('editor');
        });

        // Create 5 authors
        User::factory(5)->create()->each(function ($user) {
            $user->assignRole('author');
        });

        // Create specific test users for each role
        User::factory()->create([
            'name' => 'Test Editor',
            'email' => 'editor@example.com',
            'password' => bcrypt('password'),
        ])->assignRole('editor');

        User::factory()->create([
            'name' => 'Test Author',
            'email' => 'author@example.com',
            'password' => bcrypt('password'),
        ])->assignRole('author');

        // Note: Super Admin is already created in RolesAndPermissionsSeeder

        // Seed memos after users are created
        $this->call([
            MemoSeeder::class,
        ]);
    }
}
