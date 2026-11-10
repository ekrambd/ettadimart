import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, CategoryItem, Brand, Vendor } from '../types';
import { dbService } from '../lib/dbService';
import { uploadDataUrlToStorage, uploadFileToStorage } from '../lib/storageService';
import { 
  Plus, Search, Edit2, Trash2, Package, Check, X, Tag, Upload, 
  Link as LinkIcon, Loader2, Copy, Eye, Zap, ShieldCheck, 
  QrCode, Barcode, HelpCircle, Sparkles, ArrowRight, ArrowLeft, Globe, BookOpen, FileText, Layers,
  List, LayoutGrid, Image as ImageIcon, Settings, Sliders, MoreVertical, ExternalLink, Bookmark, Store,
  Bold, Italic, Underline as UnderlineIcon, ListOrdered, Heading1, Heading2, Quote, Undo2, Redo2, Code,
  Star, MessageSquare, ThumbsUp, User
} from 'lucide-react';
import { compressImage } from '../lib/imageUtils';
import { getProductSlug, slugifyProductText } from '../lib/seoUtils';
import { FeedbackDialog } from './ui/FeedbackDialog';

type DetailTab = 'basic' | 'category' | 'brand' | 'attributes' | 'price' | 'media' | 'seo' | 'reviews';

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
  const [statusTab, setStatusTab] = useState<'all' | 'on' | 'off'>('all');
  const [rowsPerPage, setRowsPerPage] = useState<number>(15);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('basic');
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
  const [storeAttributes, setStoreAttributes] = useState<import('../types').ProductAttribute[]>([]);
  const [storeUnits, setStoreUnits] = useState<import('../types').ProductUnit[]>([]);
  const [unit, setUnit] = useState('kg');
  const [minOrderQty, setMinOrderQty] = useState<number | ''>(1);
  const [selectedAttributesState, setSelectedAttributesState] = useState<Record<string, string[]>>({});
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [selectedCategoriesList, setSelectedCategoriesList] = useState<string[]>([]);
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('all');
  const [vendorId, setVendorId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [storeVendors, setStoreVendors] = useState<Vendor[]>([]);
  const [slug, setSlug] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywordsText, setSeoKeywordsText] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const descriptionTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Reviews State
  const [productReviews, setProductReviews] = useState<import('../types').Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);
  const [reviewFilterRating, setReviewFilterRating] = useState<'all' | '5' | '4' | 'below3'>('all');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewImages, setNewReviewImages] = useState<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isReviewUploadingImage, setIsReviewUploadingImage] = useState(false);

  // Helper function to insert formatting markdown or tags into description
  const applyFormat = (prefix: string, suffix: string = '', defaultPlaceholder: string = '') => {
    const textarea = descriptionTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const prevText = description;
    const selectedText = prevText.substring(start, end) || defaultPlaceholder;
    
    const replacement = `${prefix}${selectedText}${suffix}`;
    const newText = prevText.substring(0, start) + replacement + prevText.substring(end);
    setDescription(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 10);
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [settings, brandsData, vendorsData, attributesData, unitsData, categoriesData] = await Promise.all([
          dbService.getEcomSettings(),
          dbService.getBrands(),
          dbService.getVendors(),
          dbService.getAttributes(),
          dbService.getUnits(),
          dbService.getCategories()
        ]);
        let loadedCats: CategoryItem[] = categoriesData && categoriesData.length > 0 ? categoriesData : (settings.categoryItems || []);
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
        setStoreVendors(vendorsData || []);
        setStoreAttributes(attributesData || []);
        setStoreUnits(unitsData || []);
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
    window.addEventListener('attributes-updated', loadData);
    return () => {
      window.removeEventListener('ecom-settings-updated', loadData);
      window.removeEventListener('brands-updated', loadData);
      window.removeEventListener('attributes-updated', loadData);
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

  // Wholesale / Paikari Pricing State
  const [isWholesaleAvailable, setIsWholesaleAvailable] = useState<boolean>(false);
  const [wholesalePrice, setWholesalePrice] = useState<number | ''>('');
  const [wholesaleMinOrderQty, setWholesaleMinOrderQty] = useState<number | ''>(10);
  const [maxOrderQty, setMaxOrderQty] = useState<number | ''>('');

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
      const existingDesc = product.description || product.shortSummary || '';
      setShortSummary(existingDesc);
      setDescription(existingDesc);
      setSubtitle(product.subtitle || '');
      setCategory(product.category || 'Vegetables');
      setSubCategory(product.subCategory || '');
      setSelectedCategoriesList(product.category ? [product.category, ...(product.subCategory ? [product.subCategory] : [])] : ['Vegetables']);
      setUnit(product.unit || 'kg');
      setMinOrderQty(product.minOrderQty ?? 1);
      setSelectedAttributesState((product as any).selectedAttributes ? (typeof (product as any).selectedAttributes === 'string' ? JSON.parse((product as any).selectedAttributes) : (product as any).selectedAttributes) : {});
      setBrand(product.brand || '');
      setVendorId(product.vendorId || '');
      setVendorName(product.vendorName || '');
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

      // Wholesale / Paikari
      setIsWholesaleAvailable(product.isWholesaleAvailable ?? false);
      setWholesalePrice(product.wholesalePrice ?? (product as any).paikariPrice ?? '');
      setWholesaleMinOrderQty(product.minOrderQty ?? 10);
      setMaxOrderQty(product.maxOrderQty ?? '');

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

      // Wholesale / Paikari
      setIsWholesaleAvailable(false);
      setWholesalePrice('');
      setWholesaleMinOrderQty(10);
      setMaxOrderQty('');

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
    setActiveTab('basic');
    setIsModalOpen(true);
    // Load live reviews for this product
    if (product?.id) {
      setReviewsLoading(true);
      dbService.getReviews(product.id)
        .then(res => setProductReviews(res))
        .catch(err => console.warn('Failed to load reviews:', err))
        .finally(() => setReviewsLoading(false));
    } else {
      setProductReviews([]);
    }
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
      shortSummary: description.trim().replace(/<[^>]*>?/gm, '').slice(0, 180),
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
      category: (selectedCategoriesList[0] || category).trim() || 'Vegetables',
      subCategory: (selectedCategoriesList[1] || subCategory).trim(),
      brand: brand.trim() || undefined,
      unit: unit || 'kg',
      minOrderQty: isWholesaleAvailable && wholesaleMinOrderQty !== '' ? Number(wholesaleMinOrderQty) : (minOrderQty !== '' ? Number(minOrderQty) : 1),
      maxOrderQty: maxOrderQty !== '' ? Number(maxOrderQty) : undefined,
      wholesalePrice: isWholesaleAvailable && wholesalePrice !== '' ? Number(wholesalePrice) : undefined,
      paikariPrice: isWholesaleAvailable && wholesalePrice !== '' ? Number(wholesalePrice) : undefined,
      isWholesaleAvailable,
      selectedAttributes: selectedAttributesState,
      vendorId: vendorId || undefined,
      vendorName: vendorName || undefined,
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

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter(p => {
      // Status filter tab
      if (statusTab === 'on' && !p.isAvailable) return false;
      if (statusTab === 'off' && p.isAvailable) return false;

      const matchesSearch = !term ||
        p.title.toLowerCase().includes(term) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(term)) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        (p.barcode && p.barcode.toLowerCase().includes(term)) ||
        (p.brand && p.brand.toLowerCase().includes(term)) ||
        (p.category && p.category.toLowerCase().includes(term)) ||
        (p.subCategory && p.subCategory.toLowerCase().includes(term)) ||
        (p.slug && p.slug.toLowerCase().includes(term)) ||
        (p.seoKeywords && p.seoKeywords.some(keyword => keyword.toLowerCase().includes(term)));
      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchesBrand = selectedBrandFilter === 'all' || p.brand === selectedBrandFilter;
      return matchesSearch && matchesCat && matchesBrand;
    });
  }, [products, searchTerm, statusTab, selectedCategory, selectedBrandFilter]);

  const countAll = products.length;
  const countOn = products.filter(p => p.isAvailable).length;
  const countOff = countAll - countOn;

  const totalPages = Math.ceil(filteredProducts.length / rowsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredProducts.slice(start, start + rowsPerPage);
  }, [filteredProducts, currentPage, rowsPerPage]);

  const normalizedSeoSlug = slugifyProductText(slug || title) || 'product-url';
  const hasDuplicateSlug = products.some(product =>
    product.id !== editingProduct?.id && getProductSlug(product) === normalizedSeoSlug
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Bar (Matching reference UX with white styling) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Products</h2>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              // Quick export / batch actions
              alert(`Selected ${selectedProductIds.length} items`);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
            <span>More</span>
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New product
          </button>
        </div>
      </div>

      {/* Filter and Status Bar */}
      <div className="space-y-3">
        {/* Row 1: All / On / Off tabs & Search / Filter Inputs */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Status Tabs (All 7, On 7, Off 0) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 w-fit">
            <button
              type="button"
              onClick={() => { setStatusTab('all'); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusTab === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All {countAll}
            </button>
            <button
              type="button"
              onClick={() => { setStatusTab('on'); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusTab === 'on'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              On {countOn}
            </button>
            <button
              type="button"
              onClick={() => { setStatusTab('off'); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusTab === 'off'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Off {countOff}
            </button>
          </div>

          {/* Search Bar & Filters Button */}
          <div className="flex items-center gap-2 flex-1 max-w-md ml-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Name, SKU or barcode"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Category / Brand Filters Dropdown */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs">
              <Sliders className="h-3.5 w-3.5 text-slate-500" />
              <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                className="bg-transparent font-bold text-xs text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">Filters</option>
                {categories.filter(c => c !== 'all').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Secondary Status Pill */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-slate-200 text-slate-600 text-[11px] font-semibold rounded-lg shadow-2xs">
            <span>Search index verified</span>
            <span className="font-bold text-slate-900">{filteredProducts.length}</span>
          </span>
        </div>
      </div>

      {/* Vertical List View (Matching Image UX with White Theme) */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto min-h-[360px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold text-[11px]">
              <tr>
                <th className="py-3 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.length > 0 && selectedProductIds.length === paginatedProducts.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProductIds(paginatedProducts.map(p => p.id));
                      } else {
                        setSelectedProductIds([]);
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-2 w-8 text-slate-400">#</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4 text-center">Stock</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4 text-center">Active</th>
                <th className="py-3 px-4">Updated</th>
                <th className="py-3 px-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.map((p, idx) => {
                const rowNum = (currentPage - 1) * rowsPerPage + idx + 1;
                const isSelected = selectedProductIds.includes(p.id);

                const hasVar = Boolean(p.hasVariants && p.variants && p.variants.length > 0);
                const validVariants = hasVar ? p.variants!.filter(v => v.price > 0) : [];
                const variantPrices = validVariants.map(v => v.price);
                const displayPrice = hasVar && variantPrices.length > 0 ? Math.min(...variantPrices) : (p.price || 0);
                const regPrice = p.regularPrice || displayPrice;
                const costVal = p.costPrice || Math.round(displayPrice * 0.7);
                const marginVal = displayPrice - costVal;

                return (
                  <tr
                    key={p.id}
                    onClick={() => handleOpenModal(p)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Checkbox */}
                    <td className="py-3.5 px-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProductIds(prev => [...prev, p.id]);
                          } else {
                            setSelectedProductIds(prev => prev.filter(id => id !== p.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>

                    {/* # Index */}
                    <td className="py-3.5 px-2 text-slate-400 font-medium text-xs">
                      {rowNum}
                    </td>

                    {/* Product Image, Name, SKU, Type */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-0.5 shadow-2xs">
                          <img
                            src={p.image || 'https://images.unsplash.com/photo-1608248597359-0098f98a329d?w=300&auto=format&fit=crop&q=80'}
                            alt={p.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug group-hover:text-emerald-700 transition-colors line-clamp-1">
                            {p.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            <span className="font-mono text-slate-600">{p.sku || 'hvfx1'}</span>
                            <span className="mx-1.5 text-slate-300">•</span>
                            <span>{p.productType || 'Physical product'}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Stock */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-sm font-bold text-slate-800">
                        {p.stock ?? 100}
                      </span>
                    </td>

                    {/* Price, Regular Price, Cost & Margin */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="font-black text-sm text-slate-900">
                        ৳ {displayPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {regPrice > 0 && regPrice !== displayPrice && (
                        <div className="text-[11px] text-slate-400 line-through">
                          ৳ {regPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        <span>Cost ৳ {costVal.toFixed(2)}</span>
                        <span className="mx-1 text-slate-300">•</span>
                        <span className={marginVal >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-500'}>
                          Margin ৳ {marginVal.toFixed(2)}
                        </span>
                      </div>
                    </td>

                    {/* Active Toggle Switch */}
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={p.isAvailable ?? true}
                          onChange={async (e) => {
                            const updated = { ...p, isAvailable: e.target.checked };
                            await onUpdateProduct(updated);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </td>

                    {/* Updated Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-800 text-xs block">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'a day ago'}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '4:15 PM'}
                      </span>
                    </td>

                    {/* Action Menu */}
                    <td className="py-3.5 px-3 text-right relative" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(activeMenuId === p.id ? null : p.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {activeMenuId === p.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-left">
                            <button
                              onClick={() => { handleOpenModal(p); setActiveMenuId(null); }}
                              className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                const pSlug = p.slug || getProductSlug(p);
                                window.open(`/${pSlug}`, '_blank');
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              View Page
                            </button>
                            <button
                              onClick={() => { handleDuplicateProduct(p); setActiveMenuId(null); }}
                              className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Duplicate
                            </button>
                            <button
                              onClick={() => { setProductToDelete(p); setActiveMenuId(null); }}
                              className="w-full text-left px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer border-t border-slate-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-600 font-bold text-xs">No products match your search or filter</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer: Rows per page & Pagination (Matching screenshot UX) */}
        <div className="bg-white border-t border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Rows</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-slate-400 font-medium ml-2">
              {filteredProducts.length > 0 ? `${(currentPage - 1) * rowsPerPage + 1} - ${Math.min(currentPage * rowsPerPage, filteredProducts.length)} of ${filteredProducts.length}` : '0 of 0'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  currentPage === page
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Next
            </button>
          </div>
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

      {/* Full Page Add / Edit Product View */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col overflow-hidden animate-fadeIn">
          {/* Top Sticky Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/90 px-6 py-3.5 bg-white shrink-0 sticky top-0 z-30 shadow-xs gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
                <span>Back</span>
              </button>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight flex items-center gap-2">
                  <span>{editingProduct ? 'Edit Product' : 'Add Product'}</span>
                  {title && (
                    <span className="text-xs font-semibold text-slate-400 font-normal">
                      • {title}
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {editingProduct ? 'Modify existing catalog details and publish changes' : 'Fill in the information across separate tabs to publish your product'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Bookmark className="w-4 h-4 text-slate-500" />
                <span>Save as Draft</span>
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{editingProduct ? 'Update Product' : 'Publish Product'}</span>
              </button>
            </div>
          </div>

          {/* TAB-WISE NAVIGATION HEADER (Each tab completely separate, clean and fresh) */}
          <div className="bg-white border-b border-slate-200 px-6 py-1 flex items-center gap-2 sm:gap-4 overflow-x-auto shrink-0 scrollbar-hide text-xs font-bold text-slate-600 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`py-3 px-3 border-b-2 flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
                activeTab === 'basic' ? 'border-emerald-600 text-emerald-700 font-extrabold bg-emerald-50/40 rounded-t-lg' : 'border-transparent hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">ℹ</span>
              <span>Basic Information</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('category')}
              className={`py-3 px-3 border-b-2 flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
                activeTab === 'category' ? 'border-emerald-600 text-emerald-700 font-extrabold bg-emerald-50/40 rounded-t-lg' : 'border-transparent hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
              }`}
            >
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Category & Hierarchy</span>
              {category && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md max-w-[100px] truncate">
                  {category}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('brand')}
              className={`py-3 px-3 border-b-2 flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
                activeTab === 'brand' ? 'border-emerald-600 text-emerald-700 font-extrabold bg-emerald-50/40 rounded-t-lg' : 'border-transparent hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
              }`}
            >
              <Bookmark className="w-4 h-4 text-emerald-600" />
              <span>Brand</span>
              {brand && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md max-w-[100px] truncate">
                  {brand}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('attributes');
                dbService.getAttributes().then(attrs => setStoreAttributes(attrs || [])).catch(() => {});
              }}
              className={`py-3 px-3 border-b-2 flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
                activeTab === 'attributes' ? 'border-emerald-600 text-emerald-700 font-extrabold bg-emerald-50/40 rounded-t-lg' : 'border-transparent hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
              }`}
            >
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>Attributes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('price')}
              className={`py-3 px-3 border-b-2 flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
                activeTab === 'price' ? 'border-emerald-600 text-emerald-700 font-extrabold bg-emerald-50/40 rounded-t-lg' : 'border-transparent hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
              }`}
            >
              <Tag className="w-4 h-4 text-emerald-600" />
              <span>Pricing & Stock</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('media')}
              className={`py-3 px-3 border-b-2 flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
                activeTab === 'media' ? 'border-emerald-600 text-emerald-700 font-extrabold bg-emerald-50/40 rounded-t-lg' : 'border-transparent hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-emerald-600" />
              <span>Media</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('seo')}
              className={`py-3 px-3 border-b-2 flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
                activeTab === 'seo' ? 'border-emerald-600 text-emerald-700 font-extrabold bg-emerald-50/40 rounded-t-lg' : 'border-transparent hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
              }`}
            >
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>SEO & Meta</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`py-3 px-3 border-b-2 flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
                activeTab === 'reviews' ? 'border-emerald-600 text-emerald-700 font-extrabold bg-emerald-50/40 rounded-t-lg' : 'border-transparent hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
              }`}
            >
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Reviews</span>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded-full">
                {productReviews.length}
              </span>
            </button>
          </div>

          {/* Full Page Scrollable Body */}
          <div className="flex-1 overflow-y-auto bg-slate-50/60 p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto">
              <form onSubmit={handleSubmit} className="space-y-6 text-xs">
                
                {/* ============================================================== */}
                {/* TAB 1: BASIC INFORMATION (Only Basic Information)              */}
                {/* ============================================================== */}
                {activeTab === 'basic' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      
                      {/* Left Column (8 cols): Main Details */}
                      <div className="lg:col-span-8 space-y-5">
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
                          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-base font-bold text-slate-900">Basic Information</h4>
                              <p className="text-xs text-slate-500">Enter the primary title, permalink, code, and descriptions</p>
                            </div>
                          </div>

                          {/* Product Names Card (Name & Other-language name) */}
                          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">Product</span>
                            
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                Name <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. 5 - in - 1 Laundry Pods"
                                value={title}
                                onChange={(e) => {
                                  setTitle(e.target.value);
                                  if (!editingProduct) {
                                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
                                  }
                                }}
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                Other-language name
                              </label>
                              <input
                                type="text"
                                placeholder="যেমন: সুতি পাঞ্জাবি"
                                value={translation}
                                onChange={(e) => setTranslation(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                          </div>

                          {/* Product Slug / Permalink */}
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Product Slug / Permalink
                            </label>
                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white">
                              <span className="px-3.5 py-2.5 text-xs text-slate-400 font-medium select-none bg-slate-100 border-r border-slate-200">
                                https://ettadimart.com/products/
                              </span>
                              <input
                                type="text"
                                placeholder="5-in-1-laundry-pods"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                className="w-full px-3 py-2.5 bg-transparent text-xs font-semibold text-slate-800 outline-none"
                              />
                            </div>
                          </div>

                          {/* Unit & Multi-Vendor Shop */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                Unit <span className="text-rose-500">*</span>
                              </label>
                              <select
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                              >
                                {storeUnits.length > 0 ? (
                                  storeUnits.map((u) => (
                                    <option key={u.id} value={u.code || u.name}>
                                      {u.name.toUpperCase()}
                                    </option>
                                  ))
                                ) : (
                                  <>
                                    <option value="kg">KG</option>
                                    <option value="g">G</option>
                                    <option value="litre">LITRE</option>
                                    <option value="piece">PIECE</option>
                                    <option value="pack">PACK</option>
                                  </>
                                )}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                Vendor / Merchant Shop
                              </label>
                              <select
                                value={vendorId}
                                onChange={(e) => {
                                  const vId = e.target.value;
                                  setVendorId(vId);
                                  const match = storeVendors.find(v => v.id === vId);
                                  setVendorName(match?.storeName || '');
                                }}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                              >
                                <option value="">Default Store (Admin Owned)</option>
                                {storeVendors.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.storeName} ({v.ownerName})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Codes Section (SKU & Barcode) */}
                          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Codes</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSku(Math.floor(100000 + Math.random() * 900000).toString());
                                  setBarcode(Math.floor(1000000 + Math.random() * 9000000).toString());
                                }}
                                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                              >
                                Generate Codes
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                  SKU <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. hvfx1"
                                  value={sku}
                                  onChange={(e) => setSku(e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                  Barcode (UPC / EAN)
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. 8977718"
                                  value={barcode}
                                  onChange={(e) => setBarcode(e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Unified Product Description with Rich Editor Toolbar */}
                          <div>
                            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                              <span className="flex items-center gap-1.5">
                                Product Description <span className="text-rose-500">*</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const name = title.trim() || 'Product';
                                  setDescription(
                                    `### About ${name}\n\nExperience exceptional quality and freshness with our premium **${name}**. Specially sourced to meet the highest safety, hygiene, and taste standards.\n\n### Key Highlights\n• 100% genuine and premium grade quality\n• Rigorously inspected before packaging and delivery\n• Freshness guaranteed with doorstep delivery\n\n### Usage & Storage Instructions\nStore in a cool, dry place. Best consumed fresh for maximum flavor and health benefits.`
                                  );
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-lg transition-all shadow-xs cursor-pointer text-xs"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                Generate with AI
                              </button>
                            </div>

                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 bg-white transition-all">
                              {/* Editor Toolbar */}
                              <div className="bg-slate-50/90 px-3 py-2 border-b border-slate-200 flex flex-wrap items-center gap-1 text-slate-700 text-xs">
                                <button
                                  type="button"
                                  title="Heading 1"
                                  onClick={() => applyFormat('### ', '\n', 'Heading Text')}
                                  className="px-2 py-1 hover:bg-slate-200 rounded text-slate-700 font-bold transition-colors cursor-pointer text-xs"
                                >
                                  H1
                                </button>
                                <button
                                  type="button"
                                  title="Heading 2"
                                  onClick={() => applyFormat('#### ', '\n', 'Subheading Text')}
                                  className="px-2 py-1 hover:bg-slate-200 rounded text-slate-700 font-bold transition-colors cursor-pointer text-xs"
                                >
                                  H2
                                </button>

                                <div className="h-4 w-px bg-slate-300 mx-1"></div>

                                <button
                                  type="button"
                                  title="Bold (Ctrl+B)"
                                  onClick={() => applyFormat('**', '**', 'bold text')}
                                  className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors cursor-pointer font-bold"
                                >
                                  <Bold className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title="Italic (Ctrl+I)"
                                  onClick={() => applyFormat('*', '*', 'italic text')}
                                  className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors cursor-pointer"
                                >
                                  <Italic className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title="Underline"
                                  onClick={() => applyFormat('<u>', '</u>', 'underlined text')}
                                  className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors cursor-pointer"
                                >
                                  <UnderlineIcon className="w-3.5 h-3.5" />
                                </button>

                                <div className="h-4 w-px bg-slate-300 mx-1"></div>

                                <button
                                  type="button"
                                  title="Bullet List"
                                  onClick={() => applyFormat('\n• ', '', 'List item')}
                                  className="inline-flex items-center gap-1 px-2 py-1 hover:bg-slate-200 rounded text-slate-700 font-medium transition-colors cursor-pointer text-xs"
                                >
                                  <List className="w-3.5 h-3.5" />
                                  <span>Bullet</span>
                                </button>
                                <button
                                  type="button"
                                  title="Numbered List"
                                  onClick={() => applyFormat('\n1. ', '', 'Numbered item')}
                                  className="inline-flex items-center gap-1 px-2 py-1 hover:bg-slate-200 rounded text-slate-700 font-medium transition-colors cursor-pointer text-xs"
                                >
                                  <ListOrdered className="w-3.5 h-3.5" />
                                  <span>Number</span>
                                </button>
                                <button
                                  type="button"
                                  title="Quote / Callout"
                                  onClick={() => applyFormat('\n> ', '\n', 'Important note or quote')}
                                  className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors cursor-pointer"
                                >
                                  <Quote className="w-3.5 h-3.5" />
                                </button>

                                <div className="h-4 w-px bg-slate-300 mx-1"></div>

                                <button
                                  type="button"
                                  title="Clear Content"
                                  onClick={() => setDescription('')}
                                  className="ml-auto px-2 py-0.5 text-[11px] font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                >
                                  Clear
                                </button>
                              </div>

                              <textarea
                                ref={descriptionTextareaRef}
                                rows={8}
                                required
                                placeholder="Enter detailed product description, key benefits, specifications, usage instructions..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full p-4 bg-white text-xs font-normal text-slate-800 leading-relaxed outline-none resize-y min-h-[160px]"
                              />
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* Right Column (4 cols): Product Status & Quick Info */}
                      <div className="lg:col-span-4 space-y-5">
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
                          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                              <Check className="w-4 h-4" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-900">Product Status</h4>
                          </div>

                          <div className="space-y-2.5 pt-1 text-xs">
                            <label className="flex items-start gap-2.5 cursor-pointer">
                              <input
                                type="radio"
                                name="prod-status"
                                checked={isAvailable}
                                onChange={() => setIsAvailable(true)}
                                className="mt-0.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <div>
                                <span className="font-bold text-slate-900 block">Publish</span>
                                <span className="text-[11px] text-slate-500">Make it visible on store</span>
                              </div>
                            </label>

                            <label className="flex items-start gap-2.5 cursor-pointer">
                              <input
                                type="radio"
                                name="prod-status"
                                checked={!isAvailable}
                                onChange={() => setIsAvailable(false)}
                                className="mt-0.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <div>
                                <span className="font-bold text-slate-900 block">Draft</span>
                                <span className="text-[11px] text-slate-500">Hidden until you publish it</span>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* Organize Card (Type & Currency) */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Settings className="w-3.5 h-3.5 text-slate-500" />
                            <span>Organize</span>
                          </h4>

                          <div className="space-y-3 pt-1">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Type</label>
                              <select
                                value={productType}
                                onChange={(e) => setProductType(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                              >
                                <option value="Physical product">Physical product</option>
                                <option value="Digital goods">Digital goods</option>
                                <option value="Book">Book / Publication</option>
                                <option value="Service">Service</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Currency</label>
                              <select
                                defaultValue="BDT"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                              >
                                <option value="BDT">BDT (৳ Bangladesh Taka)</option>
                                <option value="USD">USD ($ US Dollar)</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Clean Navigation Card to Category & Brand tabs */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Assigned Details</h4>
                          
                          <div 
                            onClick={() => setActiveTab('category')}
                            className="p-3 bg-slate-50 hover:bg-emerald-50/50 rounded-xl border border-slate-200 cursor-pointer transition-all flex items-center justify-between"
                          >
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Category</span>
                              <span className="font-bold text-slate-800 text-xs">{category || 'Not Selected'}</span>
                              {subCategory && <span className="text-[11px] text-emerald-600 block">↳ {subCategory}</span>}
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                          </div>

                          <div 
                            onClick={() => setActiveTab('brand')}
                            className="p-3 bg-slate-50 hover:bg-emerald-50/50 rounded-xl border border-slate-200 cursor-pointer transition-all flex items-center justify-between"
                          >
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Brand</span>
                              <span className="font-bold text-slate-800 text-xs">{brand || 'No Brand'}</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* ============================================================== */}
                {/* TAB 2: CATEGORY & SUBCATEGORY (Dedicated clean component)      */}
                {/* ============================================================== */}
                {activeTab === 'category' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Layers className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-slate-900">Category & Subcategory</h4>
                            <p className="text-xs text-slate-500">
                              Select the primary category and subcategory for this product
                            </p>
                          </div>
                        </div>

                        {category && (
                          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                            <span className="text-xs text-emerald-800 font-bold">Current: {category}</span>
                            {subCategory && <span className="text-xs text-emerald-600 font-medium">({subCategory})</span>}
                          </div>
                        )}
                      </div>

                      {/* Search categories input */}
                      <div className="relative max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search categories or subcategories..."
                          value={categorySearchTerm}
                          onChange={(e) => setCategorySearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        />
                      </div>

                      {/* Clean Grid of Categories & Subcategories */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                        {storeCategories
                          .filter(c => !c.parentId)
                          .filter(c => 
                            c.name.toLowerCase().includes(categorySearchTerm.toLowerCase()) || 
                            storeCategories.some(sub => sub.parentId === c.id && sub.name.toLowerCase().includes(categorySearchTerm.toLowerCase()))
                          )
                          .map((parent) => {
                            const isParentSelected = selectedCategoriesList.includes(parent.name) || category === parent.name;
                            const childCats = storeCategories.filter(sub => sub.parentId === parent.id);

                            return (
                              <div 
                                key={parent.id} 
                                className={`p-4 rounded-2xl border transition-all ${
                                  isParentSelected 
                                    ? 'bg-emerald-50/50 border-emerald-300 shadow-xs' 
                                    : 'bg-slate-50/40 border-slate-200 hover:border-slate-300 hover:bg-white'
                                }`}
                              >
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={isParentSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedCategoriesList(prev => [...prev.filter(n => n !== parent.name), parent.name]);
                                        setCategory(parent.name);
                                      } else {
                                        setSelectedCategoriesList(prev => prev.filter(name => name !== parent.name));
                                        if (category === parent.name) setCategory('');
                                      }
                                    }}
                                    className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                  />
                                  <span className={`text-sm font-bold ${isParentSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                                    {parent.name}
                                  </span>
                                </label>

                                {childCats.length > 0 && (
                                  <div className="mt-3 pl-4 space-y-2 border-l-2 border-slate-200/80 ml-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Subcategories:</span>
                                    {childCats.map(child => {
                                      const isChildChecked = selectedCategoriesList.includes(child.name) || subCategory === child.name;
                                      return (
                                        <label key={child.id} className="flex items-center gap-2.5 cursor-pointer select-none text-xs">
                                          <input
                                            type="checkbox"
                                            checked={isChildChecked}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedCategoriesList(prev => [...prev.filter(n => n !== child.name), child.name]);
                                                setSubCategory(child.name);
                                                // Ensure parent is also selected
                                                if (!category) setCategory(parent.name);
                                                if (!selectedCategoriesList.includes(parent.name)) {
                                                  setSelectedCategoriesList(prev => [...prev, parent.name]);
                                                }
                                              } else {
                                                setSelectedCategoriesList(prev => prev.filter(name => name !== child.name));
                                                if (subCategory === child.name) setSubCategory('');
                                              }
                                            }}
                                            className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                          />
                                          <span className={isChildChecked ? 'text-emerald-800 font-bold' : 'text-slate-600'}>
                                            {child.name}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>

                      {/* Add New Category Quick Button */}
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            const name = window.prompt('Enter new category name:');
                            if (name?.trim()) {
                              dbService.saveCategory({ name: name.trim() }).then(newCat => {
                                setStoreCategories(prev => [...prev, newCat]);
                                setSelectedCategoriesList(prev => [...prev, newCat.name]);
                                setCategory(newCat.name);
                              });
                            }
                          }}
                          className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add New Category</span>
                        </button>
                      </div>

                    </div>
                  </div>
                )}

                {/* ============================================================== */}
                {/* TAB 3: BRAND (Dedicated clean component)                       */}
                {/* ============================================================== */}
                {activeTab === 'brand' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Bookmark className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-slate-900">Brand Selection</h4>
                            <p className="text-xs text-slate-500">
                              Assign an official brand to this product. Brand-wise products are displayed across the store.
                            </p>
                          </div>
                        </div>

                        {brand && (
                          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                            <span className="text-xs text-emerald-800 font-bold">Selected: {brand}</span>
                            <button
                              type="button"
                              onClick={() => setBrand('')}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer ml-1"
                              title="Clear Brand"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Brand Cards Grid */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                          <div
                            onClick={() => setBrand('')}
                            className={`p-4 rounded-xl border text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                              !brand 
                                ? 'bg-emerald-50/60 border-emerald-400 shadow-xs ring-2 ring-emerald-500/20' 
                                : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <span className="text-xs font-bold text-slate-700">Generic / No Brand</span>
                            <span className="text-[10px] text-slate-400">Unbranded or Direct Import</span>
                          </div>

                          {storeBrands.map((b) => {
                            const isSelected = brand === b.name;
                            return (
                              <div
                                key={b.id}
                                onClick={() => setBrand(b.name)}
                                className={`p-4 rounded-xl border text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                                  isSelected 
                                    ? 'bg-emerald-50/60 border-emerald-400 shadow-xs ring-2 ring-emerald-500/20' 
                                    : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                {b.logo ? (
                                  <img src={b.logo} alt={b.name} className="h-8 w-auto max-w-[80px] object-contain" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 font-black text-xs flex items-center justify-center">
                                    {b.name.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <span className={`text-xs font-bold ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                                  {b.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Quick Add Brand */}
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            const name = window.prompt('Enter new Brand name:');
                            if (name?.trim()) {
                              dbService.saveBrand({ name: name.trim() }).then(newB => {
                                setStoreBrands(prev => [...prev, newB]);
                                setBrand(newB.name);
                              });
                            }
                          }}
                          className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add New Brand</span>
                        </button>
                      </div>

                    </div>
                  </div>
                )}

                {/* ============================================================== */}
                {/* TAB 4: ATTRIBUTES (Only Attributes)                            */}
                {/* ============================================================== */}
                {activeTab === 'attributes' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Sliders className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-bold text-slate-900">Attributes</h4>
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Active Only ({((storeAttributes || []).filter(a => a?.status === true || a?.status === 1 || a?.status === '1' || a?.status === 'true')).length})
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              Colour, size, material and the like. Select active attributes for product variants.
                            </p>
                          </div>
                        </div>

                        {category && (
                          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                            {category}
                          </span>
                        )}
                      </div>

                      <div className="space-y-6">
                        {(() => {
                          const isAttrActive = (attr: any): boolean => {
                            return Boolean(attr && (attr.status === true || attr.status === 1 || attr.status === '1' || attr.status === 'true'));
                          };
                          const activeAttributes = (storeAttributes || []).filter(isAttrActive);
                          if (activeAttributes.length === 0) {
                            return (
                              <div className="py-10 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2.5">
                                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mx-auto">
                                  <Sliders className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-slate-700">No active attributes found</p>
                                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                                    All attributes are currently marked Inactive. To use attributes for this product, go to <strong>Catalogue &gt; Attributes</strong> and click <strong>Activate</strong> on the attributes you need.
                                  </p>
                                </div>
                              </div>
                            );
                          }
                          return activeAttributes.map((attr) => {
                            const selectedVals = selectedAttributesState[attr.name] || [];
                            const isColorAttr = attr.name.toLowerCase().includes('color') || attr.name.toLowerCase().includes('colour');

                            const getColorDot = (valName: string) => {
                              const v = valName.toLowerCase();
                              if (v.includes('black')) return 'bg-black border border-slate-700';
                              if (v.includes('white')) return 'bg-white border border-slate-300';
                              if (v.includes('red')) return 'bg-red-500';
                              if (v.includes('blue')) return 'bg-blue-600';
                              if (v.includes('green')) return 'bg-emerald-500';
                              if (v.includes('grey') || v.includes('gray')) return 'bg-slate-400';
                              if (v.includes('yellow')) return 'bg-amber-400';
                              if (v.includes('orange')) return 'bg-orange-500';
                              if (v.includes('pink')) return 'bg-pink-500';
                              if (v.includes('purple')) return 'bg-purple-600';
                              return null;
                            };

                            return (
                              <div key={attr.id} className="space-y-2.5">
                                <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                                  {attr.name}
                                </p>

                                <div className="flex flex-wrap items-center gap-2">
                                  {attr.values.map((val, vIdx) => {
                                    const isChecked = selectedVals.includes(val);
                                    const colorDot = isColorAttr ? getColorDot(val) : null;

                                    if (isChecked) {
                                      return (
                                        <div
                                          key={vIdx}
                                          onClick={() => {
                                            const nextSelected = selectedVals.filter(item => item !== val);
                                            setSelectedAttributesState({
                                              ...selectedAttributesState,
                                              [attr.name]: nextSelected
                                            });
                                          }}
                                          className="h-9 px-3.5 rounded-full text-xs font-bold bg-emerald-600 text-white flex items-center gap-2.5 shadow-xs cursor-pointer select-none transition-all"
                                        >
                                          <div className="w-4 h-4 rounded flex items-center justify-center bg-white/20">
                                            <Check className="w-3 h-3 text-white stroke-[3]" />
                                          </div>
                                          {colorDot && (
                                            <span className={`w-3 h-3 rounded-full shrink-0 ${colorDot}`}></span>
                                          )}
                                          <span>{val}</span>
                                          <div className="h-4 w-px bg-white/30 ml-0.5"></div>
                                          <span className="text-[11px] font-semibold text-emerald-100">+0</span>
                                        </div>
                                      );
                                    }

                                    return (
                                      <label
                                        key={vIdx}
                                        className="h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all border border-slate-200 hover:border-slate-300 bg-white text-slate-700 select-none shadow-2xs"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={false}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              const nextSelected = [...selectedVals, val];
                                              setSelectedAttributesState({
                                                ...selectedAttributesState,
                                                [attr.name]: nextSelected
                                              });

                                              setHasVariants(true);
                                              const exists = variants.some(v => v.name.toLowerCase() === val.toLowerCase());
                                              if (!exists) {
                                                setVariants(prev => [
                                                  ...prev,
                                                  {
                                                    id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                                                    name: val,
                                                    price: Number(price) || 0,
                                                    regularPrice: Number(regularPrice) || undefined,
                                                    weight: parseFloat(val) || (val.toLowerCase().includes('500g') ? 0.5 : 1)
                                                  }
                                                ]);
                                              }
                                            }
                                          }}
                                          className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                                        />
                                        {colorDot && (
                                          <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${colorDot}`}></span>
                                        )}
                                        <span>{val}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>

                      <div className="p-3.5 bg-emerald-50/80 border border-emerald-100 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
                        <span className="text-base leading-none">💡</span>
                        <div>
                          <span className="font-bold">Tip: </span>
                          <span>Selecting attributes automatically populates variants in the Pricing & Stock tab.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: PRICE */}
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
                                  title="Upload Variant Image"
                                >
                                  {v.image ? (
                                    <img src={v.image} alt={v.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Upload className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                                  )}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleVariantImageUpload(idx, e)}
                                    className="hidden"
                                  />
                                </label>
                              </div>

                              {/* Variant Name */}
                              <div className="flex-1 min-w-[120px]">
                                <input
                                  type="text"
                                  placeholder="e.g. ১ কেজি বা Red"
                                  value={v.name}
                                  onChange={(e) => {
                                    const newVariants = [...variants];
                                    newVariants[idx] = { ...newVariants[idx], name: e.target.value };
                                    setVariants(newVariants);
                                  }}
                                  className="w-full px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-teal-500 rounded-lg text-xs font-semibold text-slate-800"
                                />
                              </div>

                              {/* Variant Price */}
                              <div className="w-24 shrink-0">
                                <input
                                  type="number"
                                  placeholder="Price"
                                  value={v.price === 0 ? '' : v.price}
                                  onChange={(e) => {
                                    const newVariants = [...variants];
                                    newVariants[idx] = { ...newVariants[idx], price: Number(e.target.value) || 0 };
                                    setVariants(newVariants);
                                  }}
                                  className="w-full px-2.5 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-teal-500 rounded-lg text-xs font-bold text-teal-700"
                                />
                              </div>

                              {/* Variant Regular Price */}
                              <div className="w-24 shrink-0">
                                <input
                                  type="number"
                                  placeholder="Reg. Price"
                                  value={v.regularPrice || ''}
                                  onChange={(e) => {
                                    const newVariants = [...variants];
                                    newVariants[idx] = { ...newVariants[idx], regularPrice: Number(e.target.value) || undefined };
                                    setVariants(newVariants);
                                  }}
                                  className="w-full px-2.5 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-teal-500 rounded-lg text-xs text-slate-500 font-semibold"
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
                            <span>Add Custom Variant</span>
                          </button>
                        </div>
                      )}

                      {/* Price & Stock Section (Matches exact modern 4-input card design) */}
                      <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Price & Stock</span>
                            <span className="text-[11px] text-slate-400 block">Manage retail price, regular price, item cost, and current inventory</span>
                          </div>
                        </div>

                        <div className={`grid grid-cols-2 md:grid-cols-4 gap-3.5 ${hasVariants ? 'opacity-50 pointer-events-none' : ''}`}>
                          <div className="bg-white border border-slate-200 rounded-xl p-3 focus-within:ring-2 focus-within:ring-emerald-500 shadow-2xs">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Price</label>
                            <input
                              type="number"
                              placeholder="1000"
                              value={price}
                              onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full text-base font-black text-slate-900 bg-transparent outline-none"
                            />
                          </div>

                          <div className="bg-white border border-slate-200 rounded-xl p-3 focus-within:ring-2 focus-within:ring-emerald-500 shadow-2xs">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Regular price</label>
                            <input
                              type="number"
                              placeholder="1000"
                              value={regularPrice}
                              onChange={(e) => setRegularPrice(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full text-base font-black text-slate-700 bg-transparent outline-none"
                            />
                          </div>

                          <div className="bg-white border border-slate-200 rounded-xl p-3 focus-within:ring-2 focus-within:ring-emerald-500 shadow-2xs">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cost</label>
                            <input
                              type="number"
                              placeholder="700"
                              value={costPrice}
                              onChange={(e) => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full text-base font-black text-slate-700 bg-transparent outline-none"
                            />
                          </div>

                          <div className="bg-white border border-slate-200 rounded-xl p-3 focus-within:ring-2 focus-within:ring-emerald-500 shadow-2xs">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Stock</label>
                            <input
                              type="number"
                              placeholder="179"
                              value={stock}
                              onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full text-base font-black text-slate-900 bg-transparent outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 6: MEDIA */}
                {activeTab === 'media' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <ImageIcon className="h-4 w-4 text-teal-600" />
                          <span>Photos and Gallery</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Upload main product picture and optional additional gallery images.
                        </p>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Main Product Image *</label>
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
                                className="h-48 w-auto max-w-full object-contain rounded-xl border border-slate-200 shadow-sm mx-auto bg-white p-2"
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
                                <p className="text-xs font-bold text-slate-800">Click or drag to upload image</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WEBP (Auto-optimized)</p>
                              </div>
                            </div>
                          )}
                          {uploadError && <p className="text-[11px] text-rose-600 font-semibold mt-2">{uploadError}</p>}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Additional Gallery Images</label>
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

                {/* TAB 7: SEO & META */}
                {activeTab === 'seo' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-teal-600" />
                          <span>Control of Stock, Visibility and SEO</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Product inventory, SEO metadata and delivery configuration.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-800">Public Visibility</label>
                            <span className="text-[10px] text-slate-400">Whether the product will be visible on the store</span>
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

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-800">Cash on Delivery (COD)</label>
                            <span className="text-[10px] text-slate-400">Support COD payment at doorstep</span>
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
                      </div>

                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">SEO Meta Title</label>
                          <input
                            type="text"
                            placeholder={title || 'SEO Title'}
                            value={seoTitle}
                            onChange={(e) => setSeoTitle(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        {/* Summary & Keywords Component (Matches exact modern design) */}
                        <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-4">
                          <div className="border-b border-slate-200/60 pb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Summary & keywords</span>
                            <span className="text-[11px] text-slate-400 block">Provide brief search highlights and keyword tags for better search matching</span>
                          </div>

                          {/* Summary textarea */}
                          <div className="bg-white border border-slate-200 rounded-xl p-3 focus-within:ring-2 focus-within:ring-emerald-500 shadow-2xs">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Summary
                            </label>
                            <textarea
                              rows={3}
                              placeholder="Brief highlights or search summary (e.g. 28 Pods (1 pods can wash 5kg dry clothes)...)"
                              value={seoDescription}
                              onChange={(e) => setSeoDescription(e.target.value)}
                              className="w-full text-xs font-medium text-slate-800 bg-transparent outline-none resize-none leading-relaxed"
                            />
                          </div>

                          {/* Keywords interactive input & tags */}
                          <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 focus-within:ring-2 focus-within:ring-emerald-500 shadow-2xs">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                              Keyword
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Type keyword and press Enter or click Add (e.g. panjabi, laundry, pods)..."
                                value={keywordInput}
                                onChange={(e) => setKeywordInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ',') {
                                    e.preventDefault();
                                    const val = keywordInput.trim().replace(/^,+|,+$/g, '');
                                    if (val) {
                                      const currentList = seoKeywordsText ? seoKeywordsText.split(',').map(s => s.trim()).filter(Boolean) : [];
                                      if (!currentList.some(k => k.toLowerCase() === val.toLowerCase())) {
                                        setSeoKeywordsText([...currentList, val].join(', '));
                                      }
                                      setKeywordInput('');
                                    }
                                  }
                                }}
                                className="w-full text-xs font-semibold text-slate-800 bg-transparent outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const val = keywordInput.trim().replace(/^,+|,+$/g, '');
                                  if (val) {
                                    const currentList = seoKeywordsText ? seoKeywordsText.split(',').map(s => s.trim()).filter(Boolean) : [];
                                    if (!currentList.some(k => k.toLowerCase() === val.toLowerCase())) {
                                      setSeoKeywordsText([...currentList, val].join(', '));
                                    }
                                    setKeywordInput('');
                                  }
                                }}
                                className="px-3 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                              >
                                + Add
                              </button>
                            </div>

                            {/* Keyword Pills */}
                            {seoKeywordsText && (
                              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                                {seoKeywordsText.split(',').map(s => s.trim()).filter(Boolean).map((kw, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-full transition-colors select-none"
                                  >
                                    <span>{kw}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentList = seoKeywordsText.split(',').map(s => s.trim()).filter(Boolean);
                                        const updated = currentList.filter((_, idx) => idx !== i);
                                        setSeoKeywordsText(updated.join(', '));
                                      }}
                                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 8: CUSTOMER REVIEWS (Live API system matching uploaded screens) */}
                {activeTab === 'reviews' && (() => {
                  const totalReviews = productReviews.length;
                  const avgRating = totalReviews > 0
                    ? (productReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / totalReviews).toFixed(1)
                    : '0.0';

                  const countRating = (star: number) => productReviews.filter(r => Math.round(Number(r.rating)) === star).length;
                  const percentRating = (star: number) => totalReviews > 0 ? Math.round((countRating(star) / totalReviews) * 100) : 0;

                  const filteredReviews = productReviews.filter(r => {
                    const rate = Number(r.rating) || 5;
                    if (reviewFilterRating === '5') return Math.round(rate) === 5;
                    if (reviewFilterRating === '4') return Math.round(rate) === 4;
                    if (reviewFilterRating === 'below3') return Math.round(rate) <= 3;
                    return true;
                  });

                  const handleSaveNewReview = async () => {
                    if (!newReviewName.trim() || !newReviewComment.trim()) {
                      alert('Please provide reviewer name and comment');
                      return;
                    }
                    setIsSubmittingReview(true);
                    try {
                      const created = await dbService.addReview({
                        id: `REV-${Date.now()}`,
                        productId: editingProduct?.id || 'new-product',
                        productTitle: title || 'Product',
                        productImage: image || undefined,
                        customerName: newReviewName.trim(),
                        customerPhone: 'N/A',
                        rating: newReviewRating,
                        comment: newReviewComment.trim(),
                        images: newReviewImages,
                        createdAt: new Date().toISOString()
                      });

                      setProductReviews(prev => [created, ...prev]);
                      setNewReviewName('');
                      setNewReviewComment('');
                      setNewReviewImages([]);
                      setNewReviewRating(5);
                      setIsAddReviewOpen(false);
                    } catch (err) {
                      console.error('Failed to add review:', err);
                      alert('Could not save review');
                    } finally {
                      setIsSubmittingReview(false);
                    }
                  };

                  const handleDeleteReview = async (id: string) => {
                    if (!confirm('Are you sure you want to delete this review?')) return;
                    try {
                      await dbService.deleteReview(id);
                      setProductReviews(prev => prev.filter(r => r.id !== id));
                    } catch (err) {
                      console.error('Delete failed:', err);
                    }
                  };

                  return (
                    <div className="space-y-6 animate-fadeIn">
                      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
                        {/* Header bar: Customer reviews title, average pill, and + Add review button */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <h4 className="text-base font-bold text-slate-900">Customer reviews</h4>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span>{avgRating}</span>
                              <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                              <span>Average ({totalReviews})</span>
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsAddReviewOpen(!isAddReviewOpen)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{isAddReviewOpen ? 'Close Form' : '+ Add review'}</span>
                          </button>
                        </div>

                        {/* Top: Write Customer Review Form (When open) */}
                        {isAddReviewOpen && (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-fadeIn">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                              <h5 className="text-sm font-bold text-slate-900">Write customer review</h5>
                              
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500">Select Rating:</span>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() => setNewReviewRating(star)}
                                      className="p-0.5 cursor-pointer hover:scale-110 transition-transform"
                                    >
                                      <Star
                                        className={`w-4 h-4 ${
                                          star <= newReviewRating
                                            ? 'fill-amber-400 text-amber-400'
                                            : 'text-slate-300'
                                        }`}
                                      />
                                    </button>
                                  ))}
                                  <span className="text-xs font-black text-slate-800 ml-1">{newReviewRating} ★</span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                  Reviewer Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder="Enter reviewer name (e.g. John D.)"
                                  value={newReviewName}
                                  onChange={(e) => setNewReviewName(e.target.value)}
                                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                  Review Comment <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                  rows={3}
                                  placeholder="Write detailed customer feedback..."
                                  value={newReviewComment}
                                  onChange={(e) => setNewReviewComment(e.target.value)}
                                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                                />
                              </div>

                              {/* Quick Starter Templates */}
                              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                                <span className="text-[11px] font-bold text-slate-400">Quick Starters:</span>
                                {[
                                  'Highly recommended! Top quality.',
                                  'Fast shipping and pristine condition.',
                                  'Great value for money, will order again!'
                                ].map((t, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setNewReviewComment(prev => prev ? `${prev} ${t}` : t)}
                                    className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 rounded-lg text-[11px] text-slate-600 transition-colors cursor-pointer"
                                  >
                                    + {t}
                                  </button>
                                ))}
                              </div>

                              {/* Review Photo Upload */}
                              <div>
                                <label
                                  className="border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-white rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors"
                                >
                                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                                  <span className="text-xs text-slate-600 font-medium">
                                    {isReviewUploadingImage ? 'Uploading image...' : 'Drag files here or browse photos'}
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      setIsReviewUploadingImage(true);
                                      try {
                                        const comp = await compressImage(file, 800, 0.8, 500000);
                                        if (comp) {
                                          try {
                                            const url = await uploadDataUrlToStorage(comp, `ecom-reviews/rev-${Date.now()}`);
                                            setNewReviewImages(prev => [...prev, url]);
                                          } catch {
                                            setNewReviewImages(prev => [...prev, comp]);
                                          }
                                        }
                                      } finally {
                                        setIsReviewUploadingImage(false);
                                      }
                                    }}
                                    className="hidden"
                                  />
                                </label>

                                {newReviewImages.length > 0 && (
                                  <div className="flex items-center gap-2 mt-2">
                                    {newReviewImages.map((img, i) => (
                                      <div key={i} className="relative w-12 h-12 rounded-lg border border-slate-200 overflow-hidden">
                                        <img src={img} alt="review" className="w-full h-full object-cover" />
                                        <button
                                          type="button"
                                          onClick={() => setNewReviewImages(prev => prev.filter((_, idx) => idx !== i))}
                                          className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 cursor-pointer"
                                        >
                                          <X className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setIsAddReviewOpen(false)}
                                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={isSubmittingReview}
                                  onClick={handleSaveNewReview}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {isSubmittingReview ? 'Saving...' : 'Save review'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Main Grid: Left = Reviews Feed & Filter, Right = Rating Distribution Breakdown */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                          {/* Left Column (8 cols): Reviews Feed */}
                          <div className="lg:col-span-8 space-y-4">
                            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
                              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                  <span className="text-xs font-bold text-slate-800">
                                    Customer Reviews Feed ({filteredReviews.length})
                                  </span>
                                </div>

                                {/* Filter Tabs */}
                                <div className="inline-flex p-1 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-600">
                                  <button
                                    type="button"
                                    onClick={() => setReviewFilterRating('all')}
                                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                                      reviewFilterRating === 'all' ? 'bg-slate-900 text-white font-bold' : 'hover:text-slate-900'
                                    }`}
                                  >
                                    All Reviews
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setReviewFilterRating('5')}
                                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                                      reviewFilterRating === '5' ? 'bg-slate-900 text-white font-bold' : 'hover:text-slate-900'
                                    }`}
                                  >
                                    5 ★ Only
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setReviewFilterRating('4')}
                                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                                      reviewFilterRating === '4' ? 'bg-slate-900 text-white font-bold' : 'hover:text-slate-900'
                                    }`}
                                  >
                                    4 ★ Only
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setReviewFilterRating('below3')}
                                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                                      reviewFilterRating === 'below3' ? 'bg-slate-900 text-white font-bold' : 'hover:text-slate-900'
                                    }`}
                                  >
                                    3 ★ & Below
                                  </button>
                                </div>
                              </div>

                              {/* Reviews List */}
                              {reviewsLoading ? (
                                <div className="py-12 text-center text-slate-400">
                                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                                  <span>Loading customer reviews...</span>
                                </div>
                              ) : filteredReviews.length === 0 ? (
                                <div className="py-14 text-center space-y-2">
                                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto text-slate-400 shadow-2xs">
                                    <MessageSquare className="w-6 h-6" />
                                  </div>
                                  <h5 className="text-sm font-bold text-slate-800">No customer reviews yet</h5>
                                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                    Be the first to add customer feedback or import product reviews.
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {filteredReviews.map((rev) => (
                                    <div
                                      key={rev.id}
                                      className="bg-white border border-slate-200/80 rounded-xl p-4 space-y-2.5 shadow-2xs"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-xs">
                                            {rev.customerName.slice(0, 2).toUpperCase()}
                                          </div>
                                          <div>
                                            <span className="font-bold text-xs text-slate-900 block leading-tight">
                                              {rev.customerName}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                              {new Date(rev.createdAt).toLocaleDateString()}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                          <div className="flex items-center gap-0.5">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                              <Star
                                                key={s}
                                                className={`w-3.5 h-3.5 ${
                                                  s <= (Number(rev.rating) || 5)
                                                    ? 'fill-amber-400 text-amber-400'
                                                    : 'text-slate-200'
                                                }`}
                                              />
                                            ))}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteReview(rev.id)}
                                            className="text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                                            title="Delete review"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      <p className="text-xs text-slate-700 leading-relaxed font-normal">
                                        {rev.comment}
                                      </p>

                                      {Array.isArray(rev.images) && rev.images.length > 0 && (
                                        <div className="flex items-center gap-2 pt-1">
                                          {rev.images.map((imgUrl, iIdx) => (
                                            <a
                                              key={iIdx}
                                              href={imgUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden block hover:opacity-90 transition-opacity"
                                            >
                                              <img src={imgUrl} alt="Review attachment" className="w-full h-full object-cover" />
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right Column (4 cols): Rating Distribution Breakdown */}
                          <div className="lg:col-span-4">
                            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 space-y-4">
                              <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                                Rating Distribution Breakdown
                              </span>

                              {/* Big rating number */}
                              <div className="space-y-1">
                                <div className="flex items-baseline gap-2">
                                  <span className="text-3xl font-black text-slate-900">{avgRating}</span>
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <Star
                                        key={s}
                                        className={`w-4 h-4 ${
                                          s <= Math.round(Number(avgRating))
                                            ? 'fill-amber-400 text-amber-400'
                                            : 'text-slate-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <span className="text-[11px] text-slate-400 font-medium block">
                                  Based on {totalReviews} customer rating{totalReviews === 1 ? '' : 's'}
                                </span>
                              </div>

                              {/* Bars 5★ down to 1★ */}
                              <div className="space-y-2 pt-2 border-t border-slate-200/60">
                                {[5, 4, 3, 2, 1].map((star) => {
                                  const pct = percentRating(star);
                                  return (
                                    <div key={star} className="flex items-center gap-2.5 text-xs text-slate-600">
                                      <span className="w-5 font-semibold text-slate-700 text-right">{star}★</span>
                                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                          style={{ width: `${pct}%` }}
                                        ></div>
                                      </div>
                                      <span className="w-8 text-[11px] font-medium text-slate-500 text-right">
                                        {pct}%
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })()}

                {/* Bottom Action Footer */}
                <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-2xl shadow-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                    {editingProduct && (
                      <button
                        type="button"
                        onClick={() => setProductToDelete(editingProduct)}
                        className="px-4 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-xs rounded-xl border border-rose-200 transition-colors cursor-pointer"
                      >
                        Delete Product
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
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      {editingProduct ? 'Update Product' : 'Publish Product'}
                    </button>
                  </div>
                </div>

              </form>
            </div>
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
