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

export default function Dashboard({ memos, canLogin, canRegister }) {
    const { auth } = usePage().props;
    const user = auth.user;
    const [selectedMemo, setSelectedMemo] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [avatarSrc, setAvatarSrc] = useState(null);
    const [isZooming, setIsZooming] = useState(false);
    const imageContainerRef = useRef(null);
    const zoomImageRef = useRef(null);

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

    const openImageModal = (e) => {
        e.stopPropagation();
        setImageModalOpen(true);
    };

    // Modified for touch and mouse support
    const handleImageInteraction = (e) => {
        if (!imageContainerRef.current || !zoomImageRef.current) return;

        const { left, top, width, height } = imageContainerRef.current.getBoundingClientRect();

        // Get coordinates whether it's a touch or mouse event
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Calculate position in percentage (0 to 100)
        const x = Math.max(0, Math.min(100, ((clientX - left) / width) * 100));
        const y = Math.max(0, Math.min(100, ((clientY - top) / height) * 100));

        // Set transform origin based on interaction position
        zoomImageRef.current.style.transformOrigin = `${x}% ${y}%`;
        setIsZooming(true);
    };

    const handleImageLeave = () => {
        setIsZooming(false);
    };

    return (
        <>
            <Head title="SPUP eMemo" />
            <div className="flex flex-col min-h-screen bg-gray-50">
                {/* Header section - Improved for mobile with SPUP colors */}
                <header className="bg-white shadow border-b py-3 sticky top-0 z-30" style={{ backgroundColor: colors.primary, borderColor: colors.secondary }}>
                    <div className="container mx-auto max-w-6xl px-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                                <img
                                    src="images/logo.png"
                                    alt="SPUP Logo"
                                    className="h-8 w-auto"
                                />
                                <h1 className="text-lg font-bold text-white">SPUP eMemo</h1>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Title section - Simplified for mobile */}
                <div className="bg-gray-50 pt-3 pb-2 px-4">
                    <div className="container mx-auto max-w-6xl">
                        <div className="text-center mb-2">
                            <p className="text-sm text-muted-foreground">
                                View the latest announcements and updates.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Dynamic height calculation removed for better mobile support */}
                {memos && memos.length > 0 ? (
                    <div className="flex-1 container mx-auto max-w-6xl px-4 pb-6">
                        <ScrollArea className="pb-4">
                            {/* Mobile list view (hidden on md screens and up) */}
                            <div className="block md:hidden">
                                <div className="flex flex-col gap-3">
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
                            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
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
                    <div className="flex-1 container mx-auto max-w-6xl px-4 pb-6">
                        <div className="flex flex-col items-center justify-center h-[50vh]">
                            <div className="bg-white p-6 rounded-lg shadow-md text-center">
                                <h2 className="text-xl font-semibold mb-2" style={{ color: colors.primary }}>No Memos Available</h2>
                                <p className="text-muted-foreground mb-4">
                                    There are no published memos at the moment. Please check back later.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer - Simplified for mobile */}
                <footer className="border-t py-4" style={{ backgroundColor: colors.primary, borderColor: colors.secondary }}>
                    <div className="container mx-auto max-w-6xl px-4">
                        <div className="flex flex-col justify-between items-center">
                            <div className="text-sm text-white/80">
                                © {new Date().getFullYear()} SPUP eMemo. All rights reserved.
                            </div>
                        </div>
                    </div>
                </footer>
            </div>

            {/* Memo Detail Dialog - Completely revised for mobile */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-full sm:max-w-4xl max-h-[90vh] overflow-auto p-0 m-0 sm:m-4 w-full rounded-none sm:rounded-lg">
                    {selectedMemo && (
                        <div className="flex flex-col h-full">
                            {/* Image Container - Full width on mobile, responsive height */}
                            {selectedMemo.image ? (
                                <div className="w-full bg-black flex items-center justify-center">
                                    <div
                                        ref={imageContainerRef}
                                        className="relative w-full cursor-pointer overflow-hidden"
                                        onClick={openImageModal}
                                        onMouseMove={handleImageInteraction}
                                        onTouchMove={handleImageInteraction}
                                        onMouseLeave={handleImageLeave}
                                        onTouchEnd={handleImageLeave}
                                    >
                                        <img
                                            ref={zoomImageRef}
                                            src={`/storage/${selectedMemo.image}`}
                                            alt={selectedMemo.title}
                                            className={`w-full h-auto object-contain max-h-[30vh] sm:max-h-[50vh] transition-transform duration-200 ${isZooming ? 'scale-[1.5]' : 'scale-100'}`}
                                        />

                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/10 z-20">
                                            <span className="bg-black/50 text-white px-3 py-1 rounded-md text-sm">Tap to enlarge</span>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {/* Content Container */}
                            <div className="p-4 sm:p-6 overflow-y-auto flex flex-col">
                                <DialogHeader>
                                    <DialogTitle className="text-lg sm:text-xl font-bold mt-2" style={{ color: colors.primary }}>{selectedMemo.title}</DialogTitle>
                                    <DialogDescription>
                                        <div className="flex items-center mt-3">
                                            {selectedMemo.author.avatar ? (
                                                <Avatar className="h-9 w-9 mr-2 border-2" style={{ borderColor: colors.secondary }}>
                                                    <AvatarImage src={`/storage/${selectedMemo.author.avatar}`} alt={selectedMemo.author.name} />
                                                    <AvatarFallback style={{ backgroundColor: colors.primaryLight, color: 'white' }}>{selectedMemo.author.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                            ) : (
                                                <Avatar className="h-9 w-9 mr-2 border-2" style={{ borderColor: colors.secondary }}>
                                                    <AvatarFallback style={{ backgroundColor: colors.primaryLight, color: 'white' }}>{selectedMemo.author.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div>
                                                <p className="font-medium text-sm sm:text-base">{selectedMemo.author.name}</p>
                                                {(selectedMemo.author.position || selectedMemo.author.department) && (
                                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                                        {[selectedMemo.author.position, selectedMemo.author.department].filter(Boolean).join(' • ')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </DialogDescription>
                                </DialogHeader>

                                {/* Content */}
                                <div className="mt-4 flex-1 overflow-y-auto">
                                    <div className="prose prose-sm max-w-none text-sm sm:text-base"
                                        dangerouslySetInnerHTML={{ __html: selectedMemo.content }}>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mt-4 pt-3 border-t text-xs sm:text-sm">
                                    <div className="text-muted-foreground">
                                        Memo ID: {selectedMemo.id}
                                    </div>
                                    <div className="text-muted-foreground">
                                        Posted: {format(new Date(selectedMemo.created_at), 'PPP')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Image Modal - Better touch support */}
            {selectedMemo && selectedMemo.image && (
                <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
                    <DialogContent className="max-w-full sm:max-w-5xl max-h-[95vh] p-1 sm:p-4 flex items-center justify-center m-0 sm:m-4 w-full rounded-none sm:rounded-lg">
                        <div className="relative w-full h-full flex items-center justify-center">
                            <img
                                src={`/storage/${selectedMemo.image}`}
                                alt={selectedMemo.title}
                                className="max-w-full max-h-[90vh] object-contain"
                            />
                            <Button
                                className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full hover:bg-opacity-70"
                                onClick={() => setImageModalOpen(false)}
                                style={{ backgroundColor: colors.primary, color: 'white' }}
                            >
                                <span className="sr-only">Close</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6L6 18"></path>
                                    <path d="M6 6L18 18"></path>
                                </svg>
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}

function MemoCard({ memo, onClick, colors }) {
    const publishedDate = memo.published_at ? new Date(memo.published_at) : null;
    const author = memo.author || { name: 'Unknown' };
    const [authorAvatarSrc, setAuthorAvatarSrc] = useState(author.avatar ? `/storage/${author.avatar}` : null);
    const [imageError, setImageError] = useState(false);

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
            className="h-full group relative cursor-pointer overflow-hidden touch-manipulation"
            onClick={onClick}
            // Remove all hover-related event handlers
        >
            {/* Remove background overlay gradient that was shown on hover */}

            {/* Image as background - full width/height */}
            {memo.image && !imageError ? (
                <div className="absolute inset-0 w-full h-full overflow-hidden">
                    <img
                        src={`/storage/${memo.image}`}
                        alt={memo.title}
                        className="w-full h-full object-cover"
                        onError={handleMemoImageError}
                    />
                    {/* Status indicator - small dot instead of checkmark */}
                    {memo.is_published && (
                        <div
                            className="absolute top-2 right-2 w-3 h-3 rounded-full shadow-sm"
                            style={{ backgroundColor: colors.secondary }}
                        />
                    )}
                </div>
            ) : (
                <div className="absolute inset-0 w-full h-full bg-gray-100 flex items-center justify-center">
                    <div className="text-gray-400 text-3xl">{memo.title.charAt(0)}</div>
                    {/* Status indicator - small dot instead of checkmark */}
                    {memo.is_published && (
                        <div
                            className="absolute top-2 right-2 w-3 h-3 rounded-full shadow-sm"
                            style={{ backgroundColor: colors.secondary }}
                        />
                    )}
                </div>
            )}

            {/* Content overlay - always visible instead of on hover */}
            <div className="absolute bottom-0 left-0 right-0 z-10 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="font-bold text-white line-clamp-2">{memo.title}</h3>

                <div className="flex items-center mt-1">
                    <Avatar className="h-5 w-5 mr-1 border" style={{ borderColor: colors.secondary }}>
                        {authorAvatarSrc ? (
                            <AvatarImage src={authorAvatarSrc} alt={author.name} onError={handleAuthorAvatarError} />
                        ) : null}
                        <AvatarFallback className="text-[10px]" style={{ backgroundColor: colors.primaryLight, color: 'white' }}>{author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="text-xs text-white/90">{author.name}</div>
                </div>

                <div className="text-xs text-white/80 line-clamp-2 mt-1">
                    {memo.content ? memo.content.replace(/<[^>]*>?/gm, '') : ''}
                </div>

                <div className="flex justify-between items-center mt-1 text-xs text-white/70">
                    {publishedDate && (
                        <div className="text-xs text-white/80 flex items-center">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {formatDistanceToNow(publishedDate, { addSuffix: true })}
                        </div>
                    )}
                    {memo.is_published && (
                        <div
                            className="px-2 py-0.5 rounded text-xs"
                            style={{ backgroundColor: colors.secondary, color: colors.dark }}
                        >
                            Published
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
            className="bg-white rounded-lg shadow overflow-hidden flex cursor-pointer transition-colors"
            onClick={onClick}
            // Remove the active:bg-gray-50 effect
        >
            {/* Thumbnail */}
            <div className="w-20 h-20 flex-shrink-0 bg-gray-100 relative">
                {memo.image && !imageError ? (
                    <img
                        src={`/storage/${memo.image}`}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={handleMemoImageError}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <span className="text-xl text-gray-400">{memo.title.charAt(0)}</span>
                    </div>
                )}
                {/* Status indicator - small dot instead of checkmark */}
                {memo.is_published && (
                    <div
                        className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full shadow-sm"
                        style={{ backgroundColor: colors.secondary }}
                    />
                )}
            </div>

            {/* Content */}
            <div className="p-3 flex-1 min-w-0 flex flex-col justify-between border-l-2" style={{ borderColor: colors.primary }}>
                <div>
                    <h3 className="font-semibold text-sm line-clamp-1 mb-0.5" style={{ color: colors.primary }}>{memo.title}</h3>
                    <p className="text-xs text-gray-600 line-clamp-2 mb-1">
                        {memo.content ? memo.content.replace(/<[^>]*>?/gm, '') : ''}
                    </p>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <Avatar className="h-4 w-4 mr-1 border" style={{ borderColor: colors.secondary }}>
                            {authorAvatarSrc ? (
                                <AvatarImage src={authorAvatarSrc} alt={author.name} onError={handleAuthorAvatarError} />
                            ) : null}
                            <AvatarFallback className="text-[8px]" style={{ backgroundColor: colors.primaryLight, color: 'white' }}>{author.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] text-gray-500 truncate max-w-[100px]">{author.name}</span>
                    </div>

                    {publishedDate && (
                        <div className="text-[10px] text-gray-400 flex items-center">
                            <CalendarIcon className="h-2.5 w-2.5 mr-0.5" />
                            {formatDistanceToNow(publishedDate, { addSuffix: true })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
