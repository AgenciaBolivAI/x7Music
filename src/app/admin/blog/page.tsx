'use client';

import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Image, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import {
  getPosts,
  createPost,
  updatePost,
  deletePost,
  type BlogPost,
} from '@/api/blogApi';
import { useLanguage } from '@/context/LanguageContext';

const EMPTY_FORM = {
  title: '', slug: '', excerpt: '', author: 'Steven Pantojas',
  tags: '', category: '', isPublished: false,
};
type FormState = typeof EMPTY_FORM;

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 80);

// Simple toolbar button
const Btn = ({
  onClick, active, children,
}: { onClick: () => void; active?: boolean; children: React.ReactNode }) => (
  <button
    type="button"
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    className={`px-2 py-1 text-sm rounded transition-colors ${active ? 'bg-brand-red text-white' : 'text-brand-gray-muted hover:text-white hover:bg-white/10'}`}
  >
    {children}
  </button>
);

export default function AdminBlogPage() {
  const { t } = useLanguage();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false, // required for Next.js SSR (avoids hydration mismatch)
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'min-h-[250px] p-4 focus:outline-none text-white prose prose-invert max-w-none',
      },
    },
  });

  const load = () => {
    setLoading(true);
    getPosts(true)
      .then((res) => setPosts(res.data.posts))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setCoverFile(null);
    setCoverPreview(null);
    editor?.commands.setContent('');
    setShowForm(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditing(post);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? '',
      author: post.author,
      tags: post.tags?.join(', ') ?? '',
      category: post.category ?? '',
      isPublished: post.isPublished,
    });
    setCoverFile(null);
    setCoverPreview(null);
    editor?.commands.setContent(post.content ?? '');
    setShowForm(true);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('slug', form.slug || slugify(form.title));
      fd.append('excerpt', form.excerpt);
      fd.append('author', form.author);
      fd.append('tags', form.tags);
      fd.append('category', form.category);
      fd.append('isPublished', String(form.isPublished));
      fd.append('content', editor?.getHTML() ?? '');
      if (coverFile) fd.append('coverImage', coverFile);

      if (editing) {
        const res = await updatePost(editing._id, fd);
        setPosts((prev) => prev.map((p) => (p._id === editing._id ? res.data.post : p)));
      } else {
        const res = await createPost(fd);
        setPosts((prev) => [res.data.post, ...prev]);
      }
      setShowForm(false);
    } catch {
      alert('Failed to save post.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    await deletePost(id).catch(() => {});
    setPosts((prev) => prev.filter((p) => p._id !== id));
  };

  const set = (k: keyof FormState, v: string | boolean) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  if (showForm) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button
          className="flex items-center gap-2 text-brand-gray-muted hover:text-white mb-6 text-sm"
          onClick={() => setShowForm(false)}
        >
          <ArrowLeft size={16} /> {t('admin.blog.backToPosts')}
        </button>
        <h1 className="text-2xl font-heading font-bold text-white mb-6">
          {editing ? t('admin.blog.editPost') : t('admin.blog.newPost')}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Title *</label>
              <input className="input w-full" required value={form.title}
                onChange={(e) => {
                  set('title', e.target.value);
                  if (!editing) set('slug', slugify(e.target.value));
                }} />
            </div>
            <div>
              <label className="label">Slug</label>
              <input className="input w-full" value={form.slug}
                onChange={(e) => set('slug', e.target.value)} />
            </div>
            <div>
              <label className="label">Author</label>
              <input className="input w-full" value={form.author}
                onChange={(e) => set('author', e.target.value)} />
            </div>
            <div>
              <label className="label">Category</label>
              <input className="input w-full" placeholder="e.g. News, Interview" value={form.category}
                onChange={(e) => set('category', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Excerpt</label>
            <textarea className="input w-full resize-none" rows={2} value={form.excerpt}
              onChange={(e) => set('excerpt', e.target.value)} />
          </div>

          <div>
            <label className="label">Tags (comma separated)</label>
            <input className="input w-full" placeholder="music, gospel, publishing" value={form.tags}
              onChange={(e) => set('tags', e.target.value)} />
          </div>

          {/* Cover image */}
          <div>
            <label className="label">{t('admin.blog.coverImage')}</label>
            <div
              className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center cursor-pointer hover:border-brand-red/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {coverPreview || editing?.coverImageUrl ? (
                <img
                  src={coverPreview ?? editing?.coverImageUrl}
                  alt="Cover"
                  className="max-h-48 object-cover rounded-lg mx-auto"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-brand-gray-muted">
                  <Image size={32} />
                  <p className="text-sm">{t('admin.blog.clickToUpload')}</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>

          {/* TipTap Editor */}
          <div>
            <label className="label">Content *</label>
            <div className="border border-white/20 rounded-lg overflow-hidden bg-brand-gray">
              {/* Toolbar */}
              <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-white/10 bg-brand-gray-light">
                <Btn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')}>
                  <strong>B</strong>
                </Btn>
                <Btn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')}>
                  <em>I</em>
                </Btn>
                <span className="w-px h-6 bg-white/20 mx-1 self-center" />
                <Btn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })}>
                  H2
                </Btn>
                <Btn onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive('heading', { level: 3 })}>
                  H3
                </Btn>
                <span className="w-px h-6 bg-white/20 mx-1 self-center" />
                <Btn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')}>
                  UL
                </Btn>
                <Btn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')}>
                  OL
                </Btn>
                <Btn onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')}>
                  &ldquo;&rdquo;
                </Btn>
                <span className="w-px h-6 bg-white/20 mx-1 self-center" />
                <Btn onClick={() => editor?.chain().focus().undo().run()}>↩</Btn>
                <Btn onClick={() => editor?.chain().focus().redo().run()}>↪</Btn>
              </div>
              <EditorContent editor={editor} />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="accent-brand-red w-4 h-4"
              checked={form.isPublished}
              onChange={(e) => set('isPublished', e.target.checked)} />
            <span className="text-white text-sm flex items-center gap-1.5"><Eye size={14} /> {t('admin.blog.publish')}</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? t('admin.blog.saveChanges') : t('admin.blog.createPost')}
            </button>
            <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>
              {t('admin.blog.cancel')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-heading font-bold text-white">{t('admin.blog.title')}</h1>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <Plus size={18} /> {t('admin.blog.addPost')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="card p-12 text-center text-brand-gray-muted">{t('admin.blog.noPosts')}</div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post._id} className="card p-5 flex gap-4">
              {post.coverImageUrl ? (
                <img src={post.coverImageUrl} alt={post.title}
                  className="w-20 h-20 object-cover rounded-lg shrink-0" />
              ) : (
                <div className="w-20 h-20 bg-brand-gray-light rounded-lg flex items-center justify-center shrink-0">
                  <Image size={20} className="text-brand-gray-muted" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-white font-semibold">{post.title}</p>
                    <p className="text-brand-gray-muted text-sm">{post.author}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {post.isPublished
                      ? <Eye size={14} className="text-green-400" />
                      : <EyeOff size={14} className="text-brand-gray-muted" />}
                    <span className="text-xs text-brand-gray-muted ml-1">
                      {post.isPublished ? t('admin.blog.published') : t('admin.blog.draft')}
                    </span>
                  </div>
                </div>
                {post.excerpt && (
                  <p className="text-brand-gray-muted text-sm mt-1 line-clamp-1">{post.excerpt}</p>
                )}
                <p className="text-brand-gray-muted text-xs mt-1">
                  {new Date(post.createdAt).toLocaleDateString()}
                </p>
                <div className="flex gap-2 mt-3">
                  <button className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1" onClick={() => openEdit(post)}>
                    <Pencil size={12} /> {t('common.edit')}
                  </button>
                  <button className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 px-3 py-1.5" onClick={() => handleDelete(post._id)}>
                    <Trash2 size={12} /> {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
