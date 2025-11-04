'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { NewsArticle, NewsCategory, NewsArticleFormData } from '@/lib/news-types';
import { NewsEditorHeader } from './news-editor-header';
import { NewsEditorForm } from './news-editor-form';
import { NewsEditorPreview } from './news-editor-preview';
import { NewsEditorSidebar } from './news-editor-sidebar';
import { useToast } from '@/hooks/use-toast';
import { useApi } from '@/hooks/use-api';
import { useSession } from '@/store/useSession';

export function NewsEditorPage() {
  const { user } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [formData, setFormData] = useState<NewsArticleFormData>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featured_image_url: '',
    featured_image_alt: '',
    author_name: '',
    author_email: '',
    author_bio: '',
    author_avatar_url: '',
    author_twitter: '',
    author_linkedin: '',
    category_id: '',
    subcategory: '',
    tags: [],
    source_type: 'internal',
    external_url: '',
    external_source: '',
    status: 'draft',
    is_breaking: false,
    is_featured: false,
    is_trending: false,
    is_editor_pick: false,
    priority: 0,
    editor_notes: '',
    content_type: 'article',
    language: 'en',
    reading_level: 'intermediate',
    allow_comments: true,
    allow_sharing: true,
    allow_bookmarking: true,
    meta_title: '',
    meta_description: '',
    meta_keywords: [],
    canonical_url: '',
    og_title: '',
    og_description: '',
    og_image_url: '',
    twitter_title: '',
    twitter_description: '',
    twitter_image_url: '',
  });

  const { toast } = useToast();
  const { execute } = useApi();

  useEffect(() => {
    loadCategories();
    loadArticleForEditing();
  }, []);

  const loadArticleForEditing = async () => {
    const articleId = searchParams.get('id');
    if (!articleId) return;

    try {
      setLoading(true);
      console.log('Loading article for editing, ID:', articleId);
      const result = await execute(`/api/news/${articleId}`);
      
      if (result.success && result.data) {
        const articleData = result.data.article;
        console.log('Article loaded for editing:', articleData);
        console.log('Article ID:', articleData.id);
        console.log('Article status:', articleData.status);
        console.log('Article content length:', articleData.content?.length || 0);
        console.log('Article content preview:', articleData.content?.substring(0, 200) + '...');
        setArticle(articleData);
        
        // Populate form with existing article data
        const formDataToSet = {
          title: articleData.title || '',
          slug: articleData.slug || '',
          excerpt: articleData.excerpt || '',
          content: articleData.content || '',
          featured_image_url: articleData.featured_image_url || '',
          featured_image_alt: articleData.featured_image_alt || '',
          author_name: articleData.author_name || '',
          author_email: articleData.author_email || '',
          author_bio: articleData.author_bio || '',
          author_avatar_url: articleData.author_avatar_url || '',
          author_twitter: articleData.author_twitter || '',
          author_linkedin: articleData.author_linkedin || '',
          category_id: articleData.category_id || '',
          subcategory: articleData.subcategory || '',
          tags: articleData.tags || [],
          source_type: articleData.source_type || 'internal',
          external_url: articleData.external_url || '',
          external_source: articleData.external_source || '',
          status: articleData.status || 'draft',
          is_breaking: articleData.is_breaking || false,
          is_featured: articleData.is_featured || false,
          is_trending: articleData.is_trending || false,
          is_editor_pick: articleData.is_editor_pick || false,
          priority: articleData.priority || 0,
          editor_notes: articleData.editor_notes || '',
          content_type: articleData.content_type || 'article',
          language: articleData.language || 'en',
          reading_level: articleData.reading_level || 'intermediate',
          allow_comments: articleData.allow_comments !== false,
          allow_sharing: articleData.allow_sharing !== false,
          allow_bookmarking: articleData.allow_bookmarking !== false,
          meta_title: articleData.meta_title || '',
          meta_description: articleData.meta_description || '',
          meta_keywords: articleData.meta_keywords || [],
          canonical_url: articleData.canonical_url || '',
          og_title: articleData.og_title || '',
          og_description: articleData.og_description || '',
          og_image_url: articleData.og_image_url || '',
          twitter_title: articleData.twitter_title || '',
          twitter_description: articleData.twitter_description || '',
          twitter_image_url: articleData.twitter_image_url || '',
        };
        
        console.log('Setting form data with content length:', formDataToSet.content?.length || 0);
        console.log('Form data content preview:', formDataToSet.content?.substring(0, 200) + '...');
        console.log('Full form data being set:', formDataToSet);
        setFormData(formDataToSet);
      }
    } catch (error) {
      console.error('Error loading article for editing:', error);
      toast({
        title: 'Error',
        description: 'Failed to load article for editing',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await execute('/api/news/categories');
      if (result.success && result.data) {
        setCategories(result.data.categories || []);
        // Set default category if none selected
        if (!formData.category_id && result.data.categories.length > 0) {
          setFormData(prev => ({
            ...prev,
            category_id: result.data.categories[0].id
          }));
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load categories',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (status: 'draft' | 'published' = 'draft') => {
    try {
      setSaving(true);
      
      // Filter out empty strings for URL fields to avoid validation errors
      const dataToSave = {
        ...formData,
        status,
        // Convert empty strings to undefined for URL fields
        canonical_url: formData.canonical_url?.trim() || undefined,
        external_url: formData.external_url?.trim() || undefined,
        og_image_url: formData.og_image_url?.trim() || undefined,
        twitter_image_url: formData.twitter_image_url?.trim() || undefined,
        author_email: formData.author_email?.trim() || undefined,
        author_twitter: formData.author_twitter?.trim() || undefined,
        author_linkedin: formData.author_linkedin?.trim() || undefined,
        author_bio: formData.author_bio?.trim() || undefined,
        author_avatar_url: formData.author_avatar_url?.trim() || undefined,
        featured_image_url: formData.featured_image_url?.trim() || undefined,
        featured_image_alt: formData.featured_image_alt?.trim() || undefined,
        meta_title: formData.meta_title?.trim() || undefined,
        meta_description: formData.meta_description?.trim() || undefined,
        og_title: formData.og_title?.trim() || undefined,
        og_description: formData.og_description?.trim() || undefined,
        twitter_title: formData.twitter_title?.trim() || undefined,
        twitter_description: formData.twitter_description?.trim() || undefined,
        editor_notes: formData.editor_notes?.trim() || undefined,
        subcategory: formData.subcategory?.trim() || undefined,
        external_source: formData.external_source?.trim() || undefined,
      };

      console.log('=== SAVE DEBUG ===');
      console.log('Status:', status);
      console.log('Article state:', article);
      console.log('Article ID:', article?.id);
      console.log('Will update existing article:', !!(article && article.id));
      console.log('Form data content length:', formData.content?.length || 0);
      console.log('Form data content preview:', formData.content?.substring(0, 100) + '...');
      console.log('Data to save content length:', dataToSave.content?.length || 0);
      console.log('Data to save content preview:', dataToSave.content?.substring(0, 100) + '...');
      console.log('Full data to save:', dataToSave);

      let result;
      if (article && article.id) {
        // Update existing article
        console.log('Updating existing article with ID:', article.id);
        result = await execute(`/api/news/${article.id}`, {
          method: 'PUT',
          body: JSON.stringify(dataToSave),
        });
      } else {
        // Create new article
        console.log('Creating new article');
        result = await execute('/api/news', {
          method: 'POST',
          body: JSON.stringify(dataToSave),
        });
      }

      if (result.success && result.data) {
        console.log('=== SAVE SUCCESS ===');
        console.log('Returned article content length:', result.data.article?.content?.length || 0);
        console.log('Returned article content preview:', result.data.article?.content?.substring(0, 100) + '...');
        console.log('Returned article status:', result.data.article?.status);
        console.log('Full returned article:', result.data.article);
        
        setArticle(result.data.article);
        toast({
          title: 'Success',
          description: `Article ${status === 'draft' ? 'saved as draft' : 'published'} successfully${status === 'published' ? ' - redirecting to article...' : ''}`,
        });
        
        if (status === 'published') {
          console.log('Publishing successful, redirecting to article:', result.data.article);
          console.log('Article slug:', result.data.article.slug);
          console.log('Article ID:', result.data.article.id);
          
          if (result.data.article.slug) {
            console.log('Redirecting to:', `/news/${result.data.article.slug}`);
            setRedirecting(true);
            // Add a small delay to ensure the article is fully saved
            setTimeout(() => {
              router.replace(`/news/${result.data.article.slug}`);
            }, 1000);
          } else {
            console.error('No slug found in article data:', result.data.article);
            toast({
              title: 'Warning',
              description: 'Article published but no slug found. Redirecting to news page.',
              variant: 'destructive',
            });
            setRedirecting(true);
            setTimeout(() => {
              router.replace('/news');
            }, 1000);
          }
        }
      } else {
        throw new Error(result.error || 'Failed to save article');
      }
    } catch (error) {
      console.error('Error saving article:', error);
      
      // Check for specific error types and show appropriate messages
      let errorMessage = 'Failed to save article';
      if (error instanceof Error) {
        if (error.message.includes('duplicate') || error.message.includes('unique') || error.message.includes('already exists')) {
          errorMessage = 'An article with this title already exists. Please choose a different title or add a number (e.g., "My Article 2").';
        } else if (error.message.includes('permission') || error.message.includes('Insufficient permissions')) {
          errorMessage = 'You do not have permission to create articles. Please contact an administrator.';
        } else if (error.message.includes('validation') || error.message.includes('required')) {
          errorMessage = 'Please fill in all required fields (title, content, etc.).';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    await handleSave('published');
  };

  const handleFormChange = (updates: Partial<NewsArticleFormData>) => {
    setFormData(prev => {
      const newData = { ...prev, ...updates };
      
      // Debug content changes
      if (updates.content !== undefined) {
        console.log('Content updated:', { 
          oldContent: prev.content, 
          newContent: updates.content,
          contentLength: updates.content.length 
        });
      }
      
      // Auto-generate slug when title changes
      if (updates.title && !updates.slug) {
        const slug = updates.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
        newData.slug = slug;
      }
      
      return newData;
    });
  };

  const handlePreview = () => {
    setPreviewMode(!previewMode);
  };

  // Check authentication and role-based access
  useEffect(() => {
    if (user && (user.role !== 'Author' && user.role !== 'Admin' && user.role !== 'AUTHOR' && user.role !== 'ADMIN')) {
      router.push('/');
      return;
    }
  }, [user, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user || (user.role !== 'Author' && user.role !== 'Admin' && user.role !== 'AUTHOR' && user.role !== 'ADMIN')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You need Author or Admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Editor Header */}
      <NewsEditorHeader
        article={article}
        onSave={() => handleSave('draft')}
        onPublish={handlePublish}
        onPreview={handlePreview}
        saving={saving}
        publishing={publishing || redirecting}
        previewMode={previewMode}
      />

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Editor */}
          <div className="flex-1">
            {previewMode ? (
              <NewsEditorPreview
                article={article}
                formData={formData}
                categories={categories}
              />
            ) : (
              <NewsEditorForm
                formData={formData}
                categories={categories}
                onChange={handleFormChange}
              />
            )}
          </div>

          {/* Editor Sidebar */}
          <div className="lg:w-80">
            <NewsEditorSidebar
              formData={formData}
              categories={categories}
              onChange={handleFormChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

