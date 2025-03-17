import { Link, Head, usePage } from '@inertiajs/react';
import { LoginForm } from "@/components/login-form"
import { useEffect } from 'react';
import { router } from '@inertiajs/react';

export default function Welcome({ appName }) {
    const { auth } = usePage().props;
    const user = auth.user;

    // If user is logged in, redirect to dashboard
    useEffect(() => {
        if (user) {
            // Use direct window.location navigation to prevent any intercepting
            window.location.href = route('dashboard');
        }
    }, [user]);

    return (
        <>
            <Head title="Welcome" />
            <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-sm">
                    <div className="flex justify-center mb-8">
                        <img
                            src="/images/logo.png"
                            alt={appName || "Logo"}
                            className="h-20 w-auto"
                        />
                    </div>
                    {!user && <LoginForm />}
                    {user && (
                        <div className="text-center">
                            <p className="mb-4">You are already logged in.</p>
                            <Link href={route('dashboard')} className="text-blue-600 hover:underline">
                                Go to Dashboard
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
