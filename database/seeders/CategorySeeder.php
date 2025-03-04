<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Announcements',
                'description' => 'Important announcements from the administration',
            ],
            [
                'name' => 'Events',
                'description' => 'Upcoming events and activities',
            ],
            [
                'name' => 'Academic',
                'description' => 'Academic-related information and updates',
            ],
            [
                'name' => 'Administrative',
                'description' => 'Administrative notices and procedures',
            ],
            [
                'name' => 'Financial',
                'description' => 'Financial updates, deadlines, and information',
            ],
            [
                'name' => 'Health & Safety',
                'description' => 'Health and safety notices',
            ],
            [
                'name' => 'Technology',
                'description' => 'IT updates and technology news',
            ],
        ];

        foreach ($categories as $category) {
            Category::create([
                'name' => $category['name'],
                'slug' => Str::slug($category['name']),
                'description' => $category['description'],
            ]);
        }
    }
}
