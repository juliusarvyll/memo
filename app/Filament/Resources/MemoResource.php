<?php

namespace App\Filament\Resources;

use App\Filament\Resources\MemoResource\Pages;
use App\Filament\Resources\MemoResource\RelationManagers;
use App\Models\Memo;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Infolists\Components;
use Filament\Infolists\Infolist;
use Filament\Resources\Pages\Page;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use App\Filament\Resources\MemoResource\Widgets\MemoOverview;
use Filament\Pages\SubNavigationPosition;
use Illuminate\Support\Facades\Mail;
use App\Mail\MemoPublished;
use App\Models\User;

class MemoResource extends Resource
{
    protected static ?string $model = Memo::class;

    protected static ?string $navigationIcon = 'heroicon-o-document-text';

    protected static ?string $navigationGroup = 'Content Management';

    protected static ?string $recordTitleAttribute = 'title';

    protected static SubNavigationPosition $subNavigationPosition = SubNavigationPosition::Top;


    public static function shouldRegisterNavigation(): bool
    {
        return auth()->user()->can('view_any_memo');
    }

    public static function getNavigationBadge(): ?string
    {
        return static::getModel()::count();
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Memo Details')
                    ->schema([
                        Forms\Components\TextInput::make('title')
                            ->required()
                            ->maxLength(255),
                        Forms\Components\Select::make('category_id')
                            ->relationship('category', 'name')
                            ->required()
                            ->createOptionForm([
                                Forms\Components\TextInput::make('name')
                                    ->required()
                                    ->maxLength(255),
                                Forms\Components\TextInput::make('slug')
                                    ->required()
                                    ->maxLength(255),
                                Forms\Components\Textarea::make('description')
                                    ->maxLength(65535),
                            ]),

                        Forms\Components\Hidden::make('author_id')
                            ->default(fn () => auth()->id()),

                        Forms\Components\RichEditor::make('content')
                            ->columnSpanFull()
                            ->disableToolbarButtons([
                                'blockquote',
                                'strike',
                                'attachFiles',
                                'link',
                                'unlink',
                                'insertImage',
                                'insertTable',
                                'insertTable',
                                'insertTable',
                                'undo',
                                'redo',
                            ]),

                        Forms\Components\Toggle::make('is_published')
                            ->label('Publish')
                            ->default(false)
                            ->afterStateUpdated(function ($state, $set) {
                                if ($state) {
                                    $set('published_at', now());
                                } else {
                                    $set('published_at', null);
                                }
                            }),

                        Forms\Components\DateTimePicker::make('published_at')
                            ->label('Publish Date')
                            ->visible(fn (Forms\Get $get) => $get('is_published'))
                            ->required(fn (Forms\Get $get) => $get('is_published')),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('Image')
                    ->schema([
                        Forms\Components\FileUpload::make('image')
                            ->image()
                            ->disk('public')
                            ->directory('memos')
                            ->visibility('public')
                            ->maxSize(5120)
                            ->nullable()
                            ->hiddenLabel()
                            ->saveUploadedFileUsing(function ($file) {
                                // Log the file information
                                Log::info('File upload attempt', [
                                    'name' => $file->getClientOriginalName(),
                                    'size' => $file->getSize(),
                                    'mime' => $file->getMimeType(),
                                ]);

                                // Default behavior - store and return path
                                $path = $file->store('memos', 'public');
                                Log::info('File stored at path', ['path' => $path]);
                                return $path;
                            }),
                    ])
                    ->collapsible(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('image')
                    ->label('Image')
                    ->circular(false)
                    ->width(100)
                    ->height(70),

                Tables\Columns\TextColumn::make('title')
                    ->searchable()
                    ->sortable()
                    ->limit(30),

                Tables\Columns\TextColumn::make('category.name')
                    ->sortable()
                    ->searchable(),

                Tables\Columns\TextColumn::make('author.name')
                    ->searchable(),

                Tables\Columns\TextColumn::make('status')
                    ->badge()
                    ->getStateUsing(fn (Memo $record): string => $record->is_published ? 'Published' : 'Draft')
                    ->colors([
                        'success' => 'Published',
                        'warning' => 'Draft',
                    ]),

                Tables\Columns\TextColumn::make('published_at')
                    ->dateTime()
                    ->sortable(),

                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\Filter::make('published_date')
                    ->form([
                        Forms\Components\DatePicker::make('published_from'),
                        Forms\Components\DatePicker::make('published_until'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['published_from'] ?? null,
                                fn (Builder $query, $date): Builder => $query->whereDate('published_at', '>=', $date),
                            )
                            ->when(
                                $data['published_until'] ?? null,
                                fn (Builder $query, $date): Builder => $query->whereDate('published_at', '<=', $date),
                            );
                    })
                    ->indicateUsing(function (array $data): array {
                        $indicators = [];
                        if ($data['published_from'] ?? null) {
                            $indicators['published_from'] = 'Published from ' . Carbon::parse($data['published_from'])->toFormattedDateString();
                        }
                        if ($data['published_until'] ?? null) {
                            $indicators['published_until'] = 'Published until ' . Carbon::parse($data['published_until'])->toFormattedDateString();
                        }

                        return $indicators;
                    }),

                Tables\Filters\SelectFilter::make('category')
                    ->relationship('category', 'name'),

                Tables\Filters\TernaryFilter::make('is_published'),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Components\Section::make()
                    ->schema([
                        Components\Split::make([
                            Components\Grid::make(2)
                                ->schema([
                                    Components\Group::make([
                                        Components\TextEntry::make('title')
                                            ->size('text-2xl font-bold'),
                                        Components\TextEntry::make('published_at')
                                            ->label('Published On')
                                            ->badge()
                                            ->date()
                                            ->color(fn ($record) => $record->is_published ? 'success' : 'warning')
                                            ->visible(fn ($record) => $record->published_at !== null),
                                        Components\IconEntry::make('is_published')
                                            ->label('Publication Status')
                                            ->boolean(),
                                    ]),
                                    Components\Group::make([
                                        Components\TextEntry::make('author.name')
                                            ->label('Author'),
                                        Components\TextEntry::make('author.email')
                                            ->label('Author Email'),
                                        Components\TextEntry::make('category.name')
                                            ->label('Category'),
                                    ]),
                                ]),
                            Components\ImageEntry::make('image')
                                ->hiddenLabel()
                                ->visible(fn ($record) => $record->image !== null)
                                ->grow(false),
                        ])->from('lg'),
                    ]),
                Components\Section::make('Content')
                    ->schema([
                        Components\TextEntry::make('content')
                            ->prose()
                            ->markdown()
                            ->hiddenLabel(),
                    ])
                    ->collapsible(),
                Components\Section::make('Timeline')
                    ->schema([
                        Components\Grid::make(2)
                            ->schema([
                                Components\TextEntry::make('created_at')
                                    ->label('Created On')
                                    ->dateTime(),
                                Components\TextEntry::make('updated_at')
                                    ->label('Last Updated')
                                    ->dateTime(),
                            ]),
                    ])
                    ->collapsed(),
            ]);
    }

    public static function getRecordSubNavigation(Page $page): array
    {
        return $page->generateNavigationItems([
            Pages\ViewMemo::class,
            Pages\EditMemo::class,
        ]);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListMemos::route('/'),
            'create' => Pages\CreateMemo::route('/create'),
            'view' => Pages\ViewMemo::route('/{record}'),
            'edit' => Pages\EditMemo::route('/{record}/edit'),
        ];
    }

    public static function getEloquentQuery(): Builder
    {
        $query = parent::getEloquentQuery();

        if (auth()->user()->hasRole('author')) {
            return $query->where('author_id', auth()->id());
        }

        return $query;
    }

}
