import { Head, Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import { Button } from "@/components/ui/button";
import { BellIcon, PowerIcon } from '@heroicons/react/24/outline';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";

export default function Edit({ mustVerifyEmail, status }) {
    const { auth } = usePage().props;
    const user = auth.user;
    const [avatarSrc, setAvatarSrc] = useState(null);

    // Set up avatar source with error handling
    useEffect(() => {
        if (user && user.avatar) {
            setAvatarSrc(`/storage/${user.avatar}`);
        }
    }, [user]);

    // Handle avatar loading error
    const handleAvatarError = () => {
        console.log("Avatar failed to load");
        setAvatarSrc(null);
    };

    return (
        <>
            <Head title="Profile" />
            <div className="flex flex-col min-h-screen bg-gray-50">
                {/* Header section with auth */}
                <header className="bg-white shadow border-b">
                    <div className="container mx-auto max-w-6xl px-4 py-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                                <Link href={route('dashboard')}>
                                    <img
                                        src="/images/logo.png"
                                        alt="SPUP Logo"
                                        className="h-12 w-auto"
                                        onError={(e) => e.target.style.display = 'none'}
                                    />
                                </Link>
                                <h1 className="text-xl font-bold">SPUP Memo</h1>
                            </div>

                            <div className="flex items-center space-x-4">
                                <Button variant="ghost" size="sm" className="relative">
                                    <BellIcon className="h-5 w-5" />
                                    <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
                                </Button>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                            <Avatar className="h-8 w-8">
                                                {avatarSrc ? (
                                                    <AvatarImage
                                                        src={avatarSrc}
                                                        alt={user.name}
                                                        onError={handleAvatarError}
                                                    />
                                                ) : (
                                                    <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                                                )}
                                            </Avatar>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56" align="end" forceMount>
                                        <DropdownMenuLabel className="font-normal">
                                            <div className="flex flex-col space-y-1">
                                                <p className="text-sm font-medium leading-none">{user.name}</p>
                                                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild>
                                            <Link href={route('dashboard')} className="w-full cursor-pointer">
                                                Dashboard
                                            </Link>
                                        </DropdownMenuItem>
                                        {user.roles && user.roles.some(role =>
                                            ['super_admin', 'editor', 'author'].includes(role.name)
                                        ) && (
                                            <DropdownMenuItem asChild>
                                                <Link href="/admin" className="w-full cursor-pointer">
                                                    Admin Panel
                                                </Link>
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild className="text-red-600">
                                            <Link
                                                href={route('logout')}
                                                method="post"
                                                as="button"
                                                className="w-full cursor-pointer flex items-center"
                                            >
                                                <PowerIcon className="mr-2 h-4 w-4" />
                                                <span>Log out</span>
                                            </Link>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="py-12">
                    <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                        <div className="bg-white p-4 shadow sm:rounded-lg sm:p-8 dark:bg-gray-800">
                            <UpdateProfileInformationForm
                                mustVerifyEmail={mustVerifyEmail}
                                status={status}
                                className="max-w-xl"
                            />
                        </div>

                        <div className="bg-white p-4 shadow sm:rounded-lg sm:p-8 dark:bg-gray-800">
                            <UpdatePasswordForm className="max-w-xl" />
                        </div>

                        <div className="bg-white p-4 shadow sm:rounded-lg sm:p-8 dark:bg-gray-800">
                            <DeleteUserForm className="max-w-xl" />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
