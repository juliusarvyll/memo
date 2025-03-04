import { Link, Head } from '@inertiajs/react';
import { LoginForm } from "@/components/login-form"

export default function Welcome({ appName }) {
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
                    <LoginForm />
                </div>
            </div>
        </>
    );
}
