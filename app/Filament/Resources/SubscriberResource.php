<?php

namespace App\Filament\Resources;

use App\Filament\Resources\SubscriberResource\Pages;
use App\Filament\Resources\SubscriberResource\RelationManagers;
use App\Models\Subscriber;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class SubscriberResource extends Resource
{
    protected static ?string $model = Subscriber::class;

    protected static ?string $navigationIcon = 'heroicon-o-envelope';

    protected static ?string $navigationGroup = 'Communications';

    protected static ?int $navigationSort = 2;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Subscriber Information')
                    ->schema([
                        Forms\Components\TextInput::make('email')
                            ->email()
                            ->required()
                            ->maxLength(255)
                            ->unique(ignoreRecord: true),
                        Forms\Components\TextInput::make('name')
                            ->maxLength(255),
                        Forms\Components\Toggle::make('is_active')
                            ->label('Active')
                            ->default(true)
                            ->helperText('Inactive subscribers will not receive memo notifications'),
                        Forms\Components\DateTimePicker::make('last_notified_at')
                            ->label('Last Notified')
                            ->readOnly()
                            ->columnSpanFull(),
                    ])
                    ->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('email')
                    ->searchable(),
                Tables\Columns\TextColumn::make('name')
                    ->searchable(),
                Tables\Columns\IconColumn::make('is_active')
                    ->label('Active')
                    ->boolean(),
                Tables\Columns\TextColumn::make('last_notified_at')
                    ->label('Last Notified')
                    ->dateTime()
                    ->sortable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\Filter::make('active')
                    ->query(fn (Builder $query): Builder => $query->where('is_active', true))
                    ->toggle(),
                Tables\Filters\Filter::make('inactive')
                    ->query(fn (Builder $query): Builder => $query->where('is_active', false))
                    ->toggle(),
            ])
            ->headerActions([
                Tables\Actions\Action::make('exportCsv')
                    ->label('Export CSV')
                    ->icon('heroicon-o-arrow-down-tray')
                    ->action(function () {
                        $subscribers = Subscriber::all(['email', 'name', 'is_active', 'last_notified_at', 'created_at']);

                        $csv = "Email,Name,Active,Last Notified,Created At\n";

                        foreach ($subscribers as $subscriber) {
                            $csv .= implode(',', [
                                $subscriber->email,
                                $subscriber->name ? '"' . str_replace('"', '""', $subscriber->name) . '"' : '',
                                $subscriber->is_active ? 'Yes' : 'No',
                                $subscriber->last_notified_at ? $subscriber->last_notified_at->format('Y-m-d H:i:s') : '',
                                $subscriber->created_at->format('Y-m-d H:i:s')
                            ]) . "\n";
                        }

                        return response()->streamDownload(function () use ($csv) {
                            echo $csv;
                        }, 'subscribers.csv', ['Content-Type' => 'text/csv']);
                    }),
                Tables\Actions\Action::make('import')
                    ->label('Import Subscribers')
                    ->icon('heroicon-o-arrow-up-tray')
                    ->form([
                        Forms\Components\FileUpload::make('csv')
                            ->label('CSV File')
                            ->acceptedFileTypes(['text/csv', 'application/csv'])
                            ->required(),
                        Forms\Components\Toggle::make('has_header_row')
                            ->label('Has Header Row')
                            ->default(true)
                            ->helperText('First row contains column headers'),
                    ])
                    ->action(function (array $data): void { 
                        $path = storage_path('app/public/' . $data['csv']);
                        $hasHeaderRow = $data['has_header_row'] ?? true;

                        $handle = fopen($path, 'r');
                        $imported = 0;
                        $skipped = 0;
                        $row = 0;

                        while (($data = fgetcsv($handle)) !== false) {
                            $row++;

                            // Skip header row if specified
                            if ($hasHeaderRow && $row === 1) {
                                continue;
                            }

                            // Skip if not enough data
                            if (count($data) < 1 || empty($data[0])) {
                                $skipped++;
                                continue;
                            }

                            $email = trim($data[0]);

                            // Validate email
                            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                                $skipped++;
                                continue;
                            }

                            // Create or update subscriber
                            $name = isset($data[1]) && !empty($data[1]) ? trim($data[1]) : null;
                            $isActive = isset($data[2]) ? (strtolower(trim($data[2])) === 'yes' || trim($data[2]) === '1') : true;

                            Subscriber::updateOrCreate(
                                ['email' => $email],
                                [
                                    'name' => $name,
                                    'is_active' => $isActive,
                                ]
                            );

                            $imported++;
                        }

                        fclose($handle);

                        // Delete the uploaded file
                        if (file_exists($path)) {
                            unlink($path);
                        }

                        // Show notification
                        \Filament\Notifications\Notification::make()
                            ->title('Import Completed')
                            ->body("Imported $imported subscribers. Skipped $skipped rows.")
                            ->success()
                            ->send();
                    }),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                    Tables\Actions\BulkAction::make('activate')
                        ->label('Activate')
                        ->icon('heroicon-o-check')
                        ->action(fn (Builder $query) => $query->update(['is_active' => true]))
                        ->deselectRecordsAfterCompletion(),
                    Tables\Actions\BulkAction::make('deactivate')
                        ->label('Deactivate')
                        ->icon('heroicon-o-x-mark')
                        ->action(fn (Builder $query) => $query->update(['is_active' => false]))
                        ->deselectRecordsAfterCompletion(),
                ]),
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
            'index' => Pages\ListSubscribers::route('/'),
            'create' => Pages\CreateSubscriber::route('/create'),
            'edit' => Pages\EditSubscriber::route('/{record}/edit'),
        ];
    }
}
