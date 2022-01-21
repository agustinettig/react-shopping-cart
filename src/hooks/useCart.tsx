import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storedCart = localStorage.getItem('@RocketShoes:cart');

    if (storedCart) {
      return JSON.parse(storedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {    
    try {
      const productAreadyInCart = getProductFromCart(productId);

      if (productAreadyInCart) {
        updateProductAmount({ 
          productId, 
          amount: productAreadyInCart.amount + 1
        });
        return;
      }
      const product = await findProduct(productId);

      if(await isProductInStock(productId, 1)) {
        const newCart = [...cart, {
          ...product,
          amount: 1
        }];
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      }      
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const productExistsInCart = getProductFromCart(productId);
      if (!productExistsInCart) {
        throw new Error();
      }
      const newCart = cart.filter(product => product.id !== productId);
      setCart([...newCart]);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };
  
  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        return;
      }

      const productExistsInCart = getProductFromCart(productId);

      if (!productExistsInCart) {
        throw new Error();
      }

      if(await isProductInStock(productId, amount)) {        
        const newCart = [...cart];
        newCart.forEach(product => {
          if (productId === product.id) {
            product.amount = amount;
          }
        });
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  const isProductInStock = async (productId: number, amount: number) : Promise<boolean> => {
    try {
      const response = await api.get(`stock/${productId}`);
      if (response.data.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return false;
      }
      return true;
    } catch {
      toast.error('Quantidade solicitada fora de estoque');
      return false;
    }
  }

  const findProduct = async (productId: number) : Promise<Product> => {
    const response = await api.get(`products/${productId}`);
    return response.data;
  }

  const getProductFromCart = (productId: number) => {
    return cart.find(product => product.id === productId);
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
