/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AutomationsControl from './pages/AutomationsControl';
import Careers from './pages/Careers';
import ClientManagement from './pages/ClientManagement';
import Contact from './pages/Contact';
import EmployeeDashboard from './pages/EmployeeDashboard';
import Gallery from './pages/Gallery';
import Home from './pages/Home';
import PrivacyPolicy from './pages/PrivacyPolicy';
import SatisfactionSurvey from './pages/SatisfactionSurvey';
import Services from './pages/Services';
import Sitemap from './pages/Sitemap';
import Welcome from './pages/Welcome';
import WhatsAppSetup from './pages/WhatsAppSetup';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AutomationsControl": AutomationsControl,
    "Careers": Careers,
    "ClientManagement": ClientManagement,
    "Contact": Contact,
    "EmployeeDashboard": EmployeeDashboard,
    "Gallery": Gallery,
    "Home": Home,
    "PrivacyPolicy": PrivacyPolicy,
    "SatisfactionSurvey": SatisfactionSurvey,
    "Services": Services,
    "Sitemap": Sitemap,
    "Welcome": Welcome,
    "WhatsAppSetup": WhatsAppSetup,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};