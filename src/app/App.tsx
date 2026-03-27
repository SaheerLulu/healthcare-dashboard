import { RouterProvider } from 'react-router';
import { FilterProvider } from './context/FilterContext';
import { router } from './routes';

export default function App() {
  return (
    <FilterProvider>
      <RouterProvider router={router} />
    </FilterProvider>
  );
}
