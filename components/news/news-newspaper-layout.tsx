import { NewsArticle, NewsCategory, Event } from '@/lib/news-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { 
  Clock, 
  Eye, 
  Heart, 
  MessageCircle, 
  Share2, 
  Zap, 
  Star,
  Filter,
  Calendar,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Users,
  Newspaper
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import headObject from './head_object.png';
import headText from './head_text.png';
import { AdminArticleInput } from './admin-article-input';
import { useState, useEffect } from 'react';

interface NewsNewspaperLayoutProps {
  articles: NewsArticle[];
  events: Event[];
  categories: NewsCategory[];
  loading: boolean;
  onCategoryChange: (categoryId: string | null) => void;
  activeCategory: string | null;
}

export function NewsNewspaperLayout({ 
  articles, 
  events,
  categories, 
  loading, 
  onCategoryChange, 
  activeCategory 
}: NewsNewspaperLayoutProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  
  useEffect(() => {
    if (!api) return;
    
    setCurrent(api.selectedScrollSnap());
    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Get content by layout position - these should NEVER change based on category filter
  const featuredMain = articles.find(article => article.layout_position === 'featured_main') || 
                      events.find(event => event.layout_position === 'featured_main');
  const featuredLeft = articles.find(article => article.layout_position === 'featured_left') || 
                      events.find(event => event.layout_position === 'featured_left');
  const featuredRight = articles.find(article => article.layout_position === 'featured_right') || 
                       events.find(event => event.layout_position === 'featured_right');
  
  // Get secondary content in their specific positions
  const getSecondaryContent = (position: number) => {
    const article = articles.find(article => article.layout_position === `secondary_${position}`);
    const event = events.find(event => event.layout_position === `secondary_${position}`);
    return article || event;
  };

  // Helper function to determine if content is an article or event
  const isArticle = (content: any): content is NewsArticle => {
    return content && 'slug' in content;
  };

  const isEvent = (content: any): content is Event => {
    return content && 'event_date' in content;
  };

  // Filter articles for the "All Articles" section only - this is separate from layout
  const filteredArticles = articles.filter(article => 
    !activeCategory || article.category_id === activeCategory
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-96 bg-muted animate-pulse rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Debug mode - show layout structure with colored squares when no articles are assigned
  const showDebugSquares = false; // Only show debug squares when positions are empty

  return (
    <div className="relative w-full min-h-screen">
      {/* Background with SVG - disabled until file is available */}
      {/* <div 
        className="absolute inset-0 w-full h-full opacity-50"
        style={{
          backgroundImage: 'url(/news_bg.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'top',
          backgroundRepeat: 'no-repeat',
          zIndex: 0
        }}
      /> */}
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto overflow-hidden px-4 md:px-6">
      {/* Hero Banner Section - Two Panel Layout */}
      <div className="mb-12 md:mb-16">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Left Panel: Text and Buttons */}
          <div className="flex-1 flex flex-col">
            {/* Red Rectangle Area: Large Heading Image */}
            <div className="mb-8" style={{ marginTop: '120px' }}>
              <Image
                src={headText}
                alt="Summarizing the most important update on WEB3"
                width={700}
                height={220}
                className="w-full h-auto max-w-3x2"
                priority
              />
            </div>

            {/* Green Rectangle Area: Empty space for future content */}
            <div className="mb-8 min-h-[100px]">
              {/* This space is reserved for future content */}
            </div>
          </div>

          {/* Right Panel: Earth Image */}
          <div className="flex-1">
            <div 
              className="relative h-full min-h-[400px] md:min-h-[500px]"
            >
              {/* Earth/Object Image */}
              <Image
                src={headObject}
                alt="Earth night view"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Hero Section */}
      <div className="mb-2">
        {/* Mobile Hero - Single Column (hide on tablet/desktop) */}
        <div className="md:hidden">
          <div className="bg-card rounded-xl p-4 text-center border">
            {/* Prominent logo on mobile */}
            <div className="flex items-center justify-center mb-2">
              <Image
                src="/logo.png"
                alt="Web3 Recap"
                width={320}
                height={100}
                className="h-24 w-auto object-contain"
                priority
              />
            </div>
            
            {/* Mobile Quick Links */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Link 
                href="/events" 
                className="bg-muted rounded-lg p-2 text-center hover:bg-accent transition-colors"
              >
                <h3 className="text-sm font-bold text-foreground mb-0.5">Events</h3>
                <p className="text-[10px] text-muted-foreground">Community gatherings</p>
              </Link>
              <Link 
                href="/showcase" 
                className="bg-muted rounded-lg p-2 text-center hover:bg-accent transition-colors"
              >
                <h3 className="text-sm font-bold text-foreground mb-0.5">Showcase</h3>
                <p className="text-[10px] text-muted-foreground">Platform features</p>
              </Link>
              <Link 
                href="/teams" 
                className="bg-muted rounded-lg p-2 text-center hover:bg-accent transition-colors"
              >
                <h3 className="text-sm font-bold text-foreground mb-0.5">Teams</h3>
                <p className="text-[10px] text-muted-foreground">Find collaborators</p>
              </Link>
              <Link 
                href="/magazine" 
                className="bg-muted rounded-lg p-2 text-center hover:bg-accent transition-colors"
              >
                <h3 className="text-sm font-bold text-foreground mb-0.5">Magazine</h3>
                <p className="text-[10px] text-muted-foreground">Read articles</p>
              </Link>
            </div>
            
            {/* Status Indicators removed for cleaner mobile hero */}
          </div>
        </div>

        {/* Tablet/Desktop - Events, Showcase, Teams, and Magazine Cards */}
        <div className="hidden md:block -mt-4 mb-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex gap-4 relative">
              {/* Events Card */}
              <Link 
                href="/events" 
                className="flex-1 group block"
                onMouseEnter={(e) => {
                  const card = e.currentTarget.querySelector('[data-slot="card"]') as HTMLElement
                  if (card) {
                    card.style.transform = 'translateY(-12px) scale(1.03)'
                    card.style.zIndex = '10'
                    card.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                  }
                }}
                onMouseLeave={(e) => {
                  const card = e.currentTarget.querySelector('[data-slot="card"]') as HTMLElement
                  if (card) {
                    card.style.transform = 'translateY(0) scale(1)'
                    card.style.zIndex = '1'
                    card.style.boxShadow = ''
                  }
                }}
              >
                <Card 
                  className="h-full bg-white border border-gray-200 text-gray-900 transition-all duration-300 ease-out cursor-pointer relative shadow-sm"
                  style={{
                    transform: 'translateY(0) scale(1)',
                    zIndex: 1,
                    willChange: 'transform'
                  }}
                >
                  <CardHeader className="pb-3">
                    <Calendar className="h-5 w-5 mb-2 text-primary" />
                    <CardTitle className="text-lg font-bold text-gray-900">
                      Events
                    </CardTitle>
                    <CardDescription className="text-gray-600 text-xs leading-tight">
                      Discover upcoming events and join our community
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              {/* Showcase Card */}
              <Link 
                href="/showcase" 
                className="flex-1 group block"
                onMouseEnter={(e) => {
                  const card = e.currentTarget.querySelector('[data-slot="card"]') as HTMLElement
                  if (card) {
                    card.style.transform = 'translateY(-12px) scale(1.03)'
                    card.style.zIndex = '10'
                    card.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                  }
                }}
                onMouseLeave={(e) => {
                  const card = e.currentTarget.querySelector('[data-slot="card"]') as HTMLElement
                  if (card) {
                    card.style.transform = 'translateY(0) scale(1)'
                    card.style.zIndex = '1'
                    card.style.boxShadow = ''
                  }
                }}
              >
                <Card 
                  className="h-full bg-white border border-gray-200 text-gray-900 transition-all duration-300 ease-out cursor-pointer relative shadow-sm"
                  style={{
                    transform: 'translateY(0) scale(1)',
                    zIndex: 1,
                    willChange: 'transform'
                  }}
                >
                  <CardHeader className="pb-3">
                    <Trophy className="h-5 w-5 mb-2 text-primary" />
                    <CardTitle className="text-lg font-bold text-gray-900">
                      Showcase
                    </CardTitle>
                    <CardDescription className="text-gray-600 text-xs leading-tight">
                      Explore our platform and community achievements
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              {/* Teams Card */}
              <Link 
                href="/teams" 
                className="flex-1 group block"
                onMouseEnter={(e) => {
                  const card = e.currentTarget.querySelector('[data-slot="card"]') as HTMLElement
                  if (card) {
                    card.style.transform = 'translateY(-12px) scale(1.03)'
                    card.style.zIndex = '10'
                    card.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                  }
                }}
                onMouseLeave={(e) => {
                  const card = e.currentTarget.querySelector('[data-slot="card"]') as HTMLElement
                  if (card) {
                    card.style.transform = 'translateY(0) scale(1)'
                    card.style.zIndex = '1'
                    card.style.boxShadow = ''
                  }
                }}
              >
                <Card 
                  className="h-full bg-white border border-gray-200 text-gray-900 transition-all duration-300 ease-out cursor-pointer relative shadow-sm"
                  style={{
                    transform: 'translateY(0) scale(1)',
                    zIndex: 1,
                    willChange: 'transform'
                  }}
                >
                  <CardHeader className="pb-3">
                    <Users className="h-5 w-5 mb-2 text-primary" />
                    <CardTitle className="text-lg font-bold text-gray-900">
                      Teams
                    </CardTitle>
                    <CardDescription className="text-gray-600 text-xs leading-tight">
                      Find collaborators and build amazing projects together
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              {/* Magazine Card */}
              <Link 
                href="/magazine" 
                className="flex-1 group block"
                onMouseEnter={(e) => {
                  const card = e.currentTarget.querySelector('[data-slot="card"]') as HTMLElement
                  if (card) {
                    card.style.transform = 'translateY(-12px) scale(1.03)'
                    card.style.zIndex = '10'
                    card.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                  }
                }}
                onMouseLeave={(e) => {
                  const card = e.currentTarget.querySelector('[data-slot="card"]') as HTMLElement
                  if (card) {
                    card.style.transform = 'translateY(0) scale(1)'
                    card.style.zIndex = '1'
                    card.style.boxShadow = ''
                  }
                }}
              >
                <Card 
                  className="h-full bg-white border border-gray-200 text-gray-900 transition-all duration-300 ease-out cursor-pointer relative shadow-sm"
                  style={{
                    transform: 'translateY(0) scale(1)',
                    zIndex: 1,
                    willChange: 'transform'
                  }}
                >
                  <CardHeader className="pb-3">
                    <Newspaper className="h-5 w-5 mb-2 text-primary" />
                    <CardTitle className="text-lg font-bold text-gray-900">
                      Magazine
                    </CardTitle>
                    <CardDescription className="text-gray-600 text-xs leading-tight">
                      Read articles and stay updated with the latest news
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Article Input (Dev Only) */}
      <AdminArticleInput 
        categories={categories}
        onArticleCreated={() => {
          // Refresh the page to show new article
          if (typeof window !== 'undefined') {
            window.location.reload()
          }
        }}
      />

      {/* Featured Section */}
      <div className="pt-8 pb-12 md:pt-12 md:pb-16">
        {/* Mobile Featured Layout - Two horizontally scrollable rows, 3 cards each */}
        <div className="md:hidden mb-4">
          {(() => {
            const slots: any[] = [
              featuredLeft || { __placeholder: true, label: 'TEXT BLOCK', color: 'bg-blue-500' },
              featuredMain || { __placeholder: true, label: 'MAIN IMAGE', color: 'bg-red-500' },
              featuredRight || { __placeholder: true, label: 'RIGHT IMAGE', color: 'bg-red-500' },
              getSecondaryContent(1) || { __placeholder: true, label: 'SECONDARY 1', color: 'bg-red-500' },
              getSecondaryContent(2) || { __placeholder: true, label: 'SECONDARY 2', color: 'bg-red-500' },
              getSecondaryContent(3) || { __placeholder: true, label: 'SECONDARY 3', color: 'bg-red-500' },
            ]
            const rows = [slots.slice(0,3), slots.slice(3,6)]
            return (
              <>
                <h2 className="text-xl font-bold text-foreground mb-2 px-1">Featured</h2>
                {rows.map((row, rIdx) => (
                  <div key={rIdx} className="flex gap-4 overflow-x-auto no-scrollbar px-1 -mx-1 snap-x py-1">
                    {row.map((content: any, idx: number) => (
                      <article 
                        key={(content!.id || content!.slug || idx)} 
                        className="min-w-[260px] snap-start bg-card rounded-lg border overflow-hidden transition-all duration-300 ease-out cursor-pointer"
                        style={{
                          transform: 'translateY(0) scale(1)',
                          zIndex: 1,
                          willChange: 'transform'
                        }}
                        onMouseEnter={(e) => {
                          const cardEl = e.currentTarget;
                          cardEl.style.transform = 'translateY(-8px) scale(1.02)';
                          cardEl.style.zIndex = '10';
                          cardEl.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                        }}
                        onMouseLeave={(e) => {
                          const cardEl = e.currentTarget;
                          cardEl.style.transform = 'translateY(0) scale(1)';
                          cardEl.style.zIndex = '1';
                          cardEl.style.boxShadow = 'none';
                        }}
                      >
                        <div className="relative h-40">
                          {content.__placeholder ? (
                            <div className={`w-full h-full ${content.color} flex items-center justify-center`}>
                              <span className="text-white font-bold">{content.label}</span>
                            </div>
                          ) : (
                            <Link href={isArticle(content!) ? `/news/${content!.slug}` : `/events/${content!.id}`}>
                              <div className="relative h-full group">
                                {(isArticle(content!) ? content!.featured_image_url : content!.banner_image) ? (
                                  <Image
                                    src={isArticle(content!) ? content!.featured_image_url! : content!.banner_image!}
                                    alt={content!.title}
                                    fill
                                    priority={rIdx === 0 && idx === 0}
                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                                    <span className="text-2xl font-bold text-foreground">
                                      {content!.title?.charAt ? content!.title.charAt(0) : '•'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </Link>
                          )}
                        </div>
                        <div className="p-3">
                          {content.__placeholder ? (
                            <div className="h-4" />
                          ) : (
                            <>
                              <Link href={isArticle(content!) ? `/news/${content!.slug}` : `/events/${content!.id}`}>
                                <h3 className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-2 mb-2 text-sm">
                                  {content!.title}
                                </h3>
                              </Link>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {isArticle(content!) 
                                    ? new Date(content!.published_at || content!.created_at).toLocaleDateString()
                                    : new Date(content!.event_date).toLocaleDateString()
                                  }
                                </span>
                                <span>•</span>
                                <span>
                                  {isArticle(content!) 
                                    ? content!.category?.name 
                                    : content!.event_type
                                  }
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ))}
              </>
            )
          })()}
        </div>

        {/* Tablet/Desktop Featured Layout - Card Carousel */}
        <div className="hidden md:block">
          {/* Collect all featured content for carousel */}
          {(() => {
            const featuredContent = [
              featuredLeft,
              featuredMain,
              featuredRight,
              getSecondaryContent(1),
              getSecondaryContent(2),
              getSecondaryContent(3),
            ].filter(Boolean);

            if (featuredContent.length === 0) {
              return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="h-80 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">TEXT BLOCK</span>
              </div>
                  <div className="h-80 bg-red-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">MAIN IMAGE</span>
                  </div>
                  <div className="h-80 bg-red-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">RIGHT IMAGE</span>
                  </div>
                </div>
              );
            }

            return (
              <Carousel
                opts={{
                  align: 'start',
                  loop: false,
                }}
                setApi={setApi}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4 py-4">
                  {featuredContent.map((content, index) => {
                    // Check if article is new (published within last 7 days)
                    const isNew = content && isArticle(content) && content.published_at
                      ? new Date(content.published_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
                      : false;
                    
                    return (
                      <CarouselItem key={content ? (isArticle(content) ? content.id : content.id) || index : index} className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                        <div className="px-2 py-4">
                          <Link href={content && isArticle(content) ? `/news/${content.slug}` : content ? `/events/${content.id}` : '#'}>
                            <div 
                              className="relative group cursor-pointer transition-all duration-300 ease-out"
                              style={{
                                transform: 'translateY(0) scale(1)',
                                zIndex: 1,
                                willChange: 'transform'
                              }}
                              onMouseEnter={(e) => {
                                const cardEl = e.currentTarget;
                                cardEl.style.transform = 'translateY(-12px) scale(1.03)';
                                cardEl.style.zIndex = '10';
                                cardEl.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
                              }}
                              onMouseLeave={(e) => {
                                const cardEl = e.currentTarget;
                                cardEl.style.transform = 'translateY(0) scale(1)';
                                cardEl.style.zIndex = '1';
                                cardEl.style.boxShadow = 'none';
                              }}
                            >
                              {/* Card Container */}
                              <div className="relative h-[400px] rounded-lg overflow-hidden bg-black">
                                {/* Article Image */}
                                {content && (isArticle(content) ? content.featured_image_url : content.banner_image) ? (
                                  <Image
                                    src={isArticle(content) ? content.featured_image_url! : content.banner_image!}
                                    alt={content.title}
                                    fill
                                    priority={index === 0}
                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
                                    <span className="text-6xl font-bold text-white/50">
                                      {content?.title?.charAt ? content.title.charAt(0) : '•'}
                                    </span>
                                  </div>
                                )}
                          
                                {/* Dark overlay for text readability */}
                                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black/70" />
                                
                                {/* Badges Container - Top Right */}
                                <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
                                  {isNew && (
                                    <div className="bg-red-500 px-2.5 py-1 rounded-md shadow-lg">
                                      <span className="text-white text-[10px] font-semibold uppercase tracking-wide">NEW</span>
                                    </div>
                                  )}
                                  {content && isArticle(content) && content.is_breaking && (
                                    <div className="bg-orange-500 px-2.5 py-1 rounded-md shadow-lg">
                                      <span className="text-white text-[10px] font-semibold uppercase tracking-wide">BREAKING</span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Content Overlay - Bottom */}
                                <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                                  {/* Category/Type Badge */}
                                  <div className="mb-3">
                                    <span className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-white text-xs font-medium">
                                      {content 
                                        ? (isArticle(content) 
                                          ? (content.category?.name || 'Article')
                                          : content.event_type || 'Event')
                                        : 'Content'}
                                    </span>
                                  </div>
                                  
                                  {/* Title */}
                                  <h3 className="text-2xl md:text-3xl font-bold text-white line-clamp-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] leading-tight">
                                    {content?.title || 'Untitled'}
                                  </h3>
                                </div>
                              </div>
                            </div>
                          </Link>
                        </div>
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
                
                {/* Pagination Controls */}
                <div className="flex items-center justify-center gap-4 mt-6">
                  <button
                    onClick={() => api?.scrollPrev()}
                    className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!api?.canScrollPrev()}
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="h-4 w-4 text-foreground" />
                  </button>
                  <div className="flex gap-2">
                    {Array.from({ length: Math.max(1, Math.ceil(featuredContent.length / 4)) }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => api?.scrollTo(index * 4)}
                        className={`w-2 h-2 rounded-full transition-opacity ${
                          Math.floor(current / 4) === index ? 'bg-red-500 opacity-100' : 'bg-red-500 opacity-50'
                        }`}
                        aria-label={`Go to page ${index + 1}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => api?.scrollNext()}
                    className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!api?.canScrollNext()}
                    aria-label="Next slide"
                  >
                    <ChevronRight className="h-4 w-4 text-foreground" />
                  </button>
                </div>
              </Carousel>
            );
          })()}
        </div>

        {/* Category Dropdown */}
        <div className="w-full bg-card border rounded-lg mb-8">
          <div className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground">Categories</h3>
              </div>
              <Select 
                value={activeCategory || "all"} 
                onValueChange={(value) => onCategoryChange(value === "all" ? null : value)}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span>All Categories</span>
                    </div>
                  </SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: category.color || 'var(--primary)' }}
                        ></div>
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* All Articles - Vertical List */}
        <div className="mb-12 md:mb-16 pt-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
            {activeCategory ? `${categories.find(c => c.id === activeCategory)?.name} Articles` : 'All Articles'}
          </h2>
          
          {/* Vertical List View */}
          <div className="space-y-6">
            {filteredArticles.map((article, index) => {
              // Format date like "MAY 24, 2025"
              const formattedDate = article.published_at || article.created_at
                ? (() => {
                    const date = new Date(article.published_at || article.created_at);
                    const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                    const day = date.getDate();
                    const year = date.getFullYear();
                    return `${month} ${day}, ${year}`;
                  })()
                : '';
              
              const authorName = article.author_name || article.author?.name || article.external_source || 'WEB3 RECAP';
              // Use article featured image instead of author avatar
              const thumbnailUrl = article.featured_image_url;
              
              return (
                <article 
                  key={article.id} 
                  className="flex gap-4 items-start transition-all duration-300 ease-out cursor-pointer relative"
                  style={{
                    transform: 'translateY(0) scale(1)',
                    zIndex: 1,
                    willChange: 'transform'
                  }}
                  onMouseEnter={(e) => {
                    const articleEl = e.currentTarget;
                    articleEl.style.transform = 'translateY(-8px) scale(1.02)';
                    articleEl.style.zIndex = '10';
                    articleEl.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                  }}
                  onMouseLeave={(e) => {
                    const articleEl = e.currentTarget;
                    articleEl.style.transform = 'translateY(0) scale(1)';
                    articleEl.style.zIndex = '1';
                    articleEl.style.boxShadow = 'none';
                  }}
                >
                  {/* Thumbnail with Numbered Badge */}
                  <div className="relative flex-shrink-0">
                    <Link href={`/news/${article.slug}`}>
                      <div className="relative w-16 h-16 rounded border border-border overflow-hidden">
                        {thumbnailUrl ? (
                          <Image
                            src={thumbnailUrl}
                            alt={article.title}
                            fill
                            className="object-cover"
                          />
                        ) : article.category?.color ? (
                          <div 
                            className="w-full h-full flex items-center justify-center"
                            style={{ backgroundColor: article.category.color }}
                          >
                            <span className="text-white font-bold text-lg">
                              {article.category.name.charAt(0)}
                            </span>
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                            <span className="text-foreground font-bold text-lg">
                              {article.title.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                    {/* Numbered Badge */}
                    <div className="absolute -top-1 -right-1 bg-background border border-border rounded-full w-5 h-5 flex items-center justify-center">
                      <span className="text-xs font-bold text-foreground">{index + 1}</span>
                    </div>
                  </div>

                  {/* Article Content */}
                  <div className="flex-1 min-w-0">
                    {/* Metadata Line */}
                    <div className="text-xs text-muted-foreground mb-1">
                      <span className="font-medium">{authorName}</span>
                      {formattedDate && (
                        <>
                          <span className="mx-1">-</span>
                          <span>{formattedDate}</span>
                        </>
                      )}
                    </div>
                    
                    {/* Article Title */}
                    <Link href={`/news/${article.slug}`}>
                      <h3 className="text-xl md:text-2xl font-bold mb-0 leading-tight text-foreground hover:text-blue-600 transition-colors">
                        {article.title}
                      </h3>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

      </div>
      </div>
    </div>
  );
}


