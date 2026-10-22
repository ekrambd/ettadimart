import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProductCard } from '../components/ui/ProductCard';

const mockProduct = {
  id: '123',
  title: 'Casio Vintage Digital',
  brand: 'Casio',
  price: 500,
  regularPrice: 600,
  image: 'test-image.jpg',
  category: 'Watches',
  stock: 10
};

describe('ProductCard Component', () => {
  it('renders product details correctly', () => {
    render(
      <ProductCard 
        product={mockProduct as any}
        isWishlisted={false}
        onToggleWishlist={vi.fn()}
        onOpenDetail={vi.fn()}
        onAddToCart={vi.fn()}
        onBuyNow={vi.fn()}
      />
    );
    
    expect(screen.getByText('Casio Vintage Digital')).toBeInTheDocument();
    expect(screen.getByText('Casio')).toBeInTheDocument();
    expect(screen.getByText(/500/)).toBeInTheDocument();
    expect(screen.getByText(/600/)).toBeInTheDocument();
  });

  it('triggers callbacks on user interaction', () => {
    const handleAddToCart = vi.fn();
    const handleOpenDetail = vi.fn();
    
    render(
      <ProductCard 
        product={mockProduct as any}
        isWishlisted={false}
        onToggleWishlist={vi.fn()}
        onOpenDetail={handleOpenDetail}
        onAddToCart={handleAddToCart}
      />
    );
    
    fireEvent.click(screen.getByText('Add To Cart'));
    expect(handleAddToCart).toHaveBeenCalledWith(mockProduct, 1);

    fireEvent.click(screen.getByText('Casio Vintage Digital'));
    expect(handleOpenDetail).toHaveBeenCalledWith(mockProduct);
  });
});
