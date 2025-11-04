import { NewsArticle, Event, LayoutItem } from '@/lib/news-types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Clock, 
  Eye, 
  Heart, 
  MessageCircle, 
  Share2, 
  Zap, 
  Star,
  Save,
  RotateCcw
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

interface NewsLayoutBuilderProps {
  articles: NewsArticle[];
  events: Event[];
  onUpdateArticleLayout: (articleId: string, layoutPosition: string) => Promise<void>;
  onUpdateEventLayout: (eventId: string, layoutPosition: string) => Promise<void>;
  loading?: boolean;
}

const LAYOUT_POSITIONS = [
  { value: 'none', label: 'Not Featured', description: 'Regular content in category sections' },
  { value: 'featured_main', label: 'Featured Main', description: 'Large central image in featured section' },
  { value: 'featured_left', label: 'Featured Left', description: 'Left text block in featured section' },
  { value: 'featured_right', label: 'Featured Right', description: 'Right content block in featured section' },
  { value: 'secondary_1', label: 'Secondary 1', description: 'Top-left in secondary grid' },
  { value: 'secondary_2', label: 'Secondary 2', description: 'Top-center in secondary grid' },
  { value: 'secondary_3', label: 'Secondary 3', description: 'Top-right in secondary grid' },
];

export function NewsLayoutBuilder({ 
  articles, 
  events,
  onUpdateArticleLayout,
  onUpdateEventLayout,
  loading = false 
}: NewsLayoutBuilderProps) {
  const [updating, setUpdating] = useState<string | null>(null);

  const handleArticleLayoutChange = async (articleSlug: string, layoutPosition: string) => {
    setUpdating(articleSlug);
    try {
      await onUpdateArticleLayout(articleSlug, layoutPosition);
    } catch (error) {
      console.error('Error updating article layout:', error);
    } finally {
      setUpdating(null);
    }
  };

  const handleEventLayoutChange = async (eventId: string, layoutPosition: string) => {
    setUpdating(eventId);
    try {
      await onUpdateEventLayout(eventId, layoutPosition);
    } catch (error) {
      console.error('Error updating event layout:', error);
    } finally {
      setUpdating(null);
    }
  };

  const getPositionBadge = (position: string) => {
    if (!position || position === 'none') return <Badge variant="outline">Regular</Badge>;
    
    const layoutPos = LAYOUT_POSITIONS.find(p => p.value === position);
    if (!layoutPos) return <Badge variant="outline">Unknown</Badge>;
    
    if (position.startsWith('featured_')) {
      return <Badge variant="default" className="bg-yellow-500 text-black">Featured</Badge>;
    } else if (position.startsWith('secondary_')) {
      return <Badge variant="secondary">Secondary</Badge>;
    }
    
    return <Badge variant="outline">{layoutPos.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Layout Builder</h2>
        <div className="text-sm text-muted-foreground">
          {articles.length} articles • {events.length} events • Drag to reorder
        </div>
      </div>

      {/* Live Layout Preview */}
      <div className="bg-muted/50 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Live Layout Preview</h3>
        <div className="max-w-6xl mx-auto">
          {/* Featured Section Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
            {/* Featured Left */}
            <div className="lg:col-span-3">
              {(() => {
                const article = articles.find(a => a.layout_position === 'featured_left');
                const event = events.find(e => e.layout_position === 'featured_left');
                const item = article || event;
                
                if (item) {
                  return (
                    <div className="bg-card rounded-lg border p-4 h-32">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={article ? "default" : "secondary"} className="text-xs">
                          {article ? "Article" : "Event"}
                        </Badge>
                        {item.is_featured && (
                          <Badge variant="default" className="bg-yellow-500 text-black text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            FEATURED
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-semibold text-sm line-clamp-2 mb-2">
                        {item.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {article?.excerpt || event?.description}
                      </p>
                    </div>
                  );
                }
                
                return (
                  <div className="bg-yellow-100 dark:bg-yellow-900/20 rounded border-2 border-dashed border-yellow-400 flex items-center justify-center h-32">
                    <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">Featured Left</span>
                  </div>
                );
              })()}
            </div>

            {/* Featured Main */}
            <div className="lg:col-span-6">
              {(() => {
                const article = articles.find(a => a.layout_position === 'featured_main');
                const event = events.find(e => e.layout_position === 'featured_main');
                const item = article || event;
                
                if (item) {
                  return (
                    <div className="bg-card rounded-lg border overflow-hidden h-32">
                      <div className="relative h-24 mb-2">
                        {(article?.featured_image_url || event?.banner_image) ? (
                          <img
                            src={article?.featured_image_url || event?.banner_image}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white text-2xl font-bold">
                              {item.title?.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="px-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={article ? "default" : "secondary"} className="text-xs">
                            {article ? "Article" : "Event"}
                          </Badge>
                          {item.is_featured && (
                            <Badge variant="default" className="bg-yellow-500 text-black text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              FEATURED
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-semibold text-sm line-clamp-1">
                          {item.title}
                        </h4>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div className="bg-yellow-100 dark:bg-yellow-900/20 rounded border-2 border-dashed border-yellow-400 flex items-center justify-center h-32">
                    <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">Featured Main</span>
                  </div>
                );
              })()}
            </div>

            {/* Featured Right */}
            <div className="lg:col-span-3">
              {(() => {
                const article = articles.find(a => a.layout_position === 'featured_right');
                const event = events.find(e => e.layout_position === 'featured_right');
                const item = article || event;
                
                if (item) {
                  return (
                    <div className="bg-card rounded-lg border overflow-hidden h-32">
                      <div className="relative h-20 mb-2">
                        {(article?.featured_image_url || event?.banner_image) ? (
                          <img
                            src={article?.featured_image_url || event?.banner_image}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
                            <span className="text-white text-xl font-bold">
                              {item.title?.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="px-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={article ? "default" : "secondary"} className="text-xs">
                            {article ? "Article" : "Event"}
                          </Badge>
                          {item.is_featured && (
                            <Badge variant="default" className="bg-yellow-500 text-black text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              FEATURED
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-semibold text-sm line-clamp-2">
                          {item.title}
                        </h4>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div className="bg-yellow-100 dark:bg-yellow-900/20 rounded border-2 border-dashed border-yellow-400 flex items-center justify-center h-32">
                    <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">Featured Right</span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Secondary Content Grid Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, index) => {
              const position = index + 1;
              const article = articles.find(a => a.layout_position === `secondary_${position}`);
              const event = events.find(e => e.layout_position === `secondary_${position}`);
              const item = article || event;
              
              return (
                <div key={index} className="h-24">
                  {item ? (
                    <div className="bg-card rounded-lg border overflow-hidden h-full">
                      <div className="relative h-16">
                        {(article?.featured_image_url || event?.banner_image) ? (
                          <img
                            src={article?.featured_image_url || event?.banner_image}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white text-lg font-bold">
                              {item.title?.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <div className="flex items-center gap-1 mb-1">
                          <Badge variant={article ? "default" : "secondary"} className="text-xs">
                            {article ? "Article" : "Event"}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-xs line-clamp-2">
                          {item.title}
                        </h4>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-100 dark:bg-blue-900/20 rounded border-2 border-dashed border-blue-400 flex items-center justify-center h-full">
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Secondary {position}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="space-y-4">
        {/* Articles Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Articles</h3>
          {articles.map((article) => (
          <div key={article.id} className="bg-card rounded-lg border p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              {/* Article Image */}
              <div className="relative w-24 h-16 flex-shrink-0">
                {article.featured_image_url ? (
                  <Image
                    src={article.featured_image_url}
                    alt={article.title}
                    fill
                    className="object-cover rounded"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
                    <span className="text-white text-lg font-bold">
                      {article.title.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Article Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <Link href={`/news/${article.slug}`}>
                      <h3 className="font-semibold text-foreground hover:text-blue-600 transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {article.excerpt}
                    </p>
                  </div>
                  
                  {/* Current Position Badge */}
                  <div className="ml-4 flex-shrink-0">
                    {getPositionBadge(article.layout_position || '')}
                  </div>
                </div>

                {/* Article Meta */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(article.published_at || article.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {article.view_count || 0}
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {article.like_count || 0}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {article.comment_count || 0}
                  </div>
                  {article.is_breaking && (
                    <Badge variant="destructive" className="text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      BREAKING
                    </Badge>
                  )}
                  {article.is_featured && (
                    <Badge variant="default" className="bg-yellow-500 text-black text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      FEATURED
                    </Badge>
                  )}
                </div>

                {/* Layout Position Selector */}
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-foreground">
                    Layout Position:
                  </label>
                  <Select
                    value={article.layout_position || 'none'}
                    onValueChange={(value) => handleArticleLayoutChange(article.slug, value === 'none' ? '' : value)}
                    disabled={updating === article.slug}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select position..." />
                    </SelectTrigger>
                    <SelectContent>
                      {LAYOUT_POSITIONS.map((position) => (
                        <SelectItem key={position.value} value={position.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{position.label}</span>
                            <span className="text-xs text-muted-foreground">{position.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {updating === article.slug && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                      Updating...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        </div>

        {/* Events Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Events</h3>
          {events.map((event) => (
            <div key={event.id} className="bg-card rounded-lg border p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                {/* Event Image */}
                <div className="relative w-24 h-16 flex-shrink-0">
                  {event.banner_image ? (
                    <Image
                      src={event.banner_image}
                      alt={event.title}
                      fill
                      className="object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-500 to-blue-600 rounded flex items-center justify-center">
                      <span className="text-white text-lg font-bold">
                        {event.title.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Event Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <Link href={`/events/${event.id}`}>
                        <h3 className="font-semibold text-foreground hover:text-blue-600 transition-colors line-clamp-2">
                          {event.title}
                        </h3>
                      </Link>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {event.description}
                      </p>
                    </div>
                    
                    {/* Current Position Badge */}
                    <div className="ml-4 flex-shrink-0">
                      {getPositionBadge(event.layout_position || '')}
                    </div>
                  </div>

                  {/* Event Meta */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(event.event_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {event.event_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs">
                        {event.current_attendees_count}/{event.max_attendees} attendees
                      </span>
                    </div>
                    {event.is_featured && (
                      <Badge variant="default" className="bg-yellow-500 text-black text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        FEATURED
                      </Badge>
                    )}
                  </div>

                  {/* Layout Position Selector */}
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-foreground">
                      Layout Position:
                    </label>
                    <Select
                      value={event.layout_position || 'none'}
                      onValueChange={(value) => handleEventLayoutChange(event.id, value === 'none' ? '' : value)}
                      disabled={updating === event.id}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select position..." />
                      </SelectTrigger>
                      <SelectContent>
                        {LAYOUT_POSITIONS.map((position) => (
                          <SelectItem key={position.value} value={position.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{position.label}</span>
                              <span className="text-xs text-muted-foreground">{position.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {updating === event.id && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                        Updating...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
