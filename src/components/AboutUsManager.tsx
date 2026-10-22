import React, { useState, useEffect, useRef } from 'react';
import { EcomSettings, AboutPageSettings } from '../types';
import { dbService } from '../lib/dbService';
import { DEFAULT_ABOUT_SETTINGS } from '../lib/constants';
import { compressImage } from '../lib/imageUtils';
import { uploadDataUrlToStorage } from '../lib/storageService';
import { FeedbackDialog } from './ui/FeedbackDialog';
import { 
  Save, Upload, FileText, X, Bold, Italic, Heading2, List, ListOrdered, Quote, Eye, Edit3, Minus
} from 'lucide-react';

export default function AboutUsManager() {
  const [settings, setSettings] = useState<AboutPageSettings>(DEFAULT_ABOUT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        setIsLoading(true);
        const ecom: EcomSettings = await dbService.getEcomSettings();
        if (ecom?.aboutSettings) {
          const loaded = ecom.aboutSettings;
          const merged: AboutPageSettings = {
            ...DEFAULT_ABOUT_SETTINGS,
            ...loaded,
            title: loaded.title || loaded.heroTitle || 'About Us',
            subtitle: loaded.subtitle || loaded.heroSubtitle || '',
            content: loaded.content || [
              loaded.storyParagraph1,
              loaded.storyParagraph2,
              loaded.storyParagraph3
            ].filter(Boolean).join('\n\n') || DEFAULT_ABOUT_SETTINGS.content,
            image: loaded.image || loaded.heroImage || DEFAULT_ABOUT_SETTINGS.image
          };
          setSettings(merged);
        } else {
          setSettings(DEFAULT_ABOUT_SETTINGS);
        }
      } catch (err) {
        console.error('Failed to load about settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Text formatting insertion helper
  const insertFormatting = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = settings.content || '';
    const selectedText = text.substring(start, end) || defaultText;

    const replacement = `${prefix}${selectedText}${suffix}`;
    const newContent = text.substring(0, start) + replacement + text.substring(end);

    setSettings(prev => ({ ...prev, content: newContent }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  };

  // Image Upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const compressed = await compressImage(file, 1400, 0.85);
      const downloadUrl = await uploadDataUrlToStorage(compressed, `about_banner_${Date.now()}`);
      setSettings(prev => ({ ...prev, image: downloadUrl, heroImage: downloadUrl }));
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Image uploaded',
        message: 'Cover image uploaded successfully.'
      });
    } catch (uploadErr) {
      console.error('Image upload failed:', uploadErr);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Upload failed',
        message: 'Failed to upload image. Please try again with a valid image.'
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Save handler
  const handleSave = async () => {
    try {
      setIsSaving(true);
      const currentEcom = await dbService.getEcomSettings();

      const updatedAboutSettings: AboutPageSettings = {
        ...currentEcom.aboutSettings,
        title: settings.title || currentEcom.aboutSettings?.title || 'About Us',
        subtitle: '',
        content: settings.content || '',
        image: settings.image || '',
        heroTitle: settings.title || currentEcom.aboutSettings?.title || 'About Us',
        heroSubtitle: '',
        heroImage: settings.image || '',
        storyParagraph1: settings.content || ''
      };

      await dbService.saveEcomSettings({
        ...currentEcom,
        aboutSettings: updatedAboutSettings
      });

      window.dispatchEvent(new CustomEvent('ecom-settings-updated'));

      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Saved Successfully',
        message: 'About us page details and image have been saved.'
      });
    } catch (err: any) {
      console.error('Save failed:', err);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Save failed',
        message: 'There was a problem saving content. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium">Loading About Us information...</p>
      </div>
    );
  }

  const wordCount = (settings.content || '').trim() ? (settings.content || '').trim().split(/\s+/).length : 0;
  const charCount = (settings.content || '').length;

  return (
    <div className="w-full space-y-6 pb-20 font-sans">
      
      {/* Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-teal-50 text-teal-700 rounded-xl">
            <FileText className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">About Us</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Enter your store details and optional cover image.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 rounded-xl shadow-sm transition-all cursor-pointer"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        
        {/* Details Rich Text Editor */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="block text-sm font-bold text-slate-800">
              Details Content <span className="text-rose-500">*</span>
            </label>

            {/* Editor Mode Tabs */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setEditorTab('write')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                  editorTab === 'write' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Write</span>
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                  editorTab === 'preview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
            </div>
          </div>

          {/* Formatting Toolbar (Only visible in Write mode) */}
          {editorTab === 'write' && (
            <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border border-slate-200 rounded-t-xl border-b-0 text-slate-700">
              <button
                type="button"
                onClick={() => insertFormatting('**', '**', 'bold text')}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1"
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('*', '*', 'italic text')}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-xs text-slate-700 cursor-pointer flex items-center gap-1"
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
              <div className="h-4 w-px bg-slate-300 mx-1" />
              <button
                type="button"
                onClick={() => insertFormatting('### ', '', 'Heading')}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1"
                title="Heading"
              >
                <Heading2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('• ', '', 'List item')}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-xs text-slate-700 cursor-pointer flex items-center gap-1"
                title="Bullet List"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('1. ', '', 'Numbered item')}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-xs text-slate-700 cursor-pointer flex items-center gap-1"
                title="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('> ', '', 'Quote text')}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-xs text-slate-700 cursor-pointer flex items-center gap-1"
                title="Quote"
              >
                <Quote className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('\n---\n', '')}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-xs text-slate-700 cursor-pointer flex items-center gap-1"
                title="Divider"
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="ml-auto text-xs text-slate-400 font-medium">
                {wordCount} words · {charCount} characters
              </div>
            </div>
          )}

          {/* Editor Input / Live Preview */}
          {editorTab === 'write' ? (
            <textarea
              ref={textareaRef}
              rows={14}
              value={settings.content || ''}
              onChange={(e) => setSettings({ ...settings, content: e.target.value })}
              placeholder="Enter details about your company, brand story, quality commitment, and contact details..."
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-b-xl text-base text-slate-800 leading-relaxed focus:outline-none focus:border-teal-600 focus:bg-white transition-all font-sans resize-y"
            />
          ) : (
            <div className="w-full min-h-[300px] p-6 bg-slate-50/70 border border-slate-200 rounded-xl">
              {settings.content ? (
                <div className="prose prose-slate max-w-none text-slate-800 whitespace-pre-line leading-relaxed text-base">
                  {settings.content}
                </div>
              ) : (
                <p className="text-slate-400 italic text-sm">No content entered yet. Switch to Write tab to add details.</p>
              )}
            </div>
          )}
        </div>

        {/* Optional Cover / Banner Image */}
        <div className="space-y-3 pt-6 border-t border-slate-200">
          <div>
            <label className="block text-sm font-bold text-slate-800">
              Banner / Cover Image (Optional)
            </label>
            <p className="text-xs text-slate-500 mt-0.5">
              Header cover image shown on the storefront About Us page.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors shrink-0 border border-slate-200">
              <Upload className="w-4 h-4" />
              <span>{uploadingImage ? 'Uploading...' : settings.image ? 'Change Image' : 'Upload Image'}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="hidden"
              />
            </label>

            {settings.image && (
              <button
                type="button"
                onClick={() => {
                  setSettings(prev => ({ ...prev, image: '', heroImage: '' }));
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                title="Remove image"
              >
                <X className="w-4 h-4" />
                <span>Remove Image</span>
              </button>
            )}
          </div>

          {settings.image && (
            <div className="mt-3 relative inline-block rounded-xl overflow-hidden border border-slate-200 max-h-56 max-w-md shadow-xs bg-slate-100">
              <img src={settings.image} alt="Banner Preview" className="h-44 w-full object-cover rounded-lg" />
            </div>
          )}
        </div>

      </div>

      {/* Feedback modal */}
      <FeedbackDialog
        isOpen={feedback.isOpen}
        onClose={() => setFeedback(prev => ({ ...prev, isOpen: false }))}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
      />
    </div>
  );
}
