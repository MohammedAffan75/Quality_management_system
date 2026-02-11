import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import ProjectCreation from './components/ProjectCreation';
import Assembly from './pages/Assembly';
import InspectionPlan from './pages/InspectionPlan';
import { createContext, useState, useEffect, useContext } from 'react';
import { ProjectProvider } from './context/ProjectContext';
import './App.css';

export const NavContext = createContext();

function App() {
  const [activeNav, setActiveNav] = useState('projects');
  
  return (
    <NavContext.Provider value={{ activeNav, setActiveNav }}>
      <ProjectProvider>
        <Router>
          <Routes>
            <Route path="/" element={
              <NavHandler>
                <ProjectCreation />
              </NavHandler>
            } />
            <Route path="/Assembly" element={
              <NavHandler>
                <Assembly />
              </NavHandler>
            } />
            <Route path="/inspection-plan" element={
              <NavHandler>
                <InspectionPlan />
              </NavHandler>
            } />
          </Routes>
        </Router>
      </ProjectProvider>
    </NavContext.Provider>
  );
}

// Helper component to handle navigation state based on route
function NavHandler({ children }) {
  const location = useLocation();
  const { setActiveNav } = useContext(NavContext);

  useEffect(() => {
    // Update activeNav based on the current route
    if (location.pathname === '/Assembly') {
      setActiveNav('assembly');
    } else {
      setActiveNav('projects');
    }
  }, [location, setActiveNav]);

  return children;
}

export default App;