import { supabase } from "../lib/supabase";
import React, { useState, useEffect } from 'react';
import { fetchDiscoveryConfig, adminUpdateDiscoveryConfig } from '../lib/api';
import { Plus, Trash2, Save, X, Edit2, Compass, PenTool } from 'lucide-react';
import { DiscoveryAuthorCard, DiscoveryCategoryCard } from '../data/discoveryData';

interface AdminDiscoveryTabProps {
  token: string;
  onShowToast: (msg: string, isError?: boolean) => void;
}

export const AdminDiscoveryTab: React.FC<AdminDiscoveryTabProps> = ({ token, onShowToast }) => {
  const [data, setData] = useState<{ authors: any[]; categories: any[] }>({ authors: [], categories: [] });
  const [loading, setLoading] = useState(true);
  
  // Modals / forms state
  const [editingAuthor, setEditingAuthor] = useState<any | null>(null);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const config = await fetchDiscoveryConfig();
      setData({ authors: config.authors || [], categories: config.categories || [] });
    } catch (err: any) {
      onShowToast(err.message || 'Failed to load discovery config', true);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (newAuthors: any[], newCategories: any[]) => {
    try {
      await adminUpdateDiscoveryConfig(token, { authors: newAuthors, categories: newCategories });
      setData({ authors: newAuthors, categories: newCategories });
      onShowToast('Discovery settings saved successfully.');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to save config', true);
    }
  };

  const handleSaveAuthor = (author: any) => {
    let newAuthors = [...data.authors];
    if (editingAuthor && editingAuthor.id === author.id) {
      // Edit
      newAuthors = newAuthors.map(a => a.id === author.id ? author : a);
    } else {
      // Add
      if (newAuthors.find(a => a.id === author.id)) {
        onShowToast('ID already exists', true);
        return;
      }
      newAuthors.push(author);
    }
    setEditingAuthor(null);
    saveConfig(newAuthors, data.categories);
  };

  const handleDeleteAuthor = (id: string) => {
    if (confirm('Are you sure you want to remove this author?')) {
      const newAuthors = data.authors.filter(a => a.id !== id);
      saveConfig(newAuthors, data.categories);
    }
  };

  const handleSaveCategory = (cat: any) => {
    let newCategories = [...data.categories];
    if (editingCategory && editingCategory.id === cat.id) {
      // Edit
      newCategories = newCategories.map(c => c.id === cat.id ? cat : c);
    } else {
      // Add
      if (newCategories.find(c => c.id === cat.id)) {
        onShowToast('ID already exists', true);
        return;
      }
      newCategories.push(cat);
    }
    setEditingCategory(null);
    saveConfig(data.authors, newCategories);
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm('Are you sure you want to remove this category?')) {
      const newCategories = data.categories.filter(c => c.id !== id);
      saveConfig(data.authors, newCategories);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-[#14213d]/50">Loading discovery settings...</div>;
  }

  return (
    <div className="space-y-12">
      {/* AUTHORS */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#14213d] flex items-center gap-2">
            <PenTool className="w-5 h-5" /> Authors
          </h2>
          <button 
            onClick={() => setEditingAuthor({ id: '', name: '', avatarUrl: '', tagline: '', signatureQuestion: '', description: '', filterKey: '', accentColor: '', darkAccentColor: '' })}
            className="px-4 py-2 bg-[#fca311] text-white text-sm font-semibold rounded-lg hover:bg-[#e5940e] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Author
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.authors.map(author => (
            <div key={author.id} className="bg-white p-4 rounded-2xl border border-[#e5e5e5] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <img src={author.avatarUrl} alt={author.name} className="w-10 h-10 rounded-full object-cover bg-gray-100" />
                  <div>
                    <h3 className="font-semibold text-[#14213d]">{author.name}</h3>
                    <p className="text-xs text-[#14213d]/60">{author.filterKey}</p>
                  </div>
                </div>
                <p className="text-sm italic text-[#14213d]/80 mb-2">"{author.signatureQuestion}"</p>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setEditingAuthor(author)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeleteAuthor(author.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#14213d] flex items-center gap-2">
            <Compass className="w-5 h-5" /> Categories
          </h2>
          <button 
            onClick={() => setEditingCategory({ id: '', label: '', emoji: '', tagline: '', description: '', filterKey: '', accentColor: '', darkAccentColor: '' })}
            className="px-4 py-2 bg-[#fca311] text-white text-sm font-semibold rounded-lg hover:bg-[#e5940e] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.categories.map(cat => (
            <div key={cat.id} className="bg-white p-4 rounded-2xl border border-[#e5e5e5] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{cat.emoji}</span>
                  <h3 className="font-semibold text-[#14213d]">{cat.label}</h3>
                </div>
                <p className="text-sm text-[#14213d]/80">{cat.description}</p>
                <p className="text-xs text-blue-600 font-medium mt-1">Filter: {cat.filterKey}</p>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setEditingCategory(cat)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Author Edit Modal */}
      {editingAuthor && (
        <AuthorEditor 
          author={editingAuthor} 
          onSave={handleSaveAuthor} 
          onCancel={() => setEditingAuthor(null)} 
        />
      )}

      {/* Category Edit Modal */}
      {editingCategory && (
        <CategoryEditor 
          category={editingCategory} 
          onSave={handleSaveCategory} 
          onCancel={() => setEditingCategory(null)} 
        />
      )}
    </div>
  );
};

const AuthorEditor = ({ author, onSave, onCancel }: any) => {
  const [form, setForm] = useState({ ...author });
  const [uploading, setUploading] = useState(false);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      setForm({ ...form, avatarUrl: data.publicUrl });
    } catch (error: any) {
      alert('Error uploading image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">{author.id ? 'Edit Author' : 'Add Author'}</h3>
        <div className="space-y-4">
          {!author.id && (
             <div>
              <label className="block text-xs font-semibold mb-1">ID (unique)</label>
              <input name="id" value={form.id} onChange={handleChange} className="w-full border rounded-lg p-2" />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold mb-1">Name</label>
            <input name="name" value={form.name} onChange={handleChange} className="w-full border rounded-lg p-2" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Avatar Image</label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                {form.avatarUrl && (
                  <img src={form.avatarUrl} alt="Avatar Preview" className="w-10 h-10 rounded-full object-cover border border-[#e5e5e5]" />
                )}
                <label className="cursor-pointer bg-[#fca311] hover:bg-[#e5940e] text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                  {uploading ? 'Uploading...' : 'Upload Image'}
                  <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} className="hidden" />
                </label>
              </div>
              <input name="avatarUrl" value={form.avatarUrl} onChange={handleChange} placeholder="Or paste image URL" className="w-full border rounded-lg p-2" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Filter Key</label>
            <input name="filterKey" value={form.filterKey} onChange={handleChange} className="w-full border rounded-lg p-2" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Tagline</label>
            <input name="tagline" value={form.tagline} onChange={handleChange} className="w-full border rounded-lg p-2" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Signature Question</label>
            <textarea name="signatureQuestion" value={form.signatureQuestion} onChange={handleChange} className="w-full border rounded-lg p-2" rows={2} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} className="w-full border rounded-lg p-2" rows={3} />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-1">Accent Color</label>
              <input type="color" name="accentColor" value={form.accentColor || '#ffffff'} onChange={handleChange} className="w-full h-10 border rounded-lg" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-1">Dark Accent Color</label>
              <input type="color" name="darkAccentColor" value={form.darkAccentColor || '#000000'} onChange={handleChange} className="w-full h-10 border rounded-lg" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel} className="px-4 py-2 text-[#14213d]/60 font-semibold">Cancel</button>
          <button onClick={() => onSave(form)} className="px-4 py-2 bg-[#fca311] text-white font-semibold rounded-lg">Save</button>
        </div>
      </div>
    </div>
  );
};

const CategoryEditor = ({ category, onSave, onCancel }: any) => {
  const [form, setForm] = useState({ ...category });

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">{category.id ? 'Edit Category' : 'Add Category'}</h3>
        <div className="space-y-4">
          {!category.id && (
             <div>
              <label className="block text-xs font-semibold mb-1">ID (unique)</label>
              <input name="id" value={form.id} onChange={handleChange} className="w-full border rounded-lg p-2" />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold mb-1">Label</label>
            <input name="label" value={form.label} onChange={handleChange} className="w-full border rounded-lg p-2" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Emoji</label>
            <input name="emoji" value={form.emoji} onChange={handleChange} className="w-full border rounded-lg p-2" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Filter Key</label>
            <input name="filterKey" value={form.filterKey} onChange={handleChange} className="w-full border rounded-lg p-2" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Tagline</label>
            <input name="tagline" value={form.tagline} onChange={handleChange} className="w-full border rounded-lg p-2" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} className="w-full border rounded-lg p-2" rows={3} />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-1">Accent Color</label>
              <input type="color" name="accentColor" value={form.accentColor || '#ffffff'} onChange={handleChange} className="w-full h-10 border rounded-lg" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-1">Dark Accent Color</label>
              <input type="color" name="darkAccentColor" value={form.darkAccentColor || '#000000'} onChange={handleChange} className="w-full h-10 border rounded-lg" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel} className="px-4 py-2 text-[#14213d]/60 font-semibold">Cancel</button>
          <button onClick={() => onSave(form)} className="px-4 py-2 bg-[#fca311] text-white font-semibold rounded-lg">Save</button>
        </div>
      </div>
    </div>
  );
};
