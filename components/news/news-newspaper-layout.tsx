import { NewsArticle, NewsCategory, Event } from '@/lib/news-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Clock, 
  Eye, 
  Heart, 
  MessageCircle, 
  Share2, 
  Zap, 
  Star,
  Filter
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

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
    <div className="w-full max-w-6xl mx-auto overflow-hidden">
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
            </div>
            
            {/* Status Indicators removed for cleaner mobile hero */}
          </div>
        </div>

        {/* Tablet/Desktop Hero - Three Columns */}
        <div className="hidden md:block">
          <div className="rounded-xl overflow-hidden bg-background">
            <div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Left Column - Events */}
                <div className="md:col-span-3 text-center md:text-left">
                  <Link 
                    href="/events" 
                    className="group p-3 h-full flex flex-col justify-center rounded-xl relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(90deg, oklch(0.4 0 0) 0%, oklch(0.4 0 0) 20%, transparent 50%, transparent 100%)',
                      backgroundSize: '200% 100%',
                      backgroundPosition: '100% 0',
                      transition: 'background-position 0.6s ease-out'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundPosition = '0% 0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundPosition = '100% 0';
                    }}
                  >
                    <h2 className="text-2xl font-black text-white mb-2 group-hover:text-gray-300 transition-colors">
                      Events
                    </h2>
                    <p className="text-gray-300 text-sm mb-2">
                      Discover upcoming events and join our community gatherings
                    </p>
                    <p className="text-gray-400 text-xs">
                      Connect with fellow developers, entrepreneurs, and Web3 enthusiasts
                    </p>
                  </Link>
                </div>

                {/* Center Column - Main Brand */}
                <div className="md:col-span-6 text-center">
                  <div className="flex items-center justify-center">
                    <Image
                      src="/logo.png"
                      alt="Web3 Recap"
                      width={160}
                      height={80}
                      className="h-20 w-40 md:h-24 md:w-48 lg:h-28 lg:w-56 xl:h-32 xl:w-64 object-contain"
                      priority
                    />
                  </div>
                </div>

                {/* Right Column - Showcase */}
                <div className="md:col-span-3 text-center md:text-right">
                  <Link 
                    href="/showcase" 
                    className="group p-3 h-full flex flex-col justify-center rounded-xl relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(270deg, oklch(0.4 0 0) 0%, oklch(0.4 0 0) 20%, transparent 50%, transparent 100%)',
                      backgroundSize: '200% 100%',
                      backgroundPosition: '0% 0',
                      transition: 'background-position 0.6s ease-out'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundPosition = '100% 0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundPosition = '0% 0';
                    }}
                  >
                    <h2 className="text-2xl font-black text-white mb-2 group-hover:text-gray-300 transition-colors">
                      Showcase
                    </h2>
                    <p className="text-gray-300 text-sm mb-2">
                      Explore our incredible platform and community achievements
                    </p>
                    <p className="text-gray-400 text-xs mb-1">
                      • Project galleries and portfolios
                    </p>
                    <p className="text-gray-400 text-xs mb-1">
                      • Community success stories
                    </p>
                    <p className="text-gray-400 text-xs">
                      • Innovation showcases and demos
                    </p>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Section */}
      <div className="py-0">
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
                      <article key={(content!.id || content!.slug || idx)} className="min-w-[260px] snap-start bg-card rounded-lg border overflow-hidden">
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

        {/* Tablet/Desktop Featured Layout - Three Columns */}
        <div className="hidden md:block">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
            {/* Left Text Block */}
          <div className="lg:col-span-3">
            {showDebugSquares ? (
              <div className="h-80 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">TEXT BLOCK</span>
              </div>
            ) : featuredLeft ? (
              <article className="h-full flex flex-col">
                <div className="bg-card rounded-lg border overflow-hidden h-full flex flex-col">
                  {/* Image at Top */}
                  <div className="relative h-32">
                    <Link href={isArticle(featuredLeft) ? `/news/${featuredLeft.slug}` : `/events/${featuredLeft.id}`}>
                      <div className="relative h-full group">
                        {(isArticle(featuredLeft) ? featuredLeft.featured_image_url : featuredLeft.banner_image) ? (
                          <Image
                            src={isArticle(featuredLeft) ? featuredLeft.featured_image_url! : featuredLeft.banner_image!}
                            alt={featuredLeft.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white text-2xl font-bold">
                              {featuredLeft.title.charAt(0)}
                            </span>
                          </div>
                        )}
                        
                        {/* Content Type Badge */}
                        <div className="absolute top-2 left-2">
                          <Badge variant={isArticle(featuredLeft) ? "default" : "secondary"} className="text-xs">
                            {isArticle(featuredLeft) ? "Article" : "Event"}
                          </Badge>
                        </div>
                        
                        {/* Date and Category Overlay */}
                        <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm rounded px-2 py-1">
                          <div className="flex items-center gap-2 text-white text-xs">
                            <Clock className="h-3 w-3" />
                            <span>
                              {isArticle(featuredLeft) 
                                ? new Date(featuredLeft.published_at || featuredLeft.created_at).toLocaleDateString()
                                : new Date(featuredLeft.event_date).toLocaleDateString()
                              }
                            </span>
                            <span>•</span>
                            <span>
                              {isArticle(featuredLeft) 
                                ? featuredLeft.category?.name 
                                : featuredLeft.event_type
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                  
                  {/* Header and Text Below */}
                  <div className="p-4 flex-1 flex flex-col">
                    <Link href={isArticle(featuredLeft) ? `/news/${featuredLeft.slug}` : `/events/${featuredLeft.id}`}>
                      <h2 className="text-lg font-bold text-foreground mb-3 hover:text-blue-600 transition-colors line-clamp-3">
                        {featuredLeft.title}
                      </h2>
                    </Link>
                    <p className="text-muted-foreground line-clamp-4 leading-relaxed text-sm flex-1">
                      {isArticle(featuredLeft) ? featuredLeft.excerpt : featuredLeft.description}
                    </p>
                  </div>
                </div>
              </article>
            ) : (
              <div className="h-80 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">TEXT BLOCK</span>
              </div>
            )}
          </div>

          {/* Central Main Image */}
          <div className="lg:col-span-6">
            {showDebugSquares ? (
              <div className="h-80 bg-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">MAIN IMAGE</span>
              </div>
            ) : featuredMain ? (
              <article className="h-full">
                <div className="bg-card rounded-lg border overflow-hidden h-full flex">
                  {/* Image on Left - Full Height */}
                  <div className="w-1/2 relative">
                    <Link href={isArticle(featuredMain) ? `/news/${featuredMain.slug}` : `/events/${featuredMain.id}`}>
                      <div className="relative h-full group">
                        {(isArticle(featuredMain) ? featuredMain.featured_image_url : featuredMain.banner_image) ? (
                          <Image
                            src={isArticle(featuredMain) ? featuredMain.featured_image_url! : featuredMain.banner_image!}
                            alt={featuredMain.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white text-4xl font-bold">
                              {featuredMain.title.charAt(0)}
                            </span>
                          </div>
                        )}
                        
                        {/* Overlay Badges - Top Left */}
                        <div className="absolute top-2 left-2 flex gap-2">
                          <Badge variant={isArticle(featuredMain) ? "default" : "secondary"} className="text-xs">
                            {isArticle(featuredMain) ? "Article" : "Event"}
                          </Badge>
                          {isArticle(featuredMain) && featuredMain.is_breaking && (
                            <Badge variant="destructive" className="bg-red-500 text-xs">
                              <Zap className="h-3 w-3 mr-1" />
                              BREAKING
                            </Badge>
                          )}
                          {featuredMain.is_featured && (
                            <Badge variant="default" className="bg-yellow-500 text-black text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              FEATURED
                            </Badge>
                          )}
                        </div>
                        
                        {/* Date and Category - Bottom Left Overlay */}
                        <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm rounded px-2 py-1">
                          <div className="flex items-center gap-2 text-white text-xs">
                            <Clock className="h-3 w-3" />
                            <span>
                              {isArticle(featuredMain) 
                                ? new Date(featuredMain.published_at || featuredMain.created_at).toLocaleDateString()
                                : new Date(featuredMain.event_date).toLocaleDateString()
                              }
                            </span>
                            <span>•</span>
                            <span>
                              {isArticle(featuredMain) 
                                ? featuredMain.category?.name 
                                : featuredMain.event_type
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                  
                  {/* Title and Content on Right */}
                  <div className="w-1/2 p-6 flex flex-col justify-center">
                    <Link href={isArticle(featuredMain) ? `/news/${featuredMain.slug}` : `/events/${featuredMain.id}`}>
                      <h2 className="text-3xl font-bold text-foreground hover:text-blue-600 transition-colors line-clamp-4 mb-4">
                        {featuredMain.title}
                      </h2>
                    </Link>
                    <p className="text-muted-foreground line-clamp-6 leading-relaxed text-lg">
                      {isArticle(featuredMain) ? featuredMain.excerpt : featuredMain.description}
                    </p>
                  </div>
                </div>
              </article>
            ) : (
              <div className="h-80 bg-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">MAIN IMAGE</span>
              </div>
            )}
          </div>

          {/* Right Article Block */}
          <div className="lg:col-span-3">
            {showDebugSquares ? (
              <div className="h-80 bg-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">RIGHT IMAGE</span>
              </div>
            ) : featuredRight ? (
              <article className="h-full flex flex-col">
                <div className="bg-card rounded-lg border overflow-hidden h-full flex flex-col">
                  {/* Image at Top */}
                  <div className="relative h-32">
                    <Link href={isArticle(featuredRight) ? `/news/${featuredRight.slug}` : `/events/${featuredRight.id}`}>
                      <div className="relative h-full group">
                        {(isArticle(featuredRight) ? featuredRight.featured_image_url : featuredRight.banner_image) ? (
                          <Image
                            src={isArticle(featuredRight) ? featuredRight.featured_image_url! : featuredRight.banner_image!}
                            alt={featuredRight.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
                            <span className="text-white text-2xl font-bold">
                              {featuredRight.title.charAt(0)}
                            </span>
                          </div>
                        )}
                        
                        {/* Content Type Badge */}
                        <div className="absolute top-2 left-2">
                          <Badge variant={isArticle(featuredRight) ? "default" : "secondary"} className="text-xs">
                            {isArticle(featuredRight) ? "Article" : "Event"}
                          </Badge>
                        </div>
                        
                        {/* Date and Category Overlay */}
                        <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm rounded px-2 py-1">
                          <div className="flex items-center gap-2 text-white text-xs">
                            <Clock className="h-3 w-3" />
                            <span>
                              {isArticle(featuredRight) 
                                ? new Date(featuredRight.published_at || featuredRight.created_at).toLocaleDateString()
                                : new Date(featuredRight.event_date).toLocaleDateString()
                              }
                            </span>
                            <span>•</span>
                            <span>
                              {isArticle(featuredRight) 
                                ? featuredRight.category?.name 
                                : featuredRight.event_type
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                  
                  {/* Header and Text Below */}
                  <div className="p-4 flex-1 flex flex-col">
                    <Link href={isArticle(featuredRight) ? `/news/${featuredRight.slug}` : `/events/${featuredRight.id}`}>
                      <h3 className="text-lg font-bold text-foreground mb-3 hover:text-blue-600 transition-colors line-clamp-3">
                        {featuredRight.title}
                      </h3>
                    </Link>
                    <p className="text-muted-foreground line-clamp-4 leading-relaxed text-sm flex-1">
                      {isArticle(featuredRight) ? featuredRight.excerpt : featuredRight.description}
                    </p>
                  </div>
                </div>
              </article>
            ) : (
              <div className="h-80 bg-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">RIGHT IMAGE</span>
              </div>
            )}
          </div>
        </div>

        {/* Secondary Content Grid - Only 3 positions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {Array.from({ length: 3 }).map((_, index) => {
            const position = index + 1;
            const content = getSecondaryContent(position);
            return (
              <div key={index}>
                {content ? (
                  <article className="group hover:shadow-lg transition-all duration-300">
                    <div className="bg-card rounded-lg border overflow-hidden h-full flex flex-col">
                      {/* Content Image */}
                      <div className="relative h-40">
                        {(isArticle(content) ? content.featured_image_url : content.banner_image) ? (
                          <Image
                            src={isArticle(content) ? content.featured_image_url! : content.banner_image!}
                            alt={content.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white text-4xl font-bold">
                              {content.title.charAt(0)}
                            </span>
                          </div>
                        )}
                        
                        {/* Content Type Badge */}
                        <div className="absolute top-2 left-2">
                          <Badge variant={isArticle(content) ? "default" : "secondary"} className="text-xs">
                            {isArticle(content) ? "Article" : "Event"}
                          </Badge>
                        </div>
                        
                        {/* Breaking Badge */}
                        {isArticle(content) && content.is_breaking && (
                          <Badge variant="destructive" className="absolute top-2 right-2 text-xs">
                            BREAKING
                          </Badge>
                        )}
                      </div>

                      {/* Content Details */}
                      <div className="p-4 flex-1 flex flex-col">
                        <Link href={isArticle(content) ? `/news/${content.slug}` : `/events/${content.id}`}>
                          <h3 className="font-semibold text-foreground group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
                            {content.title}
                          </h3>
                        </Link>
                        
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-3 flex-1">
                          {isArticle(content) ? content.excerpt : content.description}
                        </p>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {isArticle(content) 
                              ? new Date(content.published_at || content.created_at).toLocaleDateString()
                              : new Date(content.event_date).toLocaleDateString()
                            }
                          </span>
                          <span>•</span>
                          <span>
                            {isArticle(content) 
                              ? content.category?.name 
                              : content.event_type
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                ) : (
                  <div className="h-64 bg-red-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">SECONDARY {position}</span>
                  </div>
                )}
              </div>
            );
          })}
          </div>
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

        {/* All Articles - Mobile List View / Desktop Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            {activeCategory ? `${categories.find(c => c.id === activeCategory)?.name} Articles` : 'All Articles'}
          </h2>
          
          {/* Mobile List View (hide on tablet/desktop) */}
          <div className="md:hidden space-y-4">
            {filteredArticles.map((article) => (
              <article key={article.id} className="bg-card rounded-lg border overflow-hidden hover:shadow-lg transition-all duration-300">
                <div className="flex">
                  {/* Article Image */}
                  <div className="relative w-24 h-24 flex-shrink-0">
                    <Link href={`/news/${article.slug}`}>
                      <div className="relative h-full group">
                        {article.featured_image_url ? (
                          <Image
                            src={article.featured_image_url}
                            alt={article.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                            <span className="text-lg font-bold text-foreground">
                              {article.title.charAt(0)}
                            </span>
                          </div>
                        )}
                        
                        {/* Breaking Badge */}
                        {article.is_breaking && (
                          <Badge variant="destructive" className="absolute top-1 left-1 text-xs px-1 py-0">
                            BREAKING
                          </Badge>
                        )}
                        
                        {/* Featured Badge */}
                        {article.is_featured && (
                          <Badge variant="default" className="absolute top-1 right-1 text-xs px-1 py-0">
                            FEATURED
                          </Badge>
                        )}
                      </div>
                    </Link>
                  </div>

                  {/* Article Content */}
                  <div className="p-3 flex-1 min-w-0">
                    <Link href={`/news/${article.slug}`}>
                      <h3 className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-2 mb-2 text-sm">
                        {article.title}
                      </h3>
                    </Link>
                    
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {article.excerpt}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(article.published_at || article.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{article.category?.name}</span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Tablet/Desktop Grid View */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
                <article key={article.id} className="group hover:shadow-lg transition-all duration-300">
                  <div className="bg-card rounded-lg border overflow-hidden h-full flex flex-col">
                    {/* Article Image */}
                    <div className="relative h-48">
                      {article.featured_image_url ? (
                        <Image
                          src={article.featured_image_url}
                          alt={article.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                          <span className="text-4xl font-bold text-foreground">
                            {article.title.charAt(0)}
                          </span>
                        </div>
                      )}
                      
                      {/* Breaking Badge */}
                      {article.is_breaking && (
                        <Badge variant="destructive" className="absolute top-2 left-2 text-xs">
                          BREAKING
                        </Badge>
                      )}
                      
                      {/* Featured Badge */}
                      {article.is_featured && (
                        <Badge variant="default" className="absolute top-2 right-2 text-xs">
                          FEATURED
                        </Badge>
                      )}
                    </div>

                    {/* Article Content */}
                    <div className="p-4 flex-1 flex flex-col">
                      <Link href={`/news/${article.slug}`}>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                          {article.title}
                        </h3>
                      </Link>
                      
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-3 flex-1">
                        {article.excerpt}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(article.published_at || article.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{article.category?.name}</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
          </div>
        </div>

      </div>
    </div>
  );
}
