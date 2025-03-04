<?php

namespace App\Filament\Widgets;

use Filament\Widgets\Widget;

class UniversityWidget extends Widget
{
    protected static string $view = 'filament.widgets.university-widget';

    // Make it full width
    protected int | string | array $columnSpan = 'full';

    // Make it static (non-reloadable)
    protected static bool $isLazy = false;

    // Always show the widget
    public static function canView(): bool
    {
        return true;
    }

    // Set widget order (lower numbers appear first)
    protected static ?int $sort = -3;
}
