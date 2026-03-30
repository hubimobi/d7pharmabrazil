import { useState, useEffect } from "react";

const SAVED_CUSTOMER_KEY = "d7pharma_saved_customer";

export interface SavedCustomerData {
  name: string;
  cpf: string;
  email: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

export function useSavedCustomer() {
  const [data, setData] = useState<SavedCustomerData | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SAVED_CUSTOMER_KEY);
      if (stored) setData(JSON.parse(stored));
    } catch {}
  }, []);

  const save = (customerData: SavedCustomerData) => {
    try {
      localStorage.setItem(SAVED_CUSTOMER_KEY, JSON.stringify(customerData));
      setData(customerData);
    } catch {}
  };

  const clear = () => {
    localStorage.removeItem(SAVED_CUSTOMER_KEY);
    setData(null);
  };

  const hasSavedData = !!data && !!data.name && !!data.email && !!data.cpf;

  return { savedCustomer: data, saveCustomer: save, clearCustomer: clear, hasSavedData };
}
