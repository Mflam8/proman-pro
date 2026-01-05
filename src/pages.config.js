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