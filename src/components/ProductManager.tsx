import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, CategoryItem, Brand } from '../types';
import { dbService } from '../lib/dbService';
import { uploadDataUrlToStorage, uploadFileToStorage } from '../lib/storageService';
import { 
  Plus, Search, Edit2, Trash2, Package, Check, X, Tag, Upload, 
  Link as LinkIcon, Loader2, Copy, Eye, Zap, ShieldCheck, 
  QrCode, Barcode, HelpCircle, Sparkles, ArrowRight, BookOpen, FileText, Layers,
  List, LayoutGrid, Image as ImageIcon, Settings, Sliders, MoreVertical, ExternalLink, Bookmark
} from 'lucide-react';
import { compressImage } from '../lib/imageUtils';
import { getProductSlug, slugifyProductText } from '../lib/seoUtils';
import { FeedbackDialog } from './ui/FeedbackDialog';

type DetailTab = 'title-summary' | 'price' | 'category' | 'image' | 'publishing';

interface ProductManagerProps {
  products: Product[];
  onAddProduct: (product: Product) => Promise<void>;
  onUpdateProduct: (product: Product) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
}

export default function ProductManager({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct
}: ProductManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('title-summary');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  // Store Categories from Category Manager
  const [storeCategories, setStoreCategories] = useState<CategoryItem[]>([]);

  // Product Identity State
  const [productType, setProductType] = useState('Physical product');
  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  // Book-specific fields
  const [primaryAuthor, setPrimaryAuthor] = useState('');
  const [printType, setPrintType] = useState('');
  const [isbn, setIsbn] = useState('');
  const [colorGrade, setColorGrade] = useState('');
  const [edition, setEdition] = useState('');
  const [pages, setPages] = useState<number | ''>('');
  const [samplePdfUrlState, setSamplePdfUrlState] = useState('');
  const [samplePages, setSamplePages] = useState<string[]>([]);
  const [isUploadingSamplePdf, setIsUploadingSamplePdf] = useState(false);
  const [isUploadingSampleImages, setIsUploadingSampleImages] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [translation, setTranslation] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [shortSummary, setShortSummary] = useState('');
  const [description, setDescription] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [storeBrands, setStoreBrands] = useState<Brand[]>([]);
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('all');
  const [slug, setSlug] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywordsText, setSeoKeywordsText] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [settings, brandsData] = await Promise.all([
          dbService.getEcomSettings(),
          dbService.getBrands()
        ]);
        let loadedCats: CategoryItem[] = [];
        if (settings.categoryItems && settings.categoryItems.length > 0) {
          loadedCats = settings.categoryItems;
        } else if (settings.categories && settings.categories.length > 0) {
          loadedCats = settings.categories.map((c, idx) => ({
            id: `cat-${idx}`,
            name: c,
            subcategories: []
          }));
        }
        setStoreCategories(loadedCats);
        setStoreBrands(brandsData || []);
        if (loadedCats.length > 0 && (!category || !loadedCats.some(c => c.name.trim().toLowerCase() === category.trim().toLowerCase()))) {
          setCategory(loadedCats[0].name);
        }
      } catch (err) {
        console.error('Failed to load store categories and brands:', err);
      }
    }
    loadData();
    window.addEventListener('ecom-settings-updated', loadData);
    window.addEventListener('brands-updated', loadData);
    return () => {
      window.removeEventListener('ecom-settings-updated', loadData);
      window.removeEventListener('brands-updated', loadData);
    };
  }, []);

  // Media State
  const [image, setImage] = useState('');
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pricing State
  const [costPrice, setCostPrice] = useState<number | ''>(0);
  const [price, setPrice] = useState<number | ''>(0); // Sale / Retail Price
  const [regularPrice, setRegularPrice] = useState<number | ''>(0); // List / Regular Price
  const [vatPercent, setVatPercent] = useState<number | ''>(0);
  const [isFlashPrice, setIsFlashPrice] = useState(false);

  // Inventory State
  const [stock, setStock] = useState<number | ''>(100);

  // Publishing Controls State
  const [isAvailable, setIsAvailable] = useState(true); // Active
  const [isPrivate, setIsPrivate] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isCampaign, setIsCampaign] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(false);
  const [isOneTimePurchase, setIsOneTimePurchase] = useState(false);
  const [continueSelling, setContinueSelling] = useState(true);
  const [isUnlisted, setIsUnlisted] = useState(false);
  const [codAvailable, setCodAvailable] = useState(true);

  // Delivery & Advanced
  const [weight, setWeight] = useState<number | ''>(''); // Weight in kg for weight-based shipping
  const [deliveryChargeEnabled, setDeliveryChargeEnabled] = useState(true);
  const [deliveryChargeAmount, setDeliveryChargeAmount] = useState<number | ''>(0);
  const [exclusiveDelivery, setExclusiveDelivery] = useState(true);
  const [trackWithParent, setTrackWithParent] = useState(false);
  const [addQrToImage, setAddQrToImage] = useState(false);
  const [addBarcodeToImage, setAddBarcodeToImage] = useState(false);
  const [giftWrapEnabled, setGiftWrapEnabled] = useState(false);
  const [giftWrapPrice, setGiftWrapPrice] = useState<number | ''>(0);
  const [hasVariants, setHasVariants] = useState<boolean>(false);
  const [variants, setVariants] = useState<import('../types').ProductVariant[]>([]);
  const [uploadingVariantIdx, setUploadingVariantIdx] = useState<number | null>(null);

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const categories = useMemo(() => {
    const adminCatNames = storeCategories.map(c => c.name);
    return ['all', ...adminCatNames];
  }, [storeCategories]);

  const handleOpenModal = (product?: Product) => {
    setUploadError('');
    setIsUploading(false);
    if (product) {
      setEditingProduct(product);
      setProductType(product.productType || 'Physical product');
      setTitle(product.title || '');
      setAuthorName(product.authorName || '');
      setPrimaryAuthor(product.primaryAuthor || '');
      setPrintType(product.printType || '');
      setIsbn(product.isbn || '');
      setColorGrade(product.colorGrade || '');
      setEdition(product.edition || '');
      setPages(product.pageCount ?? '');
      setSamplePdfUrlState(product.samplePdfUrl || '');
      const existingImgs = (Array.isArray(product.samplePages) && product.samplePages.length > 0)
        ? product.samplePages
        : (Array.isArray((product as any).additionalImages) && (product as any).additionalImages.length > 0)
          ? (product as any).additionalImages
          : (Array.isArray((product as any).images) && (product as any).images.length > 0)
            ? (product as any).images
            : [];
      setSamplePages(existingImgs);
      setPdfUrl(product.pdfUrl || '');
      setTranslation(product.translation || '');
      setSku(product.sku || '');
      setBarcode(product.barcode || '');
      setShortSummary(product.shortSummary || '');
      setDescription(product.description || '');
      setSubtitle(product.subtitle || '');
      setCategory(product.category || 'general');
      setSubCategory(product.subCategory || '');
      setBrand(product.brand || '');
      setSlug(product.slug || getProductSlug(product));
      setSeoTitle(product.seoTitle || '');
      setSeoDescription(product.seoDescription || '');
      setSeoKeywordsText((product.seoKeywords || []).join(', '));
      setHasVariants(product.hasVariants ?? false);
      setVariants(product.variants || []);

      setImage(product.image || '');
      setImageMode(product.image && product.image.startsWith('data:') ? 'upload' : 'url');

      setCostPrice(product.costPrice ?? 0);
      setPrice(product.price ?? 0);
      setRegularPrice(product.regularPrice || product.price || 0);
      setVatPercent(product.vatPercent ?? 0);

      setStock(product.stock ?? 100);
      setIsAvailable(product.isAvailable ?? true);
      setIsPrivate(product.isPrivate ?? false);
      setIsFeatured(product.isFeatured ?? false);
      setIsCampaign(product.isCampaign ?? false);
      setIsNewArrival(product.isNewArrival ?? false);
      setIsOneTimePurchase(product.isOneTimePurchase ?? false);
      setContinueSelling(product.continueSelling ?? true);
      setIsUnlisted(product.isUnlisted ?? false);
      setCodAvailable(product.codAvailable ?? true);

      const isFree = product.deliveryChargeEnabled === false || (product as any).freeDelivery === true || (product as any).isFreeDelivery === true;
      setDeliveryChargeEnabled(!isFree);
      setDeliveryChargeAmount(product.deliveryChargeAmount ?? 0);
      setWeight(product.weight ?? '');
      setExclusiveDelivery(product.exclusiveDelivery ?? true);
      setAddQrToImage(product.addQrToImage ?? false);
      setAddBarcodeToImage(product.addBarcodeToImage ?? false);
      setGiftWrapEnabled(product.giftWrapEnabled ?? false);
      setGiftWrapPrice(product.giftWrapPrice ?? 0);
    } else {
      setEditingProduct(null);
      setWeight('');
      setProductType('Physical product');
      setTitle('');
      setAuthorName('');
      setPrimaryAuthor('');
      setPrintType('');
      setIsbn('');
      setColorGrade('');
      setEdition('');
      setPages('');
      setSamplePdfUrlState('');
      setSamplePages([]);
      setHasVariants(false);
      setVariants([]);
      setSamplePages([]);
      setPdfUrl('');
      setTranslation('');
      setSku(`SKU-${Math.floor(Math.random() * 89999 + 10000)}`);
      setBarcode(`BAR-${Math.floor(Math.random() * 899999 + 100000)}`);
      setShortSummary('');
      setDescription('');
      setSubtitle('');
      setCategory(storeCategories[0]?.name || '');
      setSubCategory('');
      setBrand('');
      setSlug('');
      setSeoTitle('');
      setSeoDescription('');
      setSeoKeywordsText('');

      setImage('');
      setImageMode('upload');

      setCostPrice(0);
      setPrice(0);
      setRegularPrice(0);
      setVatPercent(0);

      setStock(100);
      setIsAvailable(true);
      setIsPrivate(false);
      setIsFeatured(false);
      setIsCampaign(false);
      setIsNewArrival(false);
      setIsOneTimePurchase(false);
      setContinueSelling(true);
      setIsUnlisted(false);
      setCodAvailable(true);

      setDeliveryChargeEnabled(true);
      setDeliveryChargeAmount(0);
      setExclusiveDelivery(true);
      setAddQrToImage(false);
      setAddBarcodeToImage(false);
      setGiftWrapEnabled(false);
      setGiftWrapPrice(0);
    }
    setActiveTab('title-summary');
    setIsModalOpen(true);
  };

  // Quick Discount Buttons (-10%, -15%, -20%, -25%, -50%)
  const applyDiscountPercent = (percent: number) => {
    const list = Number(regularPrice) || Number(price) || 0;
    if (list <= 0) return;
    const discounted = Math.round(list * (1 - percent / 100));
    setPrice(discounted);
  };

  // Customer Savings Calculation
  const regVal = Number(regularPrice) || Number(price) || 0;
  const saleVal = Number(price) || 0;
  const savingsAmt = regVal > saleVal ? regVal - saleVal : 0;
  const savingsPercent = regVal > 0 && savingsAmt > 0 ? ((savingsAmt / regVal) * 100).toFixed(1) : '0';

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('JPG, PNG, WEBP');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      const compressedDataUrl = await compressImage(file, 1000, 0.8, 600000);
      if (compressedDataUrl) {
        try {
          const imageUrl = await uploadDataUrlToStorage(
            compressedDataUrl,
            `ecom-products/images/product-${editingProduct?.id || 'new'}-${Date.now()}`
          );
          setImage(imageUrl);
        } catch (storageError) {
          console.warn('Product image storage upload failed; using compressed fallback:', storageError);
          setImage(compressedDataUrl);
        }
      } else {
        setUploadError('There was a problem processing the image. Try another image.');
      }
    } catch (err) {
      console.error('Image compression error:', err);
      setUploadError('Image upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setIsUploading(true);
      setUploadError('');
      try {
        const compressedDataUrl = await compressImage(file, 1000, 0.8, 600000);
        if (compressedDataUrl) {
          try {
            const imageUrl = await uploadDataUrlToStorage(
              compressedDataUrl,
              `ecom-products/images/product-${editingProduct?.id || 'new'}-${Date.now()}`
            );
            setImage(imageUrl);
          } catch (storageError) {
            console.warn('Product image storage upload failed; using compressed fallback:', storageError);
            setImage(compressedDataUrl);
          }
        }
      } catch (err) {
        setUploadError('There was a problem uploading the image.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleVariantImageUpload = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Incorrect file format',
        message: 'JPG, PNG, WEBP'
      });
      return;
    }

    setUploadingVariantIdx(idx);
    try {
      const compressedDataUrl = await compressImage(file, 1000, 0.8, 600000);
      if (compressedDataUrl) {
        let finalUrl = compressedDataUrl;
        try {
          finalUrl = await uploadDataUrlToStorage(
            compressedDataUrl,
            `ecom-products/images/variant-${editingProduct?.id || 'new'}-${idx}-${Date.now()}`
          );
        } catch (storageError) {
          console.warn('Variant image storage upload failed; using compressed fallback:', storageError);
        }
        const newVariants = [...variants];
        newVariants[idx] = { ...newVariants[idx], image: finalUrl };
        setVariants(newVariants);
      }
    } catch (err) {
      console.error('Variant image upload error:', err);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Image upload failed',
        message: 'There was a problem uploading the variant image.'
      });
    } finally {
      setUploadingVariantIdx(null);
      e.target.value = '';
    }
  };

  const handleVariantImageUrlPrompt = (idx: number) => {
    const current = variants[idx]?.image || '';
    const url = window.prompt('Give Variant Image Link / URL:', current);
    if (url !== null) {
      const newVariants = [...variants];
      newVariants[idx] = { ...newVariants[idx], image: url.trim() || undefined };
      setVariants(newVariants);
    }
  };

  const getProductDataObject = (): Product => {
    const validVariants = hasVariants ? variants.filter(v => v.name.trim() !== '') : [];
    let salePriceNum = Number(price) || 0;
    let regPriceNum = regularPrice !== '' ? Number(regularPrice) : salePriceNum;

    // Auto set base price from lowest variant if product price is 0
    if (hasVariants && validVariants.length > 0 && salePriceNum === 0) {
      const lowestVar = validVariants.reduce((prev, curr) => (curr.price < prev.price ? curr : prev), validVariants[0]);
      salePriceNum = lowestVar.price;
      if (lowestVar.regularPrice) {
        regPriceNum = lowestVar.regularPrice;
      }
    }

    const normalizedSlug = slugifyProductText(slug || title);
    const seoKeywords = seoKeywordsText
      .split(',')
      .map(keyword => keyword.trim())
      .filter(Boolean);

    return {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      title: title.trim() || 'untitled goods',
      subtitle: subtitle.trim(),
      authorName: authorName.trim(),
      pdfUrl: pdfUrl.trim(),
      isFlashSale: isFlashPrice,
      sku: sku.trim(),
      barcode: barcode.trim(),
      translation: translation.trim(),
      productType,
      shortSummary: shortSummary.trim(),
      // Clear the retired legacy field so unrelated static book features can
      // never reappear after this product is saved.
      features: [],
      slug: normalizedSlug,
      seoTitle: seoTitle.trim(),
      seoDescription: seoDescription.trim(),
      seoKeywords,
      price: salePriceNum,
      regularPrice: regPriceNum,
      costPrice: Number(costPrice) || 0,
      vatPercent: Number(vatPercent) || 0,
      image: image.trim() || 'https://images.unsplash.com/photo-1608248597359-0098f98a329d?w=800&auto=format&fit=crop&q=85',
      category: category.trim() || 'general',
      subCategory: subCategory.trim(),
      brand: brand.trim() || undefined,
      stock: stock !== '' ? Number(stock) : 0,
      isAvailable,
      isPrivate,
      isFeatured,
      isCampaign,
      isNewArrival,
      isOneTimePurchase,
      continueSelling,
      isUnlisted,
      codAvailable,
      weight: weight !== '' ? Number(weight) : undefined,
      deliveryChargeEnabled,
      freeDelivery: !deliveryChargeEnabled,
      isFreeDelivery: !deliveryChargeEnabled,
      deliveryChargeAmount: Number(deliveryChargeAmount) || 0,
      exclusiveDelivery,
      addQrToImage,
      addBarcodeToImage,
      giftWrapEnabled,
      giftWrapPrice: Number(giftWrapPrice) || 0,
      description: description.trim(),
      specs: [],
      tableOfContents: [],
      // book metadata
      primaryAuthor: primaryAuthor || undefined,
      printType: printType || undefined,
      isbn: isbn || undefined,
      colorGrade: colorGrade || undefined,
      edition: edition || undefined,
      pageCount: pages === '' ? undefined : Number(pages),
      samplePdfUrl: samplePdfUrlState || undefined,
      samplePages: samplePages.length > 0 ? samplePages : undefined,
      additionalImages: samplePages.length > 0 ? samplePages : undefined,
      images: samplePages.length > 0 ? samplePages : undefined,
      hasVariants,
      variants: hasVariants ? variants : [],
      createdAt: editingProduct?.createdAt || new Date().toISOString()
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const productData = getProductDataObject();

    try {
      if (editingProduct) {
        await onUpdateProduct(productData);
      } else {
        await onAddProduct(productData);
      }
      setIsModalOpen(false);
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Successfully saved!',
        message: 'The product information and configuration has been successfully saved to the database.'
      });
    } catch (e: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'There was an error saving',
        message: e?.message || 'There was a problem saving the product.'
      });
    }
  };

  // Product Duplicate Feature
  const handleDuplicateProduct = async (productToDuplicate?: Product) => {
    const source = productToDuplicate || getProductDataObject();

    const newProduct: Product = {
      ...source,
      id: `prod-${Date.now()}`,
      title: `${source.title} (Duplicate)`,
      slug: `${getProductSlug(source)}-copy-${Date.now().toString().slice(-6)}`,
      features: [],
      sku: source.sku ? `${source.sku}-COPY` : `SKU-${Math.floor(Math.random() * 89999 + 10000)}`,
      createdAt: new Date().toISOString()
    };

    try {
      await onAddProduct(newProduct);
      setIsModalOpen(false);
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Duplicate was successful!',
        message: `"${source.title}" successfulway new product Copied as।`
      });
    } catch (e: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Failed to duplicate',
        message: e?.message || 'An error occurred while duplicating the product.'
      });
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.subtitle && p.subtitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.slug && p.slug.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.seoKeywords && p.seoKeywords.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesBrand = selectedBrandFilter === 'all' || p.brand === selectedBrandFilter;
    return matchesSearch && matchesCat && matchesBrand;
  });

  const normalizedSeoSlug = slugifyProductText(slug || title) || 'product-url';
  const hasDuplicateSlug = products.some(product =>
    product.id !== editingProduct?.id && getProductSlug(product) === normalizedSeoSlug
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-teal-600" />
            product Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            of e-commerce stores product Duplicate, Publishing Control Manage prize setup
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all hover:shadow-md cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          new product add
        </button>
      </div>

      {/* Filters, Search Bar, View Mode Switcher & Filter Dropdowns */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white p-4 rounded-[6px] border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-2 w-full md:w-auto flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-[6px] text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-[6px] border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-[6px] text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-teal-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Vertical list view"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">the list</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-[6px] text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-teal-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">the grid</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-[6px] px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500">
            <Tag className="h-3.5 w-3.5 text-teal-600 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer pr-1"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Filter Select */}
          {storeBrands.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-[6px] px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500">
              <Bookmark className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <select
                value={selectedBrandFilter}
                onChange={(e) => setSelectedBrandFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer pr-1"
              >
                <option value="all">All Brands</option>
                {storeBrands.map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Clear Filters Button (shows when any filter is active) */}
          {(selectedCategory !== 'all' || selectedBrandFilter !== 'all' || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSelectedBrandFilter('all');
                setSearchTerm('');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200 rounded-[6px] transition-colors cursor-pointer"
              title="Reset all filters"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Vertical List View (Default) */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="overflow-x-auto min-h-[320px] pb-20">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Products and titles</th>
                  <th className="py-3 px-4">category</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Stock and status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const hasVar = Boolean(p.hasVariants && p.variants && p.variants.length > 0);
                  const validVariants = hasVar ? p.variants!.filter(v => v.price > 0) : [];
                  const variantPrices = validVariants.map(v => v.price);
                  const minVarPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : p.price;
                  const maxVarPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : p.price;
                  const displayPrice = hasVar && minVarPrice > 0 ? minVarPrice : p.price;
                  const lowestVar = hasVar ? validVariants.find(v => v.price === displayPrice) : null;
                  const displayRegPrice = lowestVar?.regularPrice || p.regularPrice;

                  return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Thumbnail & Product Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-1">
                          <img
                            src={p.image}
                            alt={p.title}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-xs leading-snug line-clamp-1">
                            {p.title}
                          </h4>
                          {p.subtitle && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{p.subtitle}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {p.sku && (
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                SKU: {p.sku}
                              </span>
                            )}
                            {p.authorName && (
                              <span className="text-[10px] text-slate-500">
                                the writer: {p.authorName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category & Brand */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className="inline-block bg-teal-50 text-teal-800 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-teal-200">
                          {p.category}
                        </span>
                        {p.brand && (
                          <div>
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200">
                              <Bookmark className="h-2.5 w-2.5" />
                              {p.brand}
                            </span>
                          </div>
                        )}
                        {p.subCategory && (
                          <div className="text-[10px] text-slate-400">
                            › {p.subCategory}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-sm font-extrabold text-teal-700 flex items-center gap-1">
                        <span>Tk.{displayPrice.toLocaleString('bn-BD')}</span>
                        {hasVar && minVarPrice !== maxVarPrice && (
                          <span className="text-[11px] font-bold text-slate-500">- Tk.{maxVarPrice.toLocaleString('bn-BD')}</span>
                        )}
                      </div>
                      {displayRegPrice && displayRegPrice > displayPrice && (
                        <div className="text-[11px] text-slate-400 line-through">
                          Tk.{displayRegPrice.toLocaleString('bn-BD')}
                        </div>
                      )}
                      {hasVar && (
                        <div className="mt-1">
                          <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                            {p.variants!.length}T variant
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Stock & Badges */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.isAvailable && p.stock > 0
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {p.isAvailable && p.stock > 0 ? `stock: ${p.stock}` : 'out of stock'}
                        </span>
                      </div>
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3 px-4 whitespace-nowrap text-right relative">
                      <div className="flex items-center justify-end relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === p.id ? null : p.id);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Actions"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>
                        
                        {activeMenuId === p.id && (
                          <div className="absolute right-8 top-1/2 -translate-y-1/2 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-left">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenModal(p); setActiveMenuId(null); }}
                              className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-700 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                              Edit (Edit)
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const pSlug = p.slug || getProductSlug(p);
                                window.open(`/${pSlug}`, '_blank');
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-700 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Visit the landing page
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDuplicateProduct(p); setActiveMenuId(null); }}
                              className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <Copy className="h-4 w-4" />
                              Duplicate
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setProductToDelete(p); setActiveMenuId(null); }}
                              className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition-colors border-t border-slate-100"
                            >
                              <Trash2 className="h-4 w-4" />
                              delete
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Invisible overlay to close menu when clicking outside */}
                      {activeMenuId === p.id && (
                        <div 
                          className="fixed inset-0 z-40 cursor-default"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(null);
                          }}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600 font-medium text-sm">No data setup now</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Products Grid Mode — Compact Card Layout */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col group text-xs"
            >
              <div className="relative h-32 sm:h-36 bg-slate-50 overflow-hidden flex items-center justify-center p-2">
                <img
                  src={p.image}
                  alt={p.title}
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[70%]">
                  <span className="bg-slate-900/80 backdrop-blur-md text-white text-[9px] font-bold px-1.5 py-0.5 rounded truncate">
                    {p.category}
                  </span>
                  {p.brand && (
                    <span className="bg-amber-400/90 backdrop-blur-md text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Bookmark className="h-2 w-2" />
                      {p.brand}
                    </span>
                  )}
                </div>
                <div
                  className={`absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    p.isAvailable && p.stock > 0
                      ? 'bg-emerald-500 text-white'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {p.isAvailable && p.stock > 0 ? `stock: ${p.stock}` : 'out of stock'}
                </div>
              </div>

              <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs leading-snug line-clamp-2 group-hover:text-teal-700 transition-colors">
                    {p.title}
                  </h3>
                  {p.sku && (
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">SKU: {p.sku}</p>
                  )}
                  {p.subtitle && (
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{p.subtitle}</p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                  <div>
                    {(() => {
                      const hasVar = Boolean(p.hasVariants && p.variants && p.variants.length > 0);
                      const validVariants = hasVar ? p.variants!.filter(v => v.price > 0) : [];
                      const variantPrices = validVariants.map(v => v.price);
                      const minVarPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : p.price;
                      const maxVarPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : p.price;
                      const displayPrice = hasVar && minVarPrice > 0 ? minVarPrice : p.price;
                      const lowestVar = hasVar ? validVariants.find(v => v.price === displayPrice) : null;
                      const displayRegPrice = lowestVar?.regularPrice || p.regularPrice;

                      return (
                        <div>
                          <div className="text-xs sm:text-sm font-extrabold text-teal-700 flex items-center gap-0.5">
                            <span>Tk.{displayPrice.toLocaleString('bn-BD')}</span>
                            {hasVar && minVarPrice !== maxVarPrice && (
                              <span className="text-[10px] font-bold text-slate-500">- Tk.{maxVarPrice.toLocaleString('bn-BD')}</span>
                            )}
                          </div>
                          {displayRegPrice && displayRegPrice > displayPrice && (
                            <div className="text-[10px] text-slate-400 line-through">
                              Tk.{displayRegPrice.toLocaleString('bn-BD')}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex items-center space-x-0.5 shrink-0">
                    <button
                      onClick={() => {
                        const pSlug = p.slug || getProductSlug(p);
                        window.open(`/${pSlug}`, '_blank');
                      }}
                      className="p-1 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors cursor-pointer"
                      title="View the landing page live"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDuplicateProduct(p)}
                      className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                      title="Duplicate"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenModal(p)}
                      className="p-1 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors cursor-pointer"
                      title="Description and editing"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setProductToDelete(p)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      title="delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredProducts.length === 0 && (
            <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center">
              <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium text-sm">No data setup now</p>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Full Product Modal with Tab Navigation */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 my-auto overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 px-6 py-4 bg-white shrink-0 sticky top-0 z-20">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Package className="h-5 w-5 text-teal-600" />
                  <span>{ editingProduct ? 'Product Details & Information' : 'Add New Product'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select the tab productShiRoname, category, picture, Details and Publishing Control Update।
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* TAB-WISE NAVIGATION HEADER */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-hide">
              <button
                type="button"
                onClick={() => setActiveTab('title-summary')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'title-summary' ? 'bg-teal-700 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Title and description</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('price')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'price' ? 'bg-teal-700 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="text-sm font-black">Tk.</span>
                <span>Price and Selling</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('category')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'category' ? 'bg-teal-700 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Tag className="h-4 w-4" />
                <span>category</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('image')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'image' ? 'bg-teal-700 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ImageIcon className="h-4 w-4" />
                <span>Photos and Gallery</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('publishing')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'publishing' ? 'bg-teal-700 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Publishing Control</span>
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto text-xs flex-1 space-y-6">
              
              {/* TAB 1: TITLE & SUMMARY CONTENT */}
              {activeTab === 'title-summary' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Identity Box */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-teal-600" />
                        <span>Product name and identification</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        customerShown to productShiRoname, Write subtitles, brief summary and detailed description।
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-10 gap-4">
                      {/* Title */}
                      <div className="md:col-span-10">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Product Titleproductof name *</label>
                        <input
                          type="text"
                          required
                          placeholder="Eg: Easy Quran Majeed"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>

                      {/* Short Summary (as Description size) */}
                      <div className="md:col-span-10">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          <span>Short SummaryBrief summary *</span>
                        </label>
                        <textarea
                          required
                          rows={6}
                          placeholder="Write details about product details, specifications or features..."
                          value={shortSummary}
                          onChange={(e) => setShortSummary(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none resize-y leading-relaxed"
                        />
                      </div>

                      {/* Quick Badges in Tab 1 */}
                      <div className="md:col-span-10 grid grid-cols-1 gap-3 pt-2">
                        <label className="flex items-center gap-3 p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl cursor-pointer hover:bg-emerald-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={isNewArrival}
                            onChange={(e) => setIsNewArrival(e.target.checked)}
                            className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <span>New Arrival Badge</span>
                              <span className="bg-[#00b862] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">NEW</span>
                            </span>
                            <span className="text-[10px] text-slate-500 block">The homepage will show a New Arrivals section and a green 'New' badge</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PRICE */}
              {activeTab === 'price' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="text-teal-600 font-black">Tk.</span>
                          <span>Price and Selling</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">Setup sale price, regular price, purchase price and discount.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="flash_price"
                        checked={isFlashPrice}
                        onChange={(e) => setIsFlashPrice(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                      <label htmlFor="flash_price" className="font-bold text-slate-800 cursor-pointer">
                        Flash price <span className="text-[11px] font-normal text-slate-400">Special temporary offer</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id="has_variants"
                        checked={hasVariants}
                        onChange={(e) => setHasVariants(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                      <label htmlFor="has_variants" className="font-bold text-slate-800 cursor-pointer text-xs sm:text-sm">
                        বিভিন্ন ওজন বা সাইজের ভেরিয়েন্ট (Has Variants / Different Weights)
                        <span className="block text-[11px] font-normal text-slate-500 mt-0.5">
                          যেমন: ১ কেজি ১২৫০ টাকা, ২ কেজি ২৪০০ টাকা, ৫০০ গ্রাম ইত্যাদি
                        </span>
                      </label>
                    </div>

                    {hasVariants && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 mt-2 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <div>
                            <label className="block text-xs font-bold text-slate-800">
                              ওজন / সাইজ ও মূল্য তালিকা (Variant Options)
                            </label>
                            <span className="text-[11px] text-slate-500">
                              প্রতিটি ওজনের জন্য আলাদা বিক্রয় মূল্য ও পূর্বের মূল্য নির্ধারণ করুন
                            </span>
                          </div>
                        </div>

                        {/* Column Header Guide */}
                        <div className="hidden sm:grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2">
                          <div className="col-span-2">ছবি (Image)</div>
                          <div className="col-span-4">ওজন / ভেরিয়েন্টের নাম (e.g. ১ কেজি)</div>
                          <div className="col-span-3">বিক্রয় মূল্য (Price ৳)</div>
                          <div className="col-span-2">পূর্বের মূল্য (Reg. ৳)</div>
                          <div className="col-span-1 text-right">মুছুন</div>
                        </div>

                        {variants.map((v, idx) => (
                          <div key={v.id || idx} className="flex flex-wrap sm:flex-nowrap gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                            {/* Variant Image Thumbnail / Upload */}
                            <div className="relative group shrink-0">
                              <label
                                className="w-10 h-10 rounded-lg border-2 border-dashed border-slate-200 hover:border-teal-500 bg-slate-50 flex items-center justify-center cursor-pointer overflow-hidden transition-all relative"
                                title="Upload variant image"
                              >
                                {uploadingVariantIdx === idx ? (
                                  <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                                ) : v.image ? (
                                  <img src={v.image} alt={v.name || 'Variant'} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-teal-600">
                                    <ImageIcon className="w-4 h-4" />
                                    <span className="text-[8px] font-bold leading-none mt-0.5">ছবি</span>
                                  </div>
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleVariantImageUpload(idx, e)}
                                />
                              </label>
                              {v.image && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newVariants = [...variants];
                                    newVariants[idx] = { ...newVariants[idx], image: undefined };
                                    setVariants(newVariants);
                                  }}
                                  className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 shadow-sm transition-colors cursor-pointer"
                                  title="Delete picture"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>

                            {/* Image Link URL button */}
                            <button
                              type="button"
                              onClick={() => handleVariantImageUrlPrompt(idx)}
                              className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-md transition-colors shrink-0"
                              title="Image URL"
                            >
                              <LinkIcon className="h-3.5 w-3.5" />
                            </button>

                            {/* Variant Name (e.g. ১ কেজি / ২ কেজি) */}
                            <input
                              type="text"
                              placeholder="যেমন: ১ কেজি অথবা ২ কেজি"
                              value={v.name}
                              onChange={(e) => {
                                const newVariants = [...variants];
                                newVariants[idx] = { ...newVariants[idx], name: e.target.value };
                                setVariants(newVariants);
                              }}
                              className="flex-1 min-w-[130px] px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-teal-500 rounded-lg text-xs font-semibold text-slate-800"
                            />

                            {/* Variant Sale Price */}
                            <div className="relative w-28 shrink-0">
                              <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">৳</span>
                              <input
                                type="number"
                                placeholder="১২৫০"
                                value={v.price === 0 ? '' : v.price}
                                onChange={(e) => {
                                  const newVariants = [...variants];
                                  newVariants[idx] = { ...newVariants[idx], price: Number(e.target.value) };
                                  setVariants(newVariants);
                                }}
                                className="w-full pl-6 pr-2 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-teal-500 rounded-lg text-xs font-bold text-teal-700"
                              />
                            </div>

                            {/* Variant Regular Price */}
                            <div className="relative w-24 shrink-0">
                              <span className="absolute left-2 top-1.5 text-xs text-slate-400">৳</span>
                              <input
                                type="number"
                                placeholder="পূর্বের মূল্য"
                                value={v.regularPrice || ''}
                                onChange={(e) => {
                                  const newVariants = [...variants];
                                  newVariants[idx] = { ...newVariants[idx], regularPrice: Number(e.target.value) || undefined };
                                  setVariants(newVariants);
                                }}
                                className="w-full pl-5 pr-2 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-teal-500 rounded-lg text-xs text-slate-500"
                              />
                            </div>

                            {/* Variant Weight (kg) */}
                            <div className="relative w-20 shrink-0">
                              <input
                                type="number"
                                step="0.05"
                                min="0"
                                placeholder="ওজন kg"
                                value={v.weight || ''}
                                onChange={(e) => {
                                  const newVariants = [...variants];
                                  newVariants[idx] = { ...newVariants[idx], weight: Number(e.target.value) || undefined };
                                  setVariants(newVariants);
                                }}
                                className="w-full px-2 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-teal-500 rounded-lg text-xs text-slate-700 font-mono"
                                title="Weight in kg (e.g. 0.5 or 1)"
                              />
                            </div>

                            {/* Delete Variant */}
                            <button
                              type="button"
                              onClick={() => setVariants(variants.filter((_, i) => i !== idx))}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0 ml-auto"
                              title="Delete variant"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setVariants([...variants, { id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, name: '', price: 0, image: '', weight: 0.5 }])}
                          className="mt-2 text-xs font-bold text-teal-700 hover:text-teal-800 bg-white hover:bg-teal-50 border border-teal-300 px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Plus className="h-3.5 w-3.5 text-teal-600" />
                          <span>আরেকটি ওজন / ভেরিয়েন্ট যোগ করুন (Add Variant)</span>
                        </button>
                      </div>
                    )}

                    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 ${hasVariants ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Sale / Retail PriceTk. *</label>
                        <input
                          type="number"
                          placeholder="650"
                          value={price}
                          onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-teal-700"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">List / Regular PriceTk.</label>
                        <input
                          type="number"
                          placeholder="700"
                          value={regularPrice}
                          onChange={(e) => setRegularPrice(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Cost / Purchase PriceTk.</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={costPrice}
                          onChange={(e) => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Package Weight (কেজি)</label>
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          placeholder="e.g. 0.5 or 1"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Gift Wrapper Option */}
                    <div className="border-t border-slate-100 pt-4 mt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="gift_wrap_enabled"
                          checked={giftWrapEnabled}
                          onChange={(e) => setGiftWrapEnabled(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <label htmlFor="gift_wrap_enabled" className="font-bold text-slate-800 cursor-pointer text-xs">
                          gift‍Turn on the app's features <span className="text-[11px] font-normal text-slate-400">(Enable Gift Wrapper)</span>
                        </label>
                      </div>

                      {giftWrapEnabled && (
                        <div className="max-w-xs">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">gift‍Tk.Gift Wrap Price</label>
                          <input
                            type="number"
                            placeholder="30"
                            value={giftWrapPrice}
                            onChange={(e) => setGiftWrapPrice(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CATEGORY */}
              {activeTab === 'category' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <Tag className="h-4 w-4 text-teal-600" />
                        <span>Category and type</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        productof category, Sub-Category And book/Provide publication related information।
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5 text-teal-600" />
                          <span>Product Type *</span>
                        </label>
                        <select
                          value={productType}
                          onChange={(e) => setProductType(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                        >
                          <option value="Physical product">Physical productthe physical product</option>
                          <option value="Digital product">Digital productDigital book/file</option>
                          <option value="Book / Publication">Book / Publicationbook/publication</option>
                          <option value="Service">Serviceservice</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                          <Tag className="h-3.5 w-3.5 text-teal-600" />
                          <span>Main Category *</span>
                        </label>
                        <select
                          value={category}
                          onChange={(e) => {
                            setCategory(e.target.value);
                            setSubCategory('');
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                        >
                          <option value="">Select...</option>
                          {storeCategories.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                          <Bookmark className="h-3.5 w-3.5 text-amber-600" />
                          <span>Brand</span>
                        </label>
                        <select
                          value={brand}
                          onChange={(e) => setBrand(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                        >
                          <option value="">Select brand...</option>
                          {storeBrands.map(b => (
                            <option key={b.id} value={b.name}>{b.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Sub-optional</label>
                        <select
                          value={subCategory}
                          onChange={(e) => setSubCategory(e.target.value)}
                          disabled={!category}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none disabled:opacity-50"
                        >
                          <option value="">which is not</option>
                          {storeCategories.find(c => c.name === category)?.subcategories?.map((sub: any, i) => {
                            const subName = typeof sub === 'string' ? sub : (sub?.name || '');
                            return <option key={i} value={subName}>{subName}</option>;
                          })}
                        </select>
                      </div>
                    </div>

                    {((productType || '').toLowerCase().includes('book') || (category || '').toLowerCase() === 'book') && (
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
                        <h5 className="text-xs font-bold text-emerald-800 mb-3 flex items-center gap-1.5">
                          <BookOpen className="h-4 w-4" />
                          book / Publication information
                        </h5>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Writer / Authorthe writer *</label>
                            <input type="text" placeholder="Eg: Noor Mohammad Dewan" value={primaryAuthor} onChange={(e) => setPrimaryAuthor(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Print TypePrint type</label>
                            <input type="text" placeholder="Eg: news print" value={printType} onChange={(e) => setPrintType(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">ISBN</label>
                            <input type="text" placeholder="ISBN number" value={isbn} onChange={(e) => setIsbn(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Color Grade</label>
                            <input type="text" placeholder="e.g. 4 Color" value={colorGrade} onChange={(e) => setColorGrade(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">PagesNumber of pages</label>
                            <input type="number" placeholder="250" value={pages} onChange={(e) => setPages(e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs" />
                          </div>
                        </div>

                        <div className="mt-3 border-t border-emerald-100 pt-3">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Short Preview PDFRead on</label>
                          <p className="text-[10px] text-slate-400 mb-2">Customers can read this PDF for free by clicking the "Read" button.</p>

                          <div className="space-y-3">
                            {/* Upload Button */}
                            <label className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors w-fit">
                              {isUploadingSamplePdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                              <input type="file" accept="application/pdf" onChange={async (ev) => {
                                const f = ev.target.files?.[0];
                                if (!f) return;
                                try {
                                  setIsUploadingSamplePdf(true);
                                  const dest = `products/${editingProduct?.id || 'new'}-sample-${Date.now()}.pdf`;
                                  const url = await uploadFileToStorage(f, dest);
                                  setSamplePdfUrlState(url);
                                } catch (err: any) {
                                  console.error('Sample PDF upload failed:', err);
                                  setFeedback({
                                    isOpen: true,
                                    type: 'error',
                                    title: 'PDF upload failed',
                                    message: 'There was a problem uploading the PDF file. Please try again.'
                                  });
                                } finally {
                                  setIsUploadingSamplePdf(false);
                                }
                              }} className="hidden" />
                              {isUploadingSamplePdf ? 'Uploading PDF...' : 'Upload the PDF file'}
                            </label>
                            
                            {/* URL Input */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">Or give the link:</span>
                              <input 
                                type="text" 
                                placeholder="such as: /ebook/kg_2.pdf or URL" 
                                value={samplePdfUrlState}
                                onChange={(e) => setSamplePdfUrlState(e.target.value)}
                                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                              />
                            </div>

                            {/* Preview & Remove */}
                            {samplePdfUrlState && (
                              <div className="flex items-center justify-between p-3 bg-white border border-emerald-200 rounded-xl mt-2">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-emerald-50 rounded-lg">
                                    <FileText className="h-5 w-5 text-emerald-600" />
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-bold text-slate-800">PDF link is set</p>
                                    <button type="button" onClick={() => setPreviewPdfUrl(samplePdfUrlState)} className="text-[10px] text-emerald-600 hover:text-emerald-700 hover:underline font-bold mt-0.5 cursor-pointer">
                                      View the PDF
                                    </button>
                                  </div>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => setSamplePdfUrlState('')} 
                                  className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <X className="h-3 w-3" /> remove
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: IMAGE */}
              {activeTab === 'image' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <ImageIcon className="h-4 w-4 text-teal-600" />
                        <span>Photos and Gallery</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        productHead of picture And 2-4T Upload additional images।
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Main Imagechief picture *</label>
                      <p className="text-[10px] text-slate-400 mb-2">Drag images from computer or mobile.</p>

                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => !image && !isUploading && fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-teal-500 bg-slate-50/50 transition-all relative cursor-pointer"
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleImageFileUpload}
                          className="hidden"
                        />

                        {image ? (
                          <div className="relative inline-block group my-2">
                            <img
                              src={image}
                              alt="Product Preview"
                              className="h-44 w-auto max-w-full object-contain rounded-xl border border-slate-200 shadow-sm mx-auto bg-white p-2"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setImage('');
                              }}
                              className="absolute -top-2 -right-2 bg-rose-600 text-white p-1.5 rounded-full shadow-md hover:bg-rose-700 transition-colors cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : isUploading ? (
                          <div className="py-8 flex flex-col items-center justify-center gap-2">
                            <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                            <p className="text-xs text-slate-600 font-medium">Image processing...</p>
                          </div>
                        ) : (
                          <div className="py-6 flex flex-col items-center justify-center gap-2">
                            <div className="h-12 w-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center">
                              <Upload className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">Click or drag to upload images</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WEBPMaximum size autoTA will be compressed</p>
                            </div>
                          </div>
                        )}
                        {uploadError && <p className="text-[11px] text-rose-600 font-semibold mt-2">{uploadError}</p>}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Additional Imagesextra picture - Optional</label>
                      <p className="text-[10px] text-slate-400 mb-3">You can add 2-4 more detailed images of the product.</p>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <label className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors">
                          {isUploadingSampleImages ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-2" />}
                          <input type="file" accept="image/*" multiple onChange={async (ev) => {
                            const files = ev.target.files;
                            if (!files) return;
                            setIsUploadingSampleImages(true);
                            const uploadedUrls: string[] = [];
                            try {
                              for (const f of Array.from(files) as File[]) {
                                const dest = `products/${editingProduct?.id || 'new'}-sample-img-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${f.name.split('.').pop()}`;
                                const url = await uploadFileToStorage(f, dest);
                                uploadedUrls.push(url);
                              }
                              setSamplePages(prev => [...prev, ...uploadedUrls]);
                            } catch (err: any) {
                              console.error('Sample images upload failed:', err);
                              setFeedback({
                                isOpen: true,
                                type: 'error',
                                title: 'Image upload failed',
                                message: 'There was a problem uploading additional images. Please try again.'
                              });
                            } finally {
                              setIsUploadingSampleImages(false);
                            }
                          }} className="hidden" />
                          {isUploadingSampleImages ? 'Uploading...' : 'Upload additional images'}
                        </label>
                      </div>
                      
                      {samplePages.length > 0 && (
                        <div className="flex gap-3 flex-wrap bg-slate-50 p-4 rounded-xl border border-slate-200">
                          {samplePages.map((s, i) => (
                            <div key={i} className="w-20 h-28 overflow-hidden rounded-md border border-slate-200 relative shadow-sm group">
                              <img src={s} alt={`sample-${i}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <button type="button" onClick={() => setSamplePages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-white/90 rounded-full p-1 text-rose-600 hover:bg-rose-50 cursor-pointer shadow-xs">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: PUBLISHING CONTROL */}
              {activeTab === 'publishing' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-teal-600" />
                        <span>Control of stock and publishing</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        productstock of Amount, Visibility, Delivery charges, And SEO ContRoManage Law।
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Stock */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-800">Stock</label>
                          <span className="text-[10px] text-slate-400">How many products are currently available?</span>
                        </div>
                        <input
                          type="number"
                          placeholder="100"
                          value={stock}
                          onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-28 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 text-center focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>

                      {/* Visibility */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-800">Public</label>
                          <span className="text-[10px] text-slate-400">Whether the product will be visible on the website</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!isPrivate}
                            onChange={(e) => setIsPrivate(!e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                        </label>
                      </div>

                      {/* Continuous Selling */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-800">Continue selling when out of stock</label>
                          <span className="text-[10px] text-slate-400">Allow customers to purchase this item even when stock is zero</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={continueSelling}
                            onChange={(e) => setContinueSelling(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                        </label>
                      </div>

                      {/* Free Delivery */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-800">Free delivery</label>
                          <span className="text-[10px] text-slate-400">Whether delivery charges are applicable for this product</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!deliveryChargeEnabled}
                            onChange={(e) => setDeliveryChargeEnabled(!e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>

                      {/* COD Supported */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-800">COD</label>
                          <span className="text-[10px] text-slate-400">Does it support cash on delivery?</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={codAvailable}
                            onChange={(e) => setCodAvailable(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                        </label>
                      </div>
                      
                      {/* New Arrival Badge Toggle */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span>New Arrival</span>
                            <span className="bg-[#00b862] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">NEW</span>
                          </label>
                          <span className="text-[10px] text-slate-400">A green 'New' badge will appear on the website and in the New Arrivals section</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isNewArrival}
                            onChange={(e) => setIsNewArrival(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00b862]"></div>
                        </label>
                      </div>

                      {/* SKU */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-2">
                        <label className="block text-xs font-bold text-slate-800">SKU Code</label>
                        <input
                          type="text"
                          placeholder="For example: map_hq_1"
                          value={sku}
                          onChange={(e) => setSku(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SEO Setup Box */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <Search className="h-4 w-4 text-teal-600" />
                        <span>SEO</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Google Search results and productof URL take control। If left blank productof general Information will be used।
                      </p>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <label className="block text-[11px] font-bold text-slate-700">Product URL slug</label>
                        <button
                          type="button"
                          onClick={() => setSlug(slugifyProductText(title))}
                          className="text-[10px] font-bold text-teal-600 hover:text-teal-700"
                        >
                          Auto generate
                        </button>
                      </div>
                      <input
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\\s+/g, '-'))}
                        placeholder="my-awesome-product"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-mono text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <label className="block text-[11px] font-bold text-slate-700">SEOMeta Title</label>
                        <span className={`text-[10px] ${seoTitle.length > 60 ? 'font-bold text-amber-600' : 'text-slate-400'}`}>{seoTitle.length}/60</span>
                      </div>
                      <input
                        type="text"
                        maxLength={100}
                        value={seoTitle}
                        onChange={(e) => setSeoTitle(e.target.value)}
                        placeholder={title || 'Product title to display on Google'}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <p className="mt-1 text-[10px] text-slate-400">Keep around 50–60 characters for best results.</p>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <label className="block text-[11px] font-bold text-slate-700">SEOMeta Description</label>
                        <span className={`text-[10px] ${seoDescription.length > 160 ? 'font-bold text-amber-600' : 'text-slate-400'}`}>{seoDescription.length}/160</span>
                      </div>
                      <textarea
                        rows={2}
                        maxLength={240}
                        value={seoDescription}
                        onChange={(e) => setSeoDescription(e.target.value)}
                        placeholder={shortSummary || 'Short description to show in Google search'}
                        className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <p className="mt-1 text-[10px] text-slate-400">Keep around 140–160 characters for best results.</p>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-bold text-slate-700">SEO keywords</label>
                      <textarea
                        rows={2}
                        value={seoKeywordsText}
                        onChange={(e) => setSeoKeywordsText(e.target.value)}
                        placeholder="such as: book, Simple Quran, Islamic book"
                        className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* {/* Bottom Sticky Action Bar */}
              <div className="flex items-center justify-between pt-4 pb-2 border-t border-slate-200 bg-white sticky -bottom-6 z-30">
                <div>
                  {editingProduct && (
                    <button
                      type="button"
                      onClick={() => setProductToDelete(editingProduct)}
                      className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Delete the product
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleDuplicateProduct()}
                    className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Copy className="h-4 w-4 text-slate-600" />
                    <span>Duplicate</span>
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    product save
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Product Deletion Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="p-3 bg-rose-100 rounded-full">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Delete the product</h3>
                <p className="text-xs text-slate-500 font-medium">The product will be permanently deleted from the database</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 font-medium mb-6">
              Are you sure that <span className="font-bold text-slate-900">"{productToDelete.title}"</span> productT Want to delete permanently?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                canceled
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetId = productToDelete.id;
                  setProductToDelete(null);
                  setIsModalOpen(false);
                  await onDeleteProduct(targetId);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
              >
                Yes, delete it
              </button>
            </div>
          </div>
        </div>
      )}
      {/* PDF Preview Full-Width Modal */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 shadow-sm bg-white">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal-600" />
              <span>PDF preview</span>
            </h3>
            <button 
              type="button" 
              onClick={() => setPreviewPdfUrl(null)}
              className="p-2 bg-rose-50 text-rose-600 rounded-full hover:bg-rose-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 w-full bg-slate-100">
            <iframe 
              src={previewPdfUrl} 
              className="w-full h-full border-none"
              title="PDF Preview"
            />
          </div>
        </div>
      )}

      {/* Reusable Centered Feedback Dialog */}
      <FeedbackDialog
        isOpen={feedback.isOpen}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
