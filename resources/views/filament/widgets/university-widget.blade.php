<x-filament-widgets::widget>
    <x-filament::section>
        <style>
            @font-face {
                font-family: 'Old English Text';
                src: url('{{ asset('fonts/old-english-text-mt.ttf') }}') format('truetype');
            }
        </style>
        <div class="flex items-center justify-between gap-x-3">
            <div class="flex items-center gap-x-3">
                <!-- University Logo -->
                <img src="{{ asset('images/logo.png') }}" alt="SPUP Logo" class="h-11 w-11">

                <!-- University Name and Motto -->
                <div>
                    <h2 class="text-xl" style="font-family: 'Old English Text', serif;">
                        St. Paul University Philippines
                    </h2>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Caritas, Veritas, Scientia.
                    </p>
                </div>
            </div>

            <!-- Website Link -->
            <div>
                <x-filament::button
                    tag="a"
                    href="https://www.spup.edu.ph"
                    target="_blank"
                    color="gray"
                    icon="heroicon-m-arrow-top-right-on-square"
                >
                    Visit site
                </x-filament::button>
            </div>
        </div>
    </x-filament::section>
</x-filament-widgets::widget>
