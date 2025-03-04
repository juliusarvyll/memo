<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Memo;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Faker\Factory as Faker;
use Carbon\Carbon;

class MemoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $faker = Faker::create();

        // Delete old images to ensure clean state
        Storage::disk('public')->deleteDirectory('memos');

        // Ensure the images directory exists
        Storage::disk('public')->makeDirectory('memos');

        // Get all categories
        $categories = Category::all();

        // Get authors (users with author role)
        $authors = User::role('author')->get();
        $editors = User::role('editor')->get();

        // Add editors to potential memo creators
        $potentialAuthors = $authors->merge($editors);

        // Create 20 memos with images
        for ($i = 0; $i < 20; $i++) {
            // Generate a random image
            $imagePath = $this->generateImage($faker);

            // Create a memo with some published and some drafts
            Memo::create([
                'title' => $this->getMemoTitle($faker),
                'content' => $this->getMemoContent($faker),
                'category_id' => $categories->random()->id,
                'author_id' => $potentialAuthors->random()->id,
                'image' => $imagePath,
                'is_published' => $faker->boolean(80), // 80% chance of being published
                'published_at' => now()->subDays($faker->numberBetween(1, 30)),
                'created_at' => now()->subDays($faker->numberBetween(1, 60)),
                'updated_at' => now()->subDays($faker->numberBetween(0, 30)),
            ]);
        }

        // Create memos specifically for our test users
        $testAuthor = User::where('email', 'author@example.com')->first();
        $testEditor = User::where('email', 'editor@example.com')->first();

        if ($testAuthor) {
            foreach (range(1, 5) as $i) {
                $category = $categories->random();
                $isPublished = $i <= 3; // 3 published, 2 drafts

                Memo::create([
                    'title' => "Test Author Memo #{$i}",
                    'content' => "This is test content for the author test memo #{$i}. " . fake()->paragraphs(2, true),
                    'author_id' => $testAuthor->id,
                    'category_id' => $category->id,
                    'is_published' => $isPublished,
                    'published_at' => $isPublished ? Carbon::now()->subDays($i) : null,
                    'created_at' => Carbon::now()->subDays($i + 1),
                    'updated_at' => Carbon::now()->subDays($i),
                ]);
            }
        }

        if ($testEditor) {
            foreach (range(1, 5) as $i) {
                $category = $categories->random();
                $isPublished = $i <= 4; // 4 published, 1 draft

                Memo::create([
                    'title' => "Test Editor Memo #{$i}",
                    'content' => "This is test content for the editor test memo #{$i}. " . fake()->paragraphs(2, true),
                    'author_id' => $testEditor->id,
                    'category_id' => $category->id,
                    'is_published' => $isPublished,
                    'published_at' => $isPublished ? Carbon::now()->subDays($i) : null,
                    'created_at' => Carbon::now()->subDays($i + 1),
                    'updated_at' => Carbon::now()->subDays($i),
                ]);
            }
        }
    }

    /**
     * Generate an image for a memo
     *
     * @param \Faker\Generator $faker
     * @return string|null
     */
    private function generateImage($faker)
    {
        // Decide if we want to include an image (70% chance)
        if ($faker->boolean(70)) {
            // Get a random image from Lorem Picsum
            $width = $faker->numberBetween(800, 1200);
            $height = $faker->numberBetween(600, 800);
            $imageId = $faker->numberBetween(1, 1000);

            // Generate a unique filename
            $filename = 'memo_' . Str::random(10) . '.jpg';
            $path = 'memos/' . $filename;

            // Download and save the image
            $imageContent = @file_get_contents("https://picsum.photos/id/{$imageId}/{$width}/{$height}");
            if ($imageContent) {
                Storage::disk('public')->put($path, $imageContent);
                return $path;
            }
        }

        return null; // No image
    }

    /**
     * Get a random memo title
     *
     * @param \Faker\Generator $faker
     * @return string
     */
    private function getMemoTitle($faker)
    {
        $titles = [
            'Announcement: ' . $faker->catchPhrase(),
            'Important Notice: ' . $faker->sentence(4),
            'Update on ' . $faker->words(3, true),
            'Memo Regarding ' . $faker->words(3, true),
            'Policy Change: ' . $faker->sentence(3),
            'Upcoming Event: ' . $faker->sentence(3),
            'Action Required: ' . $faker->words(3, true),
            'Information: ' . $faker->catchPhrase(),
            'Department Update: ' . $faker->words(2, true),
            'Reminder: ' . $faker->sentence(4),
        ];

        return $titles[array_rand($titles)];
    }

    /**
     * Get random detailed memo content
     *
     * @param \Faker\Generator $faker
     * @return string
     */
    private function getMemoContent($faker)
    {
        // Create a more structured content with paragraphs
        $intro = "<p>" . $faker->paragraph(3) . "</p>";

        // Add some bullet points
        $bulletPoints = "<ul>";
        for ($i = 0; $i < $faker->numberBetween(2, 5); $i++) {
            $bulletPoints .= "<li>" . $faker->sentence(6) . "</li>";
        }
        $bulletPoints .= "</ul>";

        // Add a heading and more content
        $moreContent = "<h3>" . $faker->sentence(4) . "</h3><p>" . $faker->paragraph(4) . "</p>";

        // Sometimes add a blockquote
        $blockquote = "";
        if ($faker->boolean(30)) {
            $blockquote = "<blockquote>" . $faker->sentence(10) . "</blockquote>";
        }

        // Final paragraph
        $conclusion = "<p>" . $faker->paragraph(2) . "</p>";

        return $intro . $bulletPoints . $moreContent . $blockquote . $conclusion;
    }
}
