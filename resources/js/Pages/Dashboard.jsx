import { Head, Link, usePage } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

    // Group memos by category
    const memosByCategory = memos ? memos.reduce((acc, memo) => {
        const categoryName = memo.category.name;
        if (!acc[categoryName]) {
            acc[categoryName] = [];
        }
        acc[categoryName].push(memo);
        return acc;
    }, {}) : {};

    // Get unique categories
    const categories = Object.keys(memosByCategory);

    const openMemoDialog = (memo) => {
        setSelectedMemo(memo);
        setDialogOpen(true);
    };

    const openImageModal = (e) => {
        e.stopPropagation();
        setImageModalOpen(true);
    };

    const handleImageMouseMove = (e) => {
        if (!imageContainerRef.current || !zoomImageRef.current) return;

        const { left, top, width, height } = imageContainerRef.current.getBoundingClientRect();

        // Calculate position in percentage (0 to 100)
        const x = Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - top) / height) * 100));

        // Set transform origin based on mouse position
        zoomImageRef.current.style.transformOrigin = `${x}% ${y}%`;
        setIsZooming(true);
    };

    const handleImageMouseLeave = () => {
        setIsZooming(false);
    };

    return (
        <>
            <Head title="SPUP eBulletin" />
            <div className="flex flex-col min-h-screen bg-gray-50">
                {/* Header section without auth */}
                <header className="bg-white shadow border-b py-2 sm:py-4">
                    <div className="container mx-auto max-w-6xl px-2 sm:px-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                                <img
                                    src="images/logo.png"
                                    alt="SPUP Logo"
                                    className="h-8 sm:h-12 w-auto"
                                />
                                <h1 className="text-lg sm:text-xl font-bold">SPUP eBulletin</h1>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Title section */}
                <div className="bg-gray-50 pt-4 sm:pt-8 px-2 sm:px-4">
                    <div className="container mx-auto max-w-6xl">
                        <div className="text-center mb-4 sm:mb-6">
                            <div className="flex flex-col items-center space-y-1 sm:space-y-2">
                                <p className="text-sm sm:text-base text-muted-foreground max-w-2xl px-2">
                                    View the latest announcements and updates.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Check if there are memos to display - removed auth dependency */}
                {memos && memos.length > 0 ? (
                    <div className="flex-1 container mx-auto max-w-6xl px-2 sm:px-4 pb-2 sm:pb-8">
                        <Tabs defaultValue="all" className="h-full">
                            {/* Sticky tabs navigation */}
                            <div className="sticky top-0 bg-gray-50 pt-2 pb-2 sm:pb-4 z-10">
                                <div className="flex justify-center overflow-x-auto pb-2">
                                    <TabsList className="flex-nowrap overflow-x-auto">
                                        <TabsTrigger value="all">All Memos</TabsTrigger>
                                        {categories.map((category) => (
                                            <TabsTrigger key={category} value={category}>
                                                {category}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </div>
                            </div>

                            {/* Scrollable content for each tab */}
                            <div className="h-[calc(100vh-240px)] sm:h-[calc(100vh-280px)] overflow-hidden">
                                <TabsContent value="all" className="h-full">
                                    <ScrollArea className="h-full pr-2 sm:pr-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pb-4">
                                            {memos.map((memo) => (
                                                <MemoCard
                                                    key={memo.id}
                                                    memo={memo}
                                                    onClick={() => openMemoDialog(memo)}
                                                />
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                {categories.map((category) => (
                                    <TabsContent key={category} value={category} className="h-full">
                                        <ScrollArea className="h-full pr-2 sm:pr-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pb-4">
                                                {memosByCategory[category].map((memo) => (
                                                    <MemoCard
                                                        key={memo.id}
                                                        memo={memo}
                                                        onClick={() => openMemoDialog(memo)}
                                                    />
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </TabsContent>
                                ))}
                            </div>
                        </Tabs>
                    </div>
                ) : (
                    <div className="flex-1 container mx-auto max-w-6xl px-4 pb-8">
                        <div className="flex flex-col items-center justify-center h-[50vh]">
                            <div className="bg-white p-8 rounded-lg shadow-md text-center">
                                <h2 className="text-xl font-semibold mb-2">No Memos Available</h2>
                                <p className="text-muted-foreground mb-4">
                                    There are no published memos at the moment. Please check back later.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <footer className="bg-white border-t py-6">
                    <div className="container mx-auto max-w-6xl px-4">
                        <div className="flex flex-col justify-between items-center">
                            <div className="text-sm text-muted-foreground">
                                © {new Date().getFullYear()} SPUP Memo. All rights reserved.
                            </div>
                        </div>
                    </div>
                </footer>
            </div>

            {/* Memo Detail Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-auto p-0">
                    {selectedMemo && (
                        <div className="flex flex-col lg:flex-row h-full">
                            {/* Image Container - Takes full height on desktop */}
                            {selectedMemo.image ? (
                                <div className="lg:w-3/5 bg-black flex items-center justify-center p-0">
                                    <div
                                        ref={imageContainerRef}
                                        className="relative w-full h-full cursor-zoom-in overflow-hidden"
                                        onClick={openImageModal}
                                        onMouseMove={handleImageMouseMove}
                                        onMouseLeave={handleImageMouseLeave}
                                    >
                                        <img
                                            ref={zoomImageRef}
                                            src={`/storage/${selectedMemo.image}`}
                                            alt={selectedMemo.title}
                                            className={`w-full h-auto object-contain max-h-[50vh] lg:max-h-[80vh] transition-transform duration-200 ${isZooming ? 'scale-[2]' : 'scale-100'}`}
                                        />

                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/10 z-20">
                                            <span className="bg-black/50 text-white px-3 py-1 rounded-md text-sm">Click to enlarge</span>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {/* Content Container */}
                            <div className={`p-6 overflow-y-auto flex flex-col ${selectedMemo.image ? 'lg:w-2/5' : 'w-full'}`}>
                                <DialogHeader>
                                    <div className="flex justify-between items-start">
                                        <Badge variant="outline" className="mb-2">
                                            {selectedMemo.category.name}
                                        </Badge>
                                    </div>
                                    <DialogTitle className="text-xl font-bold mt-2">{selectedMemo.title}</DialogTitle>
                                    <DialogDescription>
                                        <div className="flex items-center mt-4">
                                            {selectedMemo.author.avatar ? (
                                                <img
                                                    src={`/storage/${selectedMemo.author.avatar}`}
                                                    alt={selectedMemo.author.name}
                                                    className="w-10 h-10 rounded-full mr-3 object-cover"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                                                    <UserIcon className="h-5 w-5 text-gray-600" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium">{selectedMemo.author.name}</p>
                                                {(selectedMemo.author.position || selectedMemo.author.department) && (
                                                    <p className="text-sm text-muted-foreground">
                                                        {[selectedMemo.author.position, selectedMemo.author.department].filter(Boolean).join(' • ')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </DialogDescription>
                                </DialogHeader>

                                {/* Content */}
                                <div className="mt-4 flex-1 overflow-y-auto">
                                    <div className="prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: selectedMemo.content }}>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mt-6 pt-4 border-t">
                                    <div className="text-sm text-muted-foreground">
                                        Memo ID: {selectedMemo.id}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Posted: {format(new Date(selectedMemo.created_at), 'PPP')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Image Modal */}
            {selectedMemo && selectedMemo.image && (
                <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
                    <DialogContent className="sm:max-w-5xl max-h-[95vh] p-2 sm:p-4 flex items-center justify-center">
                        <div className="relative w-full h-full flex items-center justify-center">
                            <img
                                src={`/storage/${selectedMemo.image}`}
                                alt={selectedMemo.title}
                                className="max-w-full max-h-[85vh] object-contain"
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}

function MemoCard({ memo, onClick }) {
    const publishedDate = memo.published_at ? new Date(memo.published_at) : null;
    const author = memo.author || { name: 'Unknown' };
    const [authorAvatarSrc, setAuthorAvatarSrc] = useState(author.avatar ? `/storage/${author.avatar}` : null);
    const [imageError, setImageError] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const cardRef = useRef(null);
    const cardImageRef = useRef(null);
    const rafRef = useRef(null);

    // Handle author avatar error
    const handleAuthorAvatarError = () => {
        setAuthorAvatarSrc(null);
    };

    // Handle memo image error
    const handleMemoImageError = () => {
        setImageError(true);
    };

    // Track mouse position for zoom effect
    const handleMouseMove = (e) => {
        if (!cardRef.current || !cardImageRef.current) return;

        // Cancel any pending animation frame
        if (rafRef.current) {
            window.cancelAnimationFrame(rafRef.current);
        }

        // Use requestAnimationFrame for better performance
        rafRef.current = window.requestAnimationFrame(() => {
            const { left, top, width, height } = cardRef.current.getBoundingClientRect();

            // Calculate position in percentage (0 to 100)
            const x = Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100));
            const y = Math.max(0, Math.min(100, ((e.clientY - top) / height) * 100));

            // Update the transform origin directly on the element
            if (cardImageRef.current) {
                cardImageRef.current.style.transformOrigin = `${x}% ${y}%`;
            }
        });
    };

    // Clean up requestAnimationFrame on unmount
    useEffect(() => {
        return () => {
            if (rafRef.current) {
                window.cancelAnimationFrame(rafRef.current);
            }
        };
    }, []);

    return (
        <Card
            ref={cardRef}
            className="h-full group relative cursor-pointer overflow-hidden"
            onClick={onClick}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onMouseMove={handleMouseMove}
        >
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>

            {/* Image as background - full width/height */}
            {memo.image && !imageError ? (
                <div className="absolute inset-0 w-full h-full overflow-hidden">
                    <img
                        ref={cardImageRef}
                        src={`/storage/${memo.image}`}
                        alt={memo.title}
                        className={`w-full h-full object-cover transition-transform duration-200 ${isHovering ? 'scale-[2]' : 'scale-100'}`}
                        onError={handleMemoImageError}
                    />
                </div>
            ) : (
                <div className="absolute inset-0 w-full h-full bg-gray-100 flex items-center justify-center">
                    <div className="text-gray-400 text-3xl">{memo.category.name.charAt(0)}</div>
                </div>
            )}

            {/* Content overlay - shown on hover */}
            <div className="absolute inset-0 z-20 p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="text-white space-y-2">
                    <div className="flex justify-between items-start">
                        <Badge className="bg-white/20 hover:bg-white/30 text-white">
                            {memo.category.name}
                        </Badge>
                        {memo.is_published && (
                            <div className="text-sm text-white/80 flex items-center">
                                <CalendarIcon className="h-3 w-3 mr-1" />
                                {publishedDate ? formatDistanceToNow(publishedDate, { addSuffix: true }) : 'Not published'}
                            </div>
                        )}
                    </div>

                    <h3 className="font-bold text-lg line-clamp-2">{memo.title}</h3>

                    <div className="flex items-center mt-2">
                        {authorAvatarSrc ? (
                            <img
                                src={authorAvatarSrc}
                                alt={author.name}
                                className="w-8 h-8 rounded-full mr-2 object-cover border border-white/30"
                                onError={handleAuthorAvatarError}
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mr-2 border border-white/30">
                                <span className="text-xs font-bold text-white">
                                    {author.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        )}
                        <div className="text-white/90 text-sm font-medium">
                            {author.name}
                        </div>
                    </div>

                    <div className="text-sm text-white/80 line-clamp-3 overflow-hidden">
                        {memo.content ? memo.content.replace(/<[^>]*>?/gm, '') : ''}
                    </div>

                    <div className="flex justify-between items-center pt-2 text-xs text-white/70">
                        <div>ID: {memo.id}</div>
                        <Badge variant={memo.is_published ? "success" : "secondary"} className="bg-white/20 hover:bg-white/30 text-white">
                            {memo.is_published ? 'Published' : 'Draft'}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Provide minimum height for the card */}
            <div className="w-full h-80 sm:h-96"></div>
        </Card>
    );
}
