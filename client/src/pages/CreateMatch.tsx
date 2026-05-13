import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store/store';
import { toast } from 'sonner';
import CreateMatchV2 from '@/components/CreateMatch';
import { DashboardLayout } from '@/components/DashboardLayout';
import { isAdmin } from '@/utils/permissions';

const CreateMatch = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();

  // Guard di pagina: solo admin globali possono creare partite.
  // Anche se i bottoni di accesso sono nascosti altrove, blindiamo
  // la rotta diretta (deep link / URL bar).
  useEffect(() => {
    if (user && !isAdmin(user)) {
      toast.error('Solo gli amministratori possono creare partite.');
      navigate('/history', { replace: true });
    }
  }, [user, navigate]);

  if (!user || !isAdmin(user)) return null;

  return (
    <DashboardLayout>
      <CreateMatchV2 />
    </DashboardLayout>
  );
};

export default CreateMatch;
