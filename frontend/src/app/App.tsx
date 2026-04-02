import { RouterProvider } from 'react-router';
import { router } from './routes';
import { FilterProvider } from './contexts/FilterContext';
import { CrossFilterProvider } from './contexts/CrossFilterContext';

function App() {
  return (
    <FilterProvider>
      <CrossFilterProvider>
        <RouterProvider router={router} />
      </CrossFilterProvider>
    </FilterProvider>
  );
}

export default App;
