const fs = require('fs');

const filePath = './src/components/EcomStorePage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add import if not exists
if (!content.includes('ProductCard')) {
  content = content.replace(
    "import ResponsiveImage from './ResponsiveImage';",
    "import ResponsiveImage from './ResponsiveImage';\nimport { ProductCard } from './ui/ProductCard';"
  );
}

const targetBlock = `{filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-md border border-slate-200/90 shadow-2xs hover:border-teal-500 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between overflow-hidden group relative"
                >
                  {/* Discount Tag */}
                  {product.regularPrice && product.regularPrice > product.price && (
                    <span className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-sm z-10">
                      {Math.round(((product.regularPrice - product.price) / product.regularPrice) * 100)}% off
                    </span>
                  )}

                  {/* Wishlist Heart button */}
                  <button
                    onClick={(e) => toggleWishlist(product.id, e)}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-full shadow-xs transition-colors z-10 cursor-pointer"
                    title="পছন্দের তালিকায় রাখুন"
                  >
                    <Heart className={\`h-4 w-4 \${wishlist.includes(product.id) ? 'fill-rose-600 text-rose-600' : ''}\`} />
                  </button>

                  {/* Product Image Full Fit on Card */}
                  <div 
                    onClick={() => openProductDetail(product)}
                    className="relative h-52 sm:h-60 w-full bg-slate-100 overflow-hidden flex items-center justify-center cursor-pointer rounded-t-md"
                  >
                    <img
                      src={product.image}
                      alt={product.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* PDF Read Overlay Button if PDF URL exists */}
                    {product.samplePdfUrl && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (product.samplePdfUrl && !pdfLoadedUrlsRef.current.has(product.samplePdfUrl)) setIsPdfLoading(true);
                          setPdfModalProduct(product);
                        }}
                        className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-900/90 hover:bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-lg flex items-center gap-1 backdrop-blur-xs transition-all hover:scale-105 cursor-pointer whitespace-nowrap"
                      >
                        <FileText className="h-3 w-3 text-emerald-400" />
                        <span>পিডিএফ পড়ে দেখুন</span>
                      </button>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                    <div 
                      onClick={() => openProductDetail(product)}
                      className="space-y-1 cursor-pointer"
                    >
                      <h3 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug group-hover:text-rose-600 transition-colors line-clamp-2">
                        {product.title}
                      </h3>
                      {product.authorName && (
                        <p className="text-[11px] text-teal-700 font-bold truncate">
                          লেখক: {product.authorName}
                        </p>
                      )}


                    </div>

                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-sm sm:text-base font-extrabold text-rose-600">
                          ৳{product.price.toLocaleString('bn-BD')}
                        </span>
                        {product.regularPrice && product.regularPrice > product.price && (
                          <span className="text-[11px] text-slate-400 line-through font-medium">
                            ৳{product.regularPrice.toLocaleString('bn-BD')}
                          </span>
                        )}
                      </div>

                      {/* Action Row: Cart Icon & Primary Brand Color "এখনই কিনুন" */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAddToCart(product, 1)}
                          title="কার্টে রাখুন"
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-md transition-colors cursor-pointer shrink-0"
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleBuyNow(product)}
                          className="flex-1 py-1.5 px-2 text-white font-bold rounded-md text-[11px] transition-all cursor-pointer text-center"
                          style={{ backgroundColor: primaryColor }}
                        >
                          এখনই কিনুন
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}`;

const replacement = `{filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isWishlisted={wishlist.includes(product.id)}
                  primaryColor={primaryColor}
                  onToggleWishlist={toggleWishlist}
                  onOpenDetail={openProductDetail}
                  onOpenPdf={(p) => {
                    if (p.samplePdfUrl && !pdfLoadedUrlsRef.current.has(p.samplePdfUrl)) setIsPdfLoading(true);
                    setPdfModalProduct(p);
                  }}
                  onAddToCart={handleAddToCart}
                  onBuyNow={handleBuyNow}
                />
              ))}`;

if (content.includes(targetBlock)) {
  content = content.replace(targetBlock, replacement);
  fs.writeFileSync(filePath, content);
  console.log('Replaced successfully');
} else {
  console.log('Target block not found');
}
