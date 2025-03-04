import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { useState, useRef } from 'react';

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}) {
    const user = usePage().props.auth.user;
    const [previewUrl, setPreviewUrl] = useState(user.avatar ? `/storage/${user.avatar}` : null);
    const fileInputRef = useRef(null);

    const { data, setData, post, errors, processing, recentlySuccessful, reset } =
        useForm({
            name: user.name,
            email: user.email,
            avatar: null,
            _method: 'PATCH',
            remove_avatar: false,
        });

    const submit = (e) => {
        e.preventDefault();

        // Always use FormData when submitting to ensure all fields are included
        const formData = new FormData();
        formData.append('_method', 'PATCH');
        formData.append('name', data.name);
        formData.append('email', data.email);
        formData.append('remove_avatar', data.remove_avatar);

        if (data.avatar) {
            formData.append('avatar', data.avatar);
        }

        post(route('profile.update'), {
            body: formData,
            forceFormData: true,
            onSuccess: () => {
                // Reset the avatar file input after successful upload
                if (data.avatar) {
                    reset('avatar');
                }
            },
        });
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('avatar', file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const removeAvatar = () => {
        setData('avatar', null);
        setData('remove_avatar', true);
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Profile Information
                </h2>

                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Update your account's profile information and email address.
                </p>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-6">
                {/* Avatar Upload */}
                <div>
                    <InputLabel htmlFor="avatar" value="Profile Photo" />

                    <div className="mt-2 flex items-center gap-4">
                        {previewUrl ? (
                            <div className="relative">
                                <img
                                    src={previewUrl}
                                    alt="Avatar preview"
                                    className="h-20 w-20 rounded-full object-cover border border-gray-200"
                                />
                                <button
                                    type="button"
                                    onClick={removeAvatar}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                        )}

                        <div>
                            <input
                                id="avatar"
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarChange}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current.click()}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium"
                            >
                                {previewUrl ? 'Change Photo' : 'Upload Photo'}
                            </button>

                            {user.avatar && !data.remove_avatar && !data.avatar && (
                                <button
                                    type="button"
                                    onClick={removeAvatar}
                                    className="ml-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded text-sm font-medium"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>

                    <InputError className="mt-2" message={errors.avatar} />
                </div>

                <div>
                    <InputLabel htmlFor="name" value="Name" />

                    <TextInput
                        id="name"
                        className="mt-1 block w-full"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        isFocused
                        autoComplete="name"
                    />

                    <InputError className="mt-2" message={errors.name} />
                </div>

                <div>
                    <InputLabel htmlFor="email" value="Email" />

                    <TextInput
                        id="email"
                        type="email"
                        className="mt-1 block w-full"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        autoComplete="username"
                    />

                    <InputError className="mt-2" message={errors.email} />
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div>
                        <p className="mt-2 text-sm text-gray-800 dark:text-gray-200">
                            Your email address is unverified.
                            <Link
                                href={route('verification.send')}
                                method="post"
                                as="button"
                                className="rounded-md text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:text-gray-400 dark:hover:text-gray-100 dark:focus:ring-offset-gray-800"
                            >
                                Click here to re-send the verification email.
                            </Link>
                        </p>

                        {status === 'verification-link-sent' && (
                            <div className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
                                A new verification link has been sent to your
                                email address.
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <PrimaryButton disabled={processing}>Save</PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Saved.
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
