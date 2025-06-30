import { Head, Link, usePage } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, UserIcon, BellIcon, PowerIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow, format } from 'date-fns';
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";

// SPUP brand colors
const colors = {
    primary: '#626F47', // Dark green - adjust to match exact SPUP color
    secondary: '#FFCF50', // Yellow/gold - adjust to match exact SPUP color
    primaryLight: '#A4B465', // Medium green for secondary elements
    light: '#f5f5f5',
    dark: '#333333',
    success: '#38a169',
    successLight: '#c6f6d5'
};

// Add this helper function right before the Dashboard component
function isPublishedToday(dateString) {
    if (!dateString) return false;
    const publishedDate = new Date(dateString);
    const today = new Date();
    return (
        publishedDate.getDate() === today.getDate() &&
        publishedDate.getMonth() === today.getMonth() &&
        publishedDate.getFullYear() === today.getFullYear()
    );
}

export default function Dashboard({ memos, canLogin, canRegister }) {
    const { auth } = usePage().props;
    const user = auth.user;
    const [selectedMemo, setSelectedMemo] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [avatarSrc, setAvatarSrc] = useState(null);
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [modalImageUrl, setModalImageUrl] = useState(null);
    const [imageNaturalSize, setImageNaturalSize] = useState({ width: null, height: null });

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

    const openMemoDialog = (memo) => {
        setSelectedMemo(memo);
        setDialogOpen(true);
    };

    return (
        <>
            <Head title="SPUP eBulletin" />
            <div className="flex flex-col min-h-screen bg-gray-50">
                {/* Header section - Improved for mobile with SPUP colors */}
                <header className="sticky top-0 z-30 py-4 bg-white border-b shadow" style={{ backgroundColor: colors.primary, borderColor: colors.secondary }}>
                    <div className="container max-w-6xl px-6 mx-auto">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <img
                                    src="images/logo.png"
                                    alt="SPUP Logo"
                                    className="w-auto h-9"
                                />
                                <h1 className="text-xl font-bold text-white">SPUP eBulletin</h1>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Title section - Simplified for mobile */}
                <div className="px-6 pt-4 pb-3 bg-gray-50">
                    <div className="container max-w-6xl mx-auto">
                        <div className="mb-2 text-center">
                            <p className="text-sm text-muted-foreground">
                                View the latest announcements and updates.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Dynamic height calculation removed for better mobile support */}
                {memos && memos.length > 0 ? (
                    <div className="container flex-1 max-w-6xl px-4 pb-6 mx-auto">
                        <ScrollArea className="pb-4">
                            {/* Mobile list view (hidden on md screens and up) */}
                            <div className="block px-2 py-3 md:hidden">
                                <div className="flex flex-col gap-4">
                                    {memos.map((memo) => (
                                        <MemoListItem
                                            key={memo.id}
                                            memo={memo}
                                            onClick={() => openMemoDialog(memo)}
                                            colors={colors}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Desktop grid view (hidden on small screens) */}
                            <div className="hidden gap-4 pb-4 md:grid md:grid-cols-2 lg:grid-cols-3">
                                {memos.map((memo) => (
                                    <MemoCard
                                        key={memo.id}
                                        memo={memo}
                                        onClick={() => openMemoDialog(memo)}
                                        colors={colors}
                                    />
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                ) : (
                    <div className="container flex-1 max-w-6xl px-4 pb-6 mx-auto">
                        <div className="flex flex-col items-center justify-center h-[50vh]">
                            <div className="p-6 text-center bg-white rounded-lg shadow-md">
                                <h2 className="mb-2 text-xl font-semibold" style={{ color: colors.primary }}>No Memos Available</h2>
                                <p className="mb-4 text-muted-foreground">
                                    There are no published memos at the moment. Please check back later.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer - Simplified for mobile */}
                <footer className="py-5 border-t" style={{ backgroundColor: colors.primary, borderColor: colors.secondary }}>
                    <div className="container max-w-6xl px-6 mx-auto">
                        <div className="flex flex-col items-center justify-between">
                            <div className="text-sm text-white/80">
                                © {new Date().getFullYear()} SPUP eBulletin. All rights reserved.
                            </div>
                        </div>
                    </div>
                </footer>
            </div>

            {/* Memo Detail Dialog - Restyled to look like an email */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-full sm:max-w-2xl max-h-[90vh] overflow-auto p-0 m-0 sm:m-4 w-full rounded-lg bg-white shadow-lg border">
                    {selectedMemo && (
                        <div className="flex flex-col h-full font-sans">
                            {/* Email-style Header */}
                            <div className="px-6 pt-5 pb-3 border-b bg-gray-50">
                                <div className="mb-1 text-xs text-gray-500">Memo</div>
                                <div className="text-lg font-bold text-gray-900 mb-1">{selectedMemo.title}</div>
                                <div className="flex flex-col gap-1 text-sm text-gray-700">
                                    <div><span className="font-semibold">From:</span> {selectedMemo.author.name}{selectedMemo.author.position ? `, ${selectedMemo.author.position}` : ''}{selectedMemo.author.department ? ` (${selectedMemo.author.department})` : ''}</div>
                                    <div><span className="font-semibold">To:</span> All Employees</div>
                                    <div><span className="font-semibold">Date:</span> {format(new Date(selectedMemo.created_at), 'PPP p')}</div>
                                </div>
                            </div>

                            {/* Email-style Content */}
                            <div className="flex-1 px-6 py-5 bg-white">
                                <div className="prose prose-sm sm:prose-base max-w-none text-gray-900" dangerouslySetInnerHTML={{ __html: selectedMemo.content }} />

                                {/* Attachment Section */}
                                {selectedMemo.image && (
                                    <div className="mt-6 border-t pt-4">
                                        <div className="flex items-center mb-2 text-gray-700">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l7.07-7.07a4 4 0 00-5.657-5.657l-7.07 7.07a6 6 0 108.485 8.485l6.364-6.364" />
                                            </svg>
                                            <span className="font-medium">Attachment</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-2 bg-gray-100 rounded shadow-sm">
                                            <img
                                                src={selectedMemo.image_url}
                                                alt={selectedMemo.title}
                                                className="object-contain h-20 w-auto max-w-[5rem] rounded border bg-white cursor-pointer hover:shadow"
                                                onClick={() => {
                                                    setModalImageUrl(selectedMemo.image_url);
                                                    setImageModalOpen(true);
                                                }}
                                            />
                                            <div className="flex flex-col">
                                                <button
                                                    className="text-xs text-blue-600 hover:underline mt-1 text-left"
                                                    onClick={() => {
                                                        setModalImageUrl(selectedMemo.image_url);
                                                        setImageModalOpen(true);
                                                    }}
                                                >
                                                    View Attachment
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-3 border-t bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
                                <span>Memo ID: {selectedMemo.id}</span>
                                <span>Posted: {format(new Date(selectedMemo.created_at), 'PPP')}</span>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
            {/* Dialog for full-size image attachment */}
            <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
                <DialogContent className="flex flex-col items-center justify-center max-w-3xl p-0 bg-transparent shadow-none border-none">
                    {modalImageUrl && (
                        <img
                            src={modalImageUrl}
                            alt="Attachment"
                            className="object-contain max-h-[685px] w-auto h-auto mx-auto"
                            style={{ maxWidth: '100%', maxHeight: '685px', display: 'block' }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

function MemoCard({ memo, onClick, colors }) {
    const publishedDate = memo.published_at ? new Date(memo.published_at) : null;
    const author = memo.author || { name: 'Unknown' };
    const [authorAvatarSrc, setAuthorAvatarSrc] = useState(author.avatar ? `/storage/${author.avatar}` : null);
    const [imageError, setImageError] = useState(false);
    const isRecent = isPublishedToday(memo.published_at);

    // Remove isHovering state and related refs since we don't need hover effects
    const cardRef = useRef(null);

    // Handle author avatar error
    const handleAuthorAvatarError = () => {
        setAuthorAvatarSrc(null);
    };

    // Handle memo image error
    const handleMemoImageError = () => {
        setImageError(true);
    };

    return (
        <Card
            ref={cardRef}
            className={`h-full group relative cursor-pointer overflow-hidden touch-manipulation ${isRecent ? 'ring-2 ring-offset-1' : ''}`}
            onClick={onClick}
            style={isRecent ? { ringColor: colors.secondary } : {}}
        >
            {/* Remove background overlay gradient that was shown on hover */}

            {/* Image as background - full width/height */}
            {memo.image && !imageError ? (
                <div className="absolute inset-0 w-full h-full overflow-hidden">
                    <img
                        src={memo.image_url}
                        alt={memo.title}
                        className="object-cover w-full h-full"
                        onError={handleMemoImageError}
                    />
                    {/* Status indicator - small dot instead of checkmark */}
                    {memo.is_published && (
                        <div
                            className="absolute w-3 h-3 rounded-full shadow-sm top-2 right-2"
                            style={{ backgroundColor: colors.secondary }}
                        />
                    )}
                </div>
            ) : (
                <div className="absolute inset-0 flex items-center justify-center w-full h-full bg-gray-100">
                    <div className="text-3xl text-gray-400">{memo.title.charAt(0)}</div>
                    {/* Status indicator - small dot instead of checkmark */}
                    {memo.is_published && (
                        <div
                            className="absolute w-3 h-3 rounded-full shadow-sm top-2 right-2"
                            style={{ backgroundColor: colors.secondary }}
                        />
                    )}
                </div>
            )}

            {/* Content overlay - always visible instead of on hover */}
            <div className="absolute bottom-0 left-0 right-0 z-10 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="font-bold text-white line-clamp-2">{memo.title}</h3>

                <div className="flex items-center mt-1">
                    <Avatar className="w-5 h-5 mr-1 border" style={{ borderColor: colors.secondary }}>
                        {authorAvatarSrc ? (
                            <AvatarImage src={authorAvatarSrc} alt={author.name} onError={handleAuthorAvatarError} />
                        ) : null}
                        <AvatarFallback className="text-[10px]" style={{ backgroundColor: colors.primaryLight, color: 'white' }}>{author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="text-xs text-white/90">{author.name}</div>
                </div>

                <div className="mt-1 text-xs text-white/80 line-clamp-2">
                    {memo.content ? memo.content.replace(/<[^>]*>?/gm, '') : ''}
                </div>

                <div className="flex items-center justify-between mt-1 text-xs text-white/70">
                    {publishedDate && (
                        <div className="flex items-center text-xs text-white/80">
                            <CalendarIcon className="w-3 h-3 mr-1" />
                            {formatDistanceToNow(publishedDate, { addSuffix: true })}
                        </div>
                    )}
                    {memo.is_published && (
                        <div
                            className="px-2 py-0.5 rounded text-xs"
                            style={{
                                backgroundColor: isRecent ? colors.secondary : colors.secondary + '80',
                                color: colors.dark
                            }}
                        >
                            {isRecent ? 'New' : 'Published'}
                        </div>
                    )}
                </div>
            </div>

            {/* Remove the duplicate "Full content overlay - shown on hover/tap" section */}

            {/* Provide consistent height for the card */}
            <div className="w-full aspect-[4/3] sm:aspect-[3/2] lg:aspect-[16/9]"></div>
        </Card>
    );
}

function MemoListItem({ memo, onClick, colors }) {
    const publishedDate = memo.published_at ? new Date(memo.published_at) : null;
    const author = memo.author || { name: 'Unknown' };
    const [authorAvatarSrc, setAuthorAvatarSrc] = useState(author.avatar ? `/storage/${author.avatar}` : null);
    const [imageError, setImageError] = useState(false);
    const isRecent = isPublishedToday(memo.published_at);

    // Handle author avatar error
    const handleAuthorAvatarError = () => {
        setAuthorAvatarSrc(null);
    };

    // Handle memo image error
    const handleMemoImageError = () => {
        setImageError(true);
    };

    return (
        <div
            className={`bg-white shadow-sm overflow-hidden flex flex-col cursor-pointer transition-all hover:shadow active:scale-[0.99] ${isRecent ? 'border-l-4' : 'border-l'}`}
            onClick={onClick}
            style={isRecent ? { borderLeftColor: colors.secondary } : { borderLeftColor: colors.primary + '40' }}
        >
            {/* Memo header with author and date */}
            <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: colors.primary + '10', backgroundColor: colors.primary + '05' }}>
                <div className="flex items-center">
                    <Avatar className="w-6 h-6 mr-2" style={{ backgroundColor: colors.primaryLight }}>
                        {authorAvatarSrc ? (
                            <AvatarImage src={authorAvatarSrc} alt={author.name} onError={handleAuthorAvatarError} />
                        ) : null}
                        <AvatarFallback style={{ backgroundColor: colors.primaryLight, color: 'white' }}>{author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium" style={{ color: colors.primary }}>{author.name}</span>
                </div>

                <div className="flex items-center">
                    {isRecent && (
                        <span className="text-xs px-2 py-0.5 mr-2 font-medium"
                              style={{ backgroundColor: colors.secondary + '20', color: colors.dark }}>
                            New
                        </span>
                    )}
                    {publishedDate && (
                        <div className="text-[10px] text-gray-500 flex items-center">
                            <CalendarIcon className="w-3 h-3 mr-1" />
                            {formatDistanceToNow(publishedDate, { addSuffix: true })}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex p-3">
                {/* Thumbnail */}
                <div className="relative flex-shrink-0 w-20 h-20 bg-gray-50">
                    {memo.image && !imageError ? (
                        <iframe
                            src={memo.image_url}
                            alt={memo.title}
                            className="object-cover w-full h-full"
                            frameBorder="0"
                            allowFullScreen
                            style={{ overflow: 'hidden', width: '100%', height: '100%', display: 'block' }}
                            scrolling="no"
                            onError={handleMemoImageError}
                        />
                    ) : (
                        <div className="flex items-center justify-center w-full h-full"
                             style={{ backgroundColor: colors.primary + '10' }}>
                        </div>
                    )}

                    {/* Status indicator - flat bar */}
                    {memo.is_published && !isRecent && (
                        <div
                            className="absolute bottom-0 left-0 right-0 py-1 text-[9px] font-medium text-center"
                            style={{ backgroundColor: colors.primary, color: 'white' }}
                        >
                            Published
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex flex-col justify-between flex-1 min-w-0 ml-3">
                    <div>
                        <h3 className="mb-1 text-sm font-semibold line-clamp-1" style={{ color: colors.primary }}>{memo.title}</h3>
                        <p className="text-xs text-gray-600 line-clamp-2">
                            {memo.content ? memo.content.replace(/<[^>]*>?/gm, '') : ''}
                        </p>
                    </div>

                    <div className="mt-1 text-[10px] text-right">
                        <span className="inline-flex items-center px-2 py-0.5 text-gray-600" style={{ backgroundColor: colors.primary + '10' }}>
                            <BellIcon className="h-2.5 w-2.5 mr-1" />
                            Memo #{memo.id}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
