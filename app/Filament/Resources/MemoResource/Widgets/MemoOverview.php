<?php

namespace App\Filament\Resources\MemoResource\Widgets;

use App\Models\Memo;
use App\Models\Category;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Carbon;

class MemoOverview extends BaseWidget
{
    protected static ?string $pollingInterval = '30s';

    protected function getStats(): array
    {
        // Get total counts
        $totalMemos = Memo::count();
        $publishedMemos = Memo::where('is_published', true)->count();
        $draftMemos = Memo::where('is_published', false)->count();

        // Get recent activity
        $recentMemos = Memo::where('created_at', '>=', Carbon::now()->subDays(7))->count();

        // Get category with most memos
        $popularCategory = Category::withCount('memos')
            ->orderBy('memos_count', 'desc')
            ->first();

        $popularCategoryName = $popularCategory ? $popularCategory->name : 'None';
        $popularCategoryCount = $popularCategory ? $popularCategory->memos_count : 0;

        return [
            Stat::make('Total Memos', $totalMemos)
                ->description('All memos in the system')
                ->descriptionIcon('heroicon-m-document-text')
                ->color('gray'),

            Stat::make('Published', $publishedMemos)
                ->description('Publicly visible memos')
                ->descriptionIcon('heroicon-m-check-circle')
                ->color('success')
                ->chart([
                    $publishedMemos > 0 ? $publishedMemos : 0,
                    $draftMemos > 0 ? $draftMemos : 0,
                ]),

            Stat::make('Drafts', $draftMemos)
                ->description('Memos pending publication')
                ->descriptionIcon('heroicon-m-clock')
                ->color('warning'),

            Stat::make('New This Week', $recentMemos)
                ->description('Created in the last 7 days')
                ->descriptionIcon('heroicon-m-arrow-trending-up')
                ->color('info'),

            Stat::make('Popular Category', $popularCategoryName)
                ->description("{$popularCategoryCount} memos")
                ->descriptionIcon('heroicon-m-star')
                ->color('primary'),
        ];
    }
}
