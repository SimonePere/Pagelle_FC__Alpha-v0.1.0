// Hook Redux semplificati - solo l'essenziale
import { AppDispatch, RootState } from '@/redux/store/store';
import { useDispatch, useSelector } from 'react-redux';

// Hook base tipizzati
export const useAppSelector = <T>(selector: (state: RootState) => T): T => 
  useSelector(selector);

export const useAppDispatch = () => useDispatch<AppDispatch>();

// Tutto qui! Nei componenti usare direttamente useSelector e useDispatch